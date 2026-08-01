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

type DecorCompositorSettings = {
  resolutionScale: number;
  blurScale: number;
};

function makeTarget(width: number, height: number) {
  const target = new WebGLRenderTarget(width, height, {
    type: UnsignedByteType, // Additive blending into float buffer may not be supported
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
 * Far-to-near blur accumulation over the three depth groups (16px-ish, 8px-ish, 4px-ish). 
 * The nearest group is not part of this pipeline to stay crisp
 * while the blurred stack runs at the configured reduced resolution.
 */
export class DecorStreamCompositor {
  readonly texture;
  private readonly meshes: Mesh[];
  private readonly scenes: Scene[];
  private readonly targetA: WebGLRenderTarget;
  private readonly targetB: WebGLRenderTarget;
  private readonly blurs: KawaseBlurPass[];
  private readonly previousClearColor = new Color();
  private readonly previousViewport = new Vector4();
  private readonly previousScissor = new Vector4();
  private initialized = false;
  private width: number;
  private height: number;
  private readonly resolutionScale: number;

  constructor(
    meshes: Mesh[],
    width: number,
    height: number,
    settings: DecorCompositorSettings,
  ) {
    this.resolutionScale = settings.resolutionScale;
    this.width = Math.max(1, Math.round(width * this.resolutionScale));
    this.height = Math.max(1, Math.round(height * this.resolutionScale));
    this.meshes = meshes;
    this.scenes = meshes.map((mesh) => {
      const scene = new Scene();
      scene.add(mesh);
      return scene;
    });
    this.targetA = makeTarget(this.width, this.height);
    this.targetB = makeTarget(this.width, this.height);
    this.texture = this.targetB.texture;

    this.blurs = [0.25, 0.5, 1].map((resolutionScale) => {
      const pass = new KawaseBlurPass({
        kernelSize: KernelSize.VERY_SMALL,
        resolutionScale,
      });
      pass.scale = settings.blurScale;
      return pass;
    });
  }

  setSize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.round(width * this.resolutionScale));
    const nextHeight = Math.max(1, Math.round(height * this.resolutionScale));
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
    renderer.getClearColor(this.previousClearColor);
    renderer.getViewport(this.previousViewport);
    renderer.getScissor(this.previousScissor);
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

    renderer.setRenderTarget(previousTarget);
    renderer.setViewport(this.previousViewport);
    renderer.setScissor(this.previousScissor);
    renderer.setScissorTest(previousScissorTest);
    renderer.setClearColor(this.previousClearColor, previousAlpha);
    renderer.autoClear = previousAutoClear;
  }

  dispose() {
    this.targetA.dispose();
    this.targetB.dispose();
    this.blurs.forEach((blur) => blur.dispose());
  }
}
