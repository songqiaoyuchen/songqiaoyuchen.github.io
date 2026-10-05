import {
  HalfFloatType, LinearFilter, Vector2, WebGLRenderTarget,
  type Texture, type WebGLRenderer,
} from 'three';
import {ART_CURSOR_CONFIG} from '@/config/scene/artCursor';
import {artCursorSettings} from './artCursorSettings';
import {ScreenPass, screenMaterial} from './screenPass';
import type {CursorStroke} from './cursorTouch';

const config = ART_CURSOR_CONFIG.oil;

// rg is how far, in CSS pixels, the painting shown at each point has been
// dragged from its place. The brush sweeps the segment travelled since the
// previous frame and pulls what lay behind it forward, so colours are only
// moved, never mixed. The offsets shrink so the painting settles back.
const smudgeShader = /* glsl */ `
  uniform sampler2D uSmudge;
  uniform vec2 uSize;
  uniform vec2 uFrom;
  uniform vec2 uTo;
  uniform float uStrength;
  uniform float uHeal;
  uniform float uRadius;
  uniform float uMaxPush;
  varying vec2 vUv;

  void main() {
    vec2 push = texture2D(uSmudge, vUv).rg * uHeal;
    vec2 p = vUv * uSize;
    vec2 ab = uTo - uFrom;
    vec2 d = p - uFrom - ab * clamp(dot(p - uFrom, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    float amount = uStrength * exp(-dot(d, d) / (uRadius * uRadius));
    if (amount > .002) {
      vec2 dragged = texture2D(uSmudge, vUv - ab / uSize).rg * uHeal - ab;
      push = mix(push, dragged, amount);
      push *= min(1.0, uMaxPush / max(length(push), 1e-4));
    }
    gl_FragColor = vec4(push, 0.0, 1.0);
  }
`;

function createTarget(width: number, height: number) {
  return new WebGLRenderTarget(Math.round(width / config.cell), Math.round(height / config.cell), {
    type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false,
  });
}

/**
 * Screen-space smudge of the oil illustration: a field of offsets the cursor
 * drags along its stroke. Allocated texture memory starts at zero, so a fresh
 * field moves nothing. It stops updating once the painting has settled.
 */
export class CursorSmudge {
  private readonly pass = new ScreenPass();
  private readonly material = screenMaterial(smudgeShader, {
    uSmudge: {value: null}, uSize: {value: new Vector2()}, uFrom: {value: new Vector2()},
    uTo: {value: new Vector2()}, uStrength: {value: 0}, uHeal: {value: 1},
    uRadius: {value: config.radius}, uMaxPush: {value: config.maxPush},
  });
  private field: {read: WebGLRenderTarget; write: WebGLRenderTarget} | null = null;
  private readonly size = new Vector2();
  private idle = Infinity;

  get texture(): Texture | null {
    return this.field?.read.texture ?? null;
  }

  update(renderer: WebGLRenderer, delta: number, width: number, height: number, stroke: CursorStroke | null) {
    if (!width || !height) return;
    if (this.size.x !== width || this.size.y !== height) this.clear();
    const healSeconds = artCursorSettings.smudgeHealSeconds;
    this.idle = stroke ? 0 : this.idle + delta;
    // Every offset has shrunk below a pixel by now.
    if (this.idle > healSeconds * 6) {
      this.clear();
      return;
    }
    this.size.set(width, height);
    this.field ??= {read: createTarget(width, height), write: createTarget(width, height)};
    const field = this.field;
    const uniforms = this.material.uniforms;
    uniforms.uSmudge.value = field.read.texture;
    uniforms.uSize.value.set(width, height);
    uniforms.uHeal.value = Math.exp(-delta / healSeconds);
    uniforms.uStrength.value = stroke ? stroke.strength * artCursorSettings.smudgeDrag : 0;
    if (stroke) {
      uniforms.uFrom.value.copy(stroke.from);
      uniforms.uTo.value.copy(stroke.to);
    }
    this.pass.render(renderer, this.material, field.write);
    [field.read, field.write] = [field.write, field.read];
  }

  clear() {
    this.field?.read.dispose();
    this.field?.write.dispose();
    this.field = null;
    this.idle = Infinity;
  }

  dispose() {
    this.clear();
    this.pass.dispose();
    this.material.dispose();
  }
}
