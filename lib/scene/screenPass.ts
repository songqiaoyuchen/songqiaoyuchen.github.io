import {
  Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial,
  type IUniform, type WebGLRenderTarget, type WebGLRenderer,
} from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export function screenMaterial(fragmentShader: string, uniforms: Record<string, IUniform>) {
  return new ShaderMaterial({
    vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false,
  });
}

/** Draws one full-target quad into an offscreen target, restoring the previous target. */
export class ScreenPass {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad = new Mesh(new PlaneGeometry(2, 2));

  constructor() {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  render(renderer: WebGLRenderer, material: ShaderMaterial, target: WebGLRenderTarget) {
    const previousTarget = renderer.getRenderTarget();
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previousTarget);
  }

  dispose() {
    this.quad.geometry.dispose();
  }
}
