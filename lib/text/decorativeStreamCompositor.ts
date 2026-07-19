import { KawaseBlurPass, KernelSize } from 'postprocessing';
import {
  Color,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  Vector4,
  WebGLRenderTarget,
  type Camera,
  type Mesh,
  type WebGLRenderer,
} from 'three';

const CLEAR = new Color(0x000000);

function makeTarget(width: number, height: number) {
  const target = new WebGLRenderTarget(width, height, {
    // Additive blending into floating-point targets requires EXT_float_blend,
    // which is not guaranteed even on WebGL2. The reference effect does not
    // need HDR storage here; its glow comes from staged blur accumulation.
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

/** Lusion-style far-to-near accumulation: 16px-ish, 8px-ish, 4px-ish, sharp. */
export class DecorativeStreamCompositor {
  readonly texture;
  private readonly meshes: Mesh[];
  private readonly scenes: Scene[];
  private readonly targetA: WebGLRenderTarget;
  private readonly targetB: WebGLRenderTarget;
  private readonly blurs: KawaseBlurPass[];
  private initialized = false;
  private width: number;
  private height: number;

  constructor(meshes: Mesh[], width: number, height: number) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.meshes = meshes;
    this.scenes = meshes.map((mesh) => {
      const scene = new Scene();
      scene.add(mesh);
      return scene;
    });
    this.targetA = makeTarget(this.width, this.height);
    this.targetB = makeTarget(this.width, this.height);
    this.texture = this.targetB.texture;

    // 35/15/7-tap Kawase kernels correspond closely to the reference's
    // approximately 16/8/4 pixel blur stages.
    this.blurs = [KernelSize.LARGE, KernelSize.SMALL, KernelSize.VERY_SMALL]
      .map((kernelSize) => new KawaseBlurPass({ kernelSize, resolutionScale: 1 }));
    this.setSize(this.width, this.height);
  }

  setSize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.width && nextHeight === this.height) return;
    this.width = nextWidth;
    this.height = nextHeight;
    this.targetA.setSize(nextWidth, nextHeight);
    this.targetB.setSize(nextWidth, nextHeight);
    this.blurs.forEach((blur) => blur.setSize(nextWidth, nextHeight));
  }

  render(renderer: WebGLRenderer, camera: Camera, delta: number) {
    // Scene.add() reparents: a mesh belongs to exactly one scene, and another
    // compositor built from the same meshes (React StrictMode double-invokes
    // the useMemo that constructs compositors, then discards one result)
    // silently steals them. Only the rendered compositor can claim them here.
    this.meshes.forEach((mesh, index) => {
      if (mesh.parent !== this.scenes[index]) this.scenes[index].add(mesh);
    });

    if (!this.initialized) {
      this.blurs.forEach((blur) => blur.initialize(renderer, true, UnsignedByteType));
      this.blurs.forEach((blur) => blur.setSize(this.width, this.height));
      this.initialized = true;
    }

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousAlpha = renderer.getClearAlpha();
    const previousColor = renderer.getClearColor(new Color()).clone();
    const previousViewport = renderer.getViewport(new Vector4()).clone();
    const previousScissor = renderer.getScissor(new Vector4()).clone();
    const previousScissorTest = renderer.getScissorTest();

    renderer.autoClear = false;
    renderer.setClearColor(CLEAR, 0);
    renderer.setScissorTest(false);
    renderer.setRenderTarget(this.targetA);
    renderer.clear(true, false, false);
    renderer.render(this.scenes[0], camera);

    this.blurs[0].render(renderer, this.targetA, this.targetB, delta, false);
    renderer.setRenderTarget(this.targetB);
    renderer.render(this.scenes[1], camera);

    this.blurs[1].render(renderer, this.targetB, this.targetA, delta, false);
    renderer.setRenderTarget(this.targetA);
    renderer.render(this.scenes[2], camera);

    this.blurs[2].render(renderer, this.targetA, this.targetB, delta, false);
    renderer.setRenderTarget(this.targetB);
    renderer.render(this.scenes[3], camera);

    renderer.setRenderTarget(previousTarget);
    renderer.setViewport(previousViewport);
    renderer.setScissor(previousScissor);
    renderer.setScissorTest(previousScissorTest);
    renderer.setClearColor(previousColor, previousAlpha);
    renderer.autoClear = previousAutoClear;
  }

  dispose() {
    this.targetA.dispose();
    this.targetB.dispose();
    this.blurs.forEach((blur) => blur.dispose());
  }
}
