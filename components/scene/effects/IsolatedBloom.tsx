// Bloom that renders only the selected meshes (contours, scene links) on their own layer.
'use client';

import {useThree} from '@react-three/fiber';
import {useEffect, useLayoutEffect, useMemo} from 'react';
import {BlendFunction, BloomEffect} from 'postprocessing';
import {
  Color,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type Scene,
  type TextureDataType,
  type WebGLRenderer,
} from 'three';
import {isDissolved} from '@/lib/scene/textTransition';

const BLOOM_LAYER = 10;
const CLEAR_COLOR = new Color(0x000000);

/** Whether an object reaches the screen: it and its parents are visible and it is not fully dissolved. */
function isDrawn(object: Object3D) {
  for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return !isDissolved(object);
}

type IsolatedBloomEffectOptions = {
  intensity: number;
  luminanceSmoothing: number;
  luminanceThreshold: number;
  resolutionScale: number;
};

class IsolatedBloomEffect extends BloomEffect {
  private readonly camera: Camera;
  private readonly scene: Scene;
  private readonly selectionTarget: WebGLRenderTarget;
  private readonly resolutionScale: number;
  private readonly savedClearColor = new Color();
  // Objects on the bloom layer; while none is drawn the bloom stays black and its passes are skipped.
  private selection: Object3D[] = [];
  private idle = false;

  constructor(
    scene: Scene,
    camera: Camera,
    resolutionScale: number,
  ) {
    super({
      blendFunction: BlendFunction.ADD,
      intensity: 1,
      levels: 8,
      luminanceSmoothing: 0.03,
      luminanceThreshold: 1,
      mipmapBlur: true,
      radius: 0.85,
      resolutionScale: 1,
    });
    this.scene = scene;
    this.camera = camera;
    this.resolutionScale = resolutionScale;
    this.selectionTarget = new WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.selectionTarget.texture.generateMipmaps = false;
    this.selectionTarget.texture.name = 'IsolatedBloom.Selection';
  }

  setSelection(selection: Object3D[]) {
    this.selection = selection;
    this.idle = false;
  }

  get luminanceThreshold() {
    return this.luminanceMaterial.threshold;
  }

  set luminanceThreshold(value: number) {
    this.luminanceMaterial.threshold = value;
  }

  get luminanceSmoothing() {
    return this.luminanceMaterial.smoothing;
  }

  set luminanceSmoothing(value: number) {
    this.luminanceMaterial.smoothing = value;
  }

  override update(
    renderer: WebGLRenderer,
    _inputBuffer: WebGLRenderTarget,
    deltaTime?: number,
  ) {
    // Render one pass after the selection disappears (leaving the bloom black), then skip until it returns.
    const drawn = this.selection.some(isDrawn);
    if (!drawn && this.idle) return;
    this.idle = !drawn;

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousClearAlpha = renderer.getClearAlpha();
    const previousBackground = this.scene.background;
    const previousCameraLayerMask = this.camera.layers.mask;
    renderer.getClearColor(this.savedClearColor);

    try {
      this.scene.background = null;
      this.camera.layers.set(BLOOM_LAYER);
      renderer.autoClear = false;
      renderer.setClearColor(CLEAR_COLOR, 0);
      renderer.setRenderTarget(this.selectionTarget);
      renderer.clear(true, true, false);
      renderer.render(this.scene, this.camera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(this.savedClearColor, previousClearAlpha);
      renderer.autoClear = previousAutoClear;
      this.camera.layers.mask = previousCameraLayerMask;
      this.scene.background = previousBackground;
    }

    super.update(renderer, this.selectionTarget, deltaTime);
  }

  override setSize(width: number, height: number) {
    const scaledWidth = Math.max(1, Math.round(width * this.resolutionScale));
    const scaledHeight = Math.max(1, Math.round(height * this.resolutionScale));
    this.selectionTarget.setSize(scaledWidth, scaledHeight);
    super.setSize(scaledWidth, scaledHeight);
    this.idle = false;
  }

  override initialize(
    renderer: WebGLRenderer,
    alpha: boolean,
    frameBufferType: number,
  ) {
    super.initialize(renderer, alpha, frameBufferType);
    if (frameBufferType !== undefined) {
      this.selectionTarget.texture.type = frameBufferType as TextureDataType;
      if (renderer.outputColorSpace === SRGBColorSpace) {
        this.selectionTarget.texture.colorSpace = SRGBColorSpace;
      }
    }
  }

}

type IsolatedBloomProps = IsolatedBloomEffectOptions & {
  onReady?: () => void;
  selection: Object3D[];
};

/**
 * Blooms only the supplied objects without rendering or depth-masking the
 * entire scene. The isolated render and all bloom mip levels use the requested
 * resolution scale.
 */
export function IsolatedBloom({
  intensity,
  luminanceSmoothing,
  luminanceThreshold,
  onReady,
  resolutionScale,
  selection,
}: IsolatedBloomProps) {
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const effect = useMemo(
    () => new IsolatedBloomEffect(scene, camera, resolutionScale),
    [camera, resolutionScale, scene],
  );

  useLayoutEffect(() => {
    const originalLayerMasks = selection.map((object) => [object, object.layers.mask] as const);
    for (const object of selection) object.layers.enable(BLOOM_LAYER);
    effect.setSelection(selection);
    onReady?.();

    return () => {
      for (const [object, layerMask] of originalLayerMasks) {
        object.layers.mask = layerMask;
      }
    };
  }, [effect, onReady, selection]);

  useEffect(() => () => effect.dispose(), [effect]);

  return (
    <primitive
      object={effect}
      dispose={null}
      intensity={intensity}
      luminanceSmoothing={luminanceSmoothing}
      luminanceThreshold={luminanceThreshold}
    />
  );
}
