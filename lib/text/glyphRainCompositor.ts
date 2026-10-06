// Glyph rain compositor: renders each depth layer offscreen, blurs the rear ones and adds them up.
import {
  AddEquation,
  Color,
  CustomBlending,
  LinearFilter,
  Mesh,
  NoBlending,
  NoColorSpace,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type Camera,
  type WebGLRenderer,
} from 'three';

const CLEAR = new Color(0x000000);

const FULLSCREEN_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// The same normalized nine-tap kernel used by Lusion's AboutHeroLetters pass.
const BLUR_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uDelta;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv) * 0.1633;
  vec2 delta = uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.1531;
  color += texture2D(uTexture, vUv + delta) * 0.1531;
  delta += uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.12245;
  color += texture2D(uTexture, vUv + delta) * 0.12245;
  delta += uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.0918;
  color += texture2D(uTexture, vUv + delta) * 0.0918;
  delta += uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.051;
  color += texture2D(uTexture, vUv + delta) * 0.051;
  gl_FragColor = color;
}
`;

const COPY_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;

type GlyphRainCompositorSettings = {
  blurResolutionScale: number;
  blurRadii: readonly number[];
};

function makeTarget(width: number, height: number) {
  const target = new WebGLRenderTarget(width, height, {
    type: UnsignedByteType,
    format: RGBAFormat,
    depthBuffer: false,
    stencilBuffer: false,
  });
  target.texture.colorSpace = NoColorSpace;
  target.texture.minFilter = LinearFilter;
  target.texture.magFilter = LinearFilter;
  target.texture.generateMipmaps = false;
  return target;
}

/**
 * Renders each depth group in isolation, gives the three rear groups exactly
 * one 8/4/2 px blur, then adds all four layers into a full-resolution target.
 * This keeps Lusion's depth hierarchy without repeatedly blurring pixels that
 * were already accumulated by an earlier group.
 */
export class GlyphRainCompositor {
  readonly texture;
  private readonly meshes: Mesh[];
  private readonly scenes: Scene[];
  private readonly accumulationTarget: WebGLRenderTarget;
  private readonly layerTarget: WebGLRenderTarget;
  private readonly blurTarget: WebGLRenderTarget;
  private readonly fullscreenScene = new Scene();
  private readonly fullscreenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly fullscreenGeometry = new PlaneGeometry(2, 2);
  private readonly blurMaterial: ShaderMaterial;
  private readonly copyMaterial: ShaderMaterial;
  private readonly fullscreenMesh: Mesh;
  private readonly previousClearColor = new Color();
  private readonly previousViewport = new Vector4();
  private readonly previousScissor = new Vector4();
  private width: number;
  private height: number;
  private readonly blurResolutionScale: number;
  private readonly blurRadii: readonly number[];

  constructor(
    meshes: Mesh[],
    width: number,
    height: number,
    settings: GlyphRainCompositorSettings,
  ) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.blurResolutionScale = settings.blurResolutionScale;
    this.blurRadii = settings.blurRadii;
    this.meshes = meshes;
    this.scenes = meshes.map((mesh) => {
      const scene = new Scene();
      scene.add(mesh);
      return scene;
    });

    this.accumulationTarget = makeTarget(this.width, this.height);
    this.layerTarget = makeTarget(this.width, this.height);
    this.blurTarget = makeTarget(
      Math.max(1, Math.ceil(this.width * this.blurResolutionScale)),
      Math.max(1, Math.ceil(this.height * this.blurResolutionScale)),
    );
    this.texture = this.accumulationTarget.texture;

    this.blurMaterial = new ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: BLUR_FRAGMENT_SHADER,
      uniforms: {
        uTexture: { value: this.layerTarget.texture },
        uDelta: { value: new Vector2() },
      },
      depthTest: false,
      depthWrite: false,
      transparent: false,
      blending: NoBlending,
      toneMapped: false,
    });
    this.copyMaterial = new ShaderMaterial({
      vertexShader: FULLSCREEN_VERTEX_SHADER,
      fragmentShader: COPY_FRAGMENT_SHADER,
      uniforms: {
        uTexture: { value: this.layerTarget.texture },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendEquationAlpha: AddEquation,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneFactor,
      toneMapped: false,
    });
    this.fullscreenMesh = new Mesh(this.fullscreenGeometry, this.blurMaterial);
    this.fullscreenMesh.frustumCulled = false;
    this.fullscreenScene.add(this.fullscreenMesh);
  }

  setSize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.width && nextHeight === this.height) return;
    this.width = nextWidth;
    this.height = nextHeight;
    this.accumulationTarget.setSize(nextWidth, nextHeight);
    this.layerTarget.setSize(nextWidth, nextHeight);
    this.blurTarget.setSize(
      Math.max(1, Math.ceil(nextWidth * this.blurResolutionScale)),
      Math.max(1, Math.ceil(nextHeight * this.blurResolutionScale)),
    );
  }

  private renderBlurPass(
    renderer: WebGLRenderer,
    input: WebGLRenderTarget,
    output: WebGLRenderTarget,
    deltaX: number,
    deltaY: number,
  ) {
    this.blurMaterial.uniforms.uTexture.value = input.texture;
    (this.blurMaterial.uniforms.uDelta.value as Vector2).set(deltaX, deltaY);
    this.fullscreenMesh.material = this.blurMaterial;
    renderer.setRenderTarget(output);
    renderer.render(this.fullscreenScene, this.fullscreenCamera);
  }

  private blurLayer(renderer: WebGLRenderer, radius: number) {
    const sampleScale = 0.25;
    this.renderBlurPass(
      renderer,
      this.layerTarget,
      this.blurTarget,
      radius / this.blurTarget.width * sampleScale,
      0,
    );
    this.renderBlurPass(
      renderer,
      this.blurTarget,
      this.layerTarget,
      0,
      radius / this.blurTarget.height * sampleScale,
    );
  }

  private addLayer(renderer: WebGLRenderer) {
    this.copyMaterial.uniforms.uTexture.value = this.layerTarget.texture;
    this.fullscreenMesh.material = this.copyMaterial;
    renderer.setRenderTarget(this.accumulationTarget);
    renderer.render(this.fullscreenScene, this.fullscreenCamera);
  }

  render(renderer: WebGLRenderer, camera: Camera) {
    // Scene.add() reparents. Reclaim meshes here so a discarded StrictMode
    // compositor cannot retain them after React's development double invoke.
    this.meshes.forEach((mesh, index) => {
      if (mesh.parent !== this.scenes[index]) this.scenes[index].add(mesh);
    });

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.previousClearColor);
    renderer.getViewport(this.previousViewport);
    renderer.getScissor(this.previousScissor);
    const previousScissorTest = renderer.getScissorTest();

    renderer.autoClear = false;
    renderer.setClearColor(CLEAR, 0);
    renderer.setScissorTest(false);
    renderer.setRenderTarget(this.accumulationTarget);
    renderer.clear(true, false, false);

    for (let index = 0; index < this.scenes.length; index++) {
      renderer.setRenderTarget(this.layerTarget);
      renderer.clear(true, false, false);
      renderer.render(this.scenes[index], camera);

      const radius = this.blurRadii[index];
      if (radius !== undefined) this.blurLayer(renderer, radius);
      this.addLayer(renderer);
    }

    renderer.setRenderTarget(previousTarget);
    renderer.setViewport(this.previousViewport);
    renderer.setScissor(this.previousScissor);
    renderer.setScissorTest(previousScissorTest);
    renderer.setClearColor(this.previousClearColor, previousAlpha);
    renderer.autoClear = previousAutoClear;
  }

  dispose() {
    this.accumulationTarget.dispose();
    this.layerTarget.dispose();
    this.blurTarget.dispose();
    this.fullscreenGeometry.dispose();
    this.blurMaterial.dispose();
    this.copyMaterial.dispose();
  }
}
