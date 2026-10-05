import {
  HalfFloatType, LinearFilter, Vector2, WebGLRenderTarget,
  type Texture, type WebGLRenderer,
} from 'three';
import {ART_CURSOR_CONFIG} from '@/config/scene/artCursor';
import {artCursorSettings} from './artCursorSettings';
import {ScreenPass, screenMaterial} from './screenPass';

// r is the light left along the cursor's path, fading at a steady rate. The
// newest light sweeps the whole segment travelled since the previous frame.
const touchShader = /* glsl */ `
  uniform sampler2D uTouch;
  uniform vec2 uSize;
  uniform vec2 uFrom;
  uniform vec2 uTo;
  uniform float uStrength;
  uniform float uRadius;
  uniform float uDecay;
  varying vec2 vUv;

  void main() {
    vec4 touch = texture2D(uTouch, vUv);
    touch.r = max(0.0, touch.r - uDecay);
    if (uStrength > 0.0) {
      vec2 p = vUv * uSize;
      vec2 ab = uTo - uFrom;
      vec2 d = p - uFrom - ab * clamp(dot(p - uFrom, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      touch.r = max(touch.r, uStrength * exp(-dot(d, d) / (uRadius * uRadius)));
    }
    gl_FragColor = touch;
  }
`;

function createTarget(width: number, height: number) {
  return new WebGLRenderTarget(Math.ceil(width / ART_CURSOR_CONFIG.cell), Math.ceil(height / ART_CURSOR_CONFIG.cell), {
    type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false,
  });
}

/** A cursor movement in CSS pixels, y up, with the light's strength from 0 to 1. */
export type CursorStroke = {from: Vector2; to: Vector2; strength: number};

/**
 * Coarse full-screen trail of the cursor's light for pencil and Digital.
 * Allocated texture memory starts at zero, so a fresh trail shows nothing. It
 * costs one small pass per frame and stops updating once it has healed.
 */
export class CursorTouch {
  private readonly pass = new ScreenPass();
  private readonly material = screenMaterial(touchShader, {
    uTouch: {value: null},
    uSize: {value: new Vector2()}, uFrom: {value: new Vector2()}, uTo: {value: new Vector2()},
    uStrength: {value: 0}, uRadius: {value: 0}, uDecay: {value: 0},
  });
  private field: {read: WebGLRenderTarget; write: WebGLRenderTarget} | null = null;
  private readonly size = new Vector2();
  // Brightest light the trail can still hold; at zero nothing is left to show.
  private remaining = 0;

  get texture(): Texture | null {
    return this.field && this.remaining > 0 ? this.field.read.texture : null;
  }

  update(renderer: WebGLRenderer, delta: number, width: number, height: number, stroke: CursorStroke | null) {
    if (!width || !height) return;
    if (this.size.x !== width || this.size.y !== height) this.clear();
    if (!stroke && this.remaining <= 0) return;
    this.size.set(width, height);
    this.field ??= {read: createTarget(width, height), write: createTarget(width, height)};
    const field = this.field;
    const decay = delta / artCursorSettings.healSeconds;
    const uniforms = this.material.uniforms;
    uniforms.uTouch.value = field.read.texture;
    uniforms.uSize.value.set(width, height);
    uniforms.uRadius.value = artCursorSettings.touchRadius;
    uniforms.uDecay.value = decay;
    uniforms.uStrength.value = stroke?.strength ?? 0;
    if (stroke) {
      uniforms.uFrom.value.copy(stroke.from);
      uniforms.uTo.value.copy(stroke.to);
    }
    this.pass.render(renderer, this.material, field.write);
    [field.read, field.write] = [field.write, field.read];
    this.remaining = stroke ? 1 : this.remaining - decay;
  }

  clear() {
    this.field?.read.dispose();
    this.field?.write.dispose();
    this.field = null;
    this.remaining = 0;
  }

  dispose() {
    this.clear();
    this.pass.dispose();
    this.material.dispose();
  }
}
