// The intro's cover: a WebGL2 canvas over the scene, in two stages. First the contour map draws out of the mark's
// rings: strokes on a 2D brush canvas at the page's resolution (the mark's rings at once, then one isoline after
// another outward, lib/intro/inkPlan.ts), shown through the output pass as gold lines. Then, the map complete and
// held, every line widens into a band that is see-through to the scene (ink-sim.frag grows the bands a fraction of
// a texel a frame in a ping-ponged half-resolution texture; ink-out.frag composites: black paper, gold lines and
// band edges, open insides) until the bands have met, and the last of the cover fades, the terrain's wave setting
// off with it. Timing: config/scene/intro.ts (Leva's Intro).
'use client';

import {useEffect, useRef} from 'react';
import type {IntroSettings} from '@/config/scene/intro';
import {planFits, planIntroMap, type IntroMapLayout, type IntroMapPlan} from '@/lib/intro/inkPlan';
import inkOutFrag from '@/shaders/intro/ink-out.frag';
import inkSimFrag from '@/shaders/intro/ink-sim.frag';
import inkVert from '@/shaders/intro/ink.vert';

/** A new line's ink comes up over this long. */
const LINE_RAMP_SECONDS = 0.15;
/** The lines open to the scene over this long once the bands start to widen. */
const CLEAR_SECONDS = 0.4;
/** The bands have met once they have widened by this share of the line spacing (the fade takes the rest). */
const MEET_SHARE = 0.75;
const PAPER: [number, number, number] = [10 / 255, 10 / 255, 10 / 255]; // --color-background
const GOLD: [number, number, number] = [232 / 255, 199 / 255, 122 / 255]; // --color-accent
const GLOW_STRENGTH = 0.04; // the preloader's background glow (Preloader.css)

export type IntroInkProps = {
  /** The map laid out for this viewport while the terrain loaded (null if not yet); replanned here if the
   * viewport has changed. */
  getPlan: () => IntroMapPlan | null;
  layout: IntroMapLayout;
  settings: IntroSettings;
  /** The mark's rings are on the cover (the SVG mark may hide). */
  onStart: () => void;
  /** The bands have met and the cover is lifting: the terrain's wave sets off. */
  onLift: () => void;
  /** The cover has lifted entirely. */
  onDone: () => void;
};

let inkSupport: boolean | null = null;

/** Whether this browser can run the cover (WebGL2); without it the preloader fades instead. */
export function canRunIntroInk() {
  if (inkSupport !== null) return inkSupport;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    inkSupport = canvas.getContext('webgl2') !== null;
  } catch {
    inkSupport = false;
  }
  return inkSupport;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Intro cover: no shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Intro cover shader: ${gl.getShaderInfoLog(shader) || 'failed to compile'}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, fragment: string) {
  const program = gl.createProgram();
  if (!program) throw new Error('Intro cover: no program.');
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, inkVert));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Intro cover program: ${gl.getProgramInfoLog(program) ?? 'failed to link'}`);
  }
  return program;
}

function makeTexture(gl: WebGL2RenderingContext) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function strokeSegments(context: CanvasRenderingContext2D, segments: Float32Array) {
  context.beginPath();
  for (let index = 0; index < segments.length; index += 4) {
    context.moveTo(segments[index], segments[index + 1]);
    context.lineTo(segments[index + 2], segments[index + 3]);
  }
  context.stroke();
}

function strokeRing(context: CanvasRenderingContext2D, ring: readonly (readonly [number, number])[]) {
  context.beginPath();
  ring.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.stroke();
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export function IntroInk({getPlan, layout, settings, onStart, onLift, onDone}: IntroInkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read on the animation frame, so a Leva change mid-sequence takes effect without restarting it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const callbacks = useRef({onStart, onLift, onDone});
  callbacks.current = {onStart, onLift, onDone};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const planned = getPlan();
    const plan = planned && planFits(planned, layout) ? planned : planIntroMap(layout);
    const {width, height, simWidth, simHeight} = plan;
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext('webgl2', {alpha: true, antialias: false, premultipliedAlpha: true});
    if (!gl || gl.isContextLost()) {
      callbacks.current.onDone();
      return;
    }

    // The brush: the lines drawn so far (base) plus those still coming up, uploaded whenever they change.
    const base = document.createElement('canvas');
    base.width = width;
    base.height = height;
    const brush = document.createElement('canvas');
    brush.width = width;
    brush.height = height;
    const baseContext = base.getContext('2d');
    const brushContext = brush.getContext('2d');
    if (!baseContext || !brushContext) {
      callbacks.current.onDone();
      return;
    }
    for (const context of [baseContext, brushContext]) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#fff';
      context.lineWidth = Math.max(1, plan.lineWidth);
    }
    baseContext.fillStyle = '#000';
    baseContext.fillRect(0, 0, width, height);
    for (const ring of plan.rings) strokeRing(baseContext, ring);

    let simulation: WebGLProgram;
    let output: WebGLProgram;
    try {
      simulation = linkProgram(gl, inkSimFrag);
      output = linkProgram(gl, inkOutFrag);
    } catch (error) {
      console.error(error);
      callbacks.current.onDone();
      return;
    }
    const uniform = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // The bands, ping-ponged at half resolution.
    const floatBands = gl.getExtension('EXT_color_buffer_float') !== null;
    const bandTextures: WebGLTexture[] = [];
    const framebuffers: WebGLFramebuffer[] = [];
    for (let index = 0; index < 2; index++) {
      const texture = makeTexture(gl);
      if (floatBands) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, simWidth, simHeight, 0, gl.RGBA, gl.HALF_FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simWidth, simHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      bandTextures.push(texture);
      framebuffers.push(framebuffer);
    }
    // The brush, at the page's resolution.
    const brushTexture = makeTexture(gl);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const uploadBrush = () => {
      gl.bindTexture(gl.TEXTURE_2D, brushTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, brush);
    };

    const simUniforms = {
      ink: uniform(simulation, 'uInk'), brush: uniform(simulation, 'uBrush'),
      texel: uniform(simulation, 'uTexel'), grow: uniform(simulation, 'uGrow'),
    };
    const outUniforms = {
      ink: uniform(output, 'uInk'), brush: uniform(output, 'uBrush'), paper: uniform(output, 'uPaper'),
      stain: uniform(output, 'uStain'), glow: uniform(output, 'uGlow'), clear: uniform(output, 'uClear'),
      fade: uniform(output, 'uFade'),
    };
    // Simulation texels per CSS pixel.
    const simScale = plan.scale * simWidth / width;

    let front = 0;
    let drawnLevels = 0;
    let time = 0;
    let lastFrame = 0;
    let frame = 0;
    let started = false;
    let bloomAt = -1;
    let fadeAt = -1;
    let done = false;

    // The brush as of `time`: finished levels on the base, the ones still coming up drawn fainter over it. Returns
    // whether it changed.
    const updateBrush = (now: number, linesPerSecond: number) => {
      const due = Math.min(plan.levels, Math.floor(now * linesPerSecond));
      let changed = false;
      while (drawnLevels < due && now - (drawnLevels + 1) / linesPerSecond >= LINE_RAMP_SECONDS) {
        drawnLevels += 1;
        strokeSegments(baseContext, plan.level(drawnLevels));
        changed = true;
      }
      const ramping = drawnLevels < due;
      if (!changed && !ramping) return false;
      brushContext.globalAlpha = 1;
      brushContext.drawImage(base, 0, 0);
      for (let k = drawnLevels + 1; k <= due; k++) {
        brushContext.globalAlpha = Math.min(1, Math.max(0, (now - k / linesPerSecond) / LINE_RAMP_SECONDS));
        strokeSegments(brushContext, plan.level(k));
      }
      return true;
    };

    const step = (growTexels: number) => {
      gl.useProgram(simulation);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[1 - front]);
      gl.viewport(0, 0, simWidth, simHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bandTextures[front]);
      gl.uniform1i(simUniforms.ink, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, brushTexture);
      gl.uniform1i(simUniforms.brush, 1);
      gl.uniform2f(simUniforms.texel, 1 / simWidth, 1 / simHeight);
      gl.uniform1f(simUniforms.grow, growTexels);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      front = 1 - front;
    };

    const render = (clear: number, fade: number) => {
      gl.useProgram(output);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bandTextures[front]);
      gl.uniform1i(outUniforms.ink, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, brushTexture);
      gl.uniform1i(outUniforms.brush, 1);
      gl.uniform3f(outUniforms.paper, ...PAPER);
      gl.uniform3f(outUniforms.stain, ...GOLD);
      gl.uniform3f(outUniforms.glow, GOLD[0] * GLOW_STRENGTH, GOLD[1] * GLOW_STRENGTH, GOLD[2] * GLOW_STRENGTH);
      gl.uniform1f(outUniforms.clear, clear);
      gl.uniform1f(outUniforms.fade, fade);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = (timestamp: number) => {
      frame = requestAnimationFrame(tick);
      // A stalled tab must not play the sequence in one frame when it wakes.
      const delta = lastFrame === 0 ? 1 / 60 : Math.min(0.1, (timestamp - lastFrame) / 1000);
      lastFrame = timestamp;
      time += delta;
      const {lineSpacing, mapSeconds, mapHold, revealSeconds, fadeSeconds} = settingsRef.current;
      // The map draws over mapSeconds whatever its line count; the bands meet after revealSeconds.
      const linesPerSecond = Math.max(1, plan.levels) / Math.max(mapSeconds, 1e-3);
      const revealSpeed = MEET_SHARE * lineSpacing / Math.max(revealSeconds, 1e-3);
      if (updateBrush(time, linesPerSecond)) uploadBrush();
      // Stage two begins once the whole map has been drawn and held.
      const mapDone = plan.levels / linesPerSecond + LINE_RAMP_SECONDS;
      if (bloomAt < 0 && time >= mapDone + mapHold) bloomAt = time;
      let lifting = false;
      if (bloomAt >= 0) {
        step(revealSpeed * delta * simScale);
        // The bands have met: the last of the cover (beyond the outermost lines) fades.
        if (fadeAt < 0 && time - bloomAt >= revealSeconds) {
          fadeAt = time;
          lifting = true;
        }
      }
      const fade = fadeAt >= 0 ? Math.min(1, (time - fadeAt) / Math.max(fadeSeconds, 1e-3)) : 0;
      render(bloomAt < 0 ? 0 : smoothstep(bloomAt, bloomAt + CLEAR_SECONDS, time), fade);
      if (!started) {
        started = true;
        callbacks.current.onStart();
      }
      if (lifting) callbacks.current.onLift();
      if (!done && fade >= 1) {
        done = true;
        cancelAnimationFrame(frame);
        callbacks.current.onDone();
      }
    };
    brushContext.drawImage(base, 0, 0);
    uploadBrush();
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      for (const texture of bandTextures) gl.deleteTexture(texture);
      for (const framebuffer of framebuffers) gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(brushTexture);
      gl.deleteBuffer(vertices);
      gl.deleteProgram(simulation);
      gl.deleteProgram(output);
      // The context itself is kept: a canvas hands the same one back, lost or not, and development remounts the
      // effect once (StrictMode) before the sequence runs for real.
    };
    // The sequence runs once from mount; its settings are read live through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas aria-hidden="true" className="preloader-ink" ref={canvasRef} />;
}
