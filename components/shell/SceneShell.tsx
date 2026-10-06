// Persistent shell for the Home and Art routes: one WebGL scene, the homepage hero/drawer/preloader,
// and the Art route content layered on top. Kept mounted across Home <-> Art so the canvas survives.
'use client';

import {
  lazy,
  Suspense,
  useState,
  type ReactNode,
} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useCreateStore} from 'leva';
import {useArtScene} from '@/components/art/ArtSceneContext';
import {CapturePanel} from '@/components/art/capture/CapturePanel';
import {Drawer} from '@/components/home/drawer/Drawer';
import {HeroLayer} from '@/components/home/hero/HeroLayer';
import {Preloader} from '@/components/home/preloader/Preloader';
import type {SectionId} from '@/data/sections';
import type {ArticleSummary} from '@/lib/content/types';
import {DevPanels} from './DevPanels';
import {TerrainFallback} from './TerrainFallback';
import {useSceneLoading} from './useSceneLoading';

const SceneCanvas = lazy(() =>
  import('@/components/scene/SceneCanvas').then(({SceneCanvas: Canvas}) => ({
    default: Canvas,
  })),
);

interface SceneShellProps {
  articles: readonly ArticleSummary[];
  children?: ReactNode;
}

export function SceneShell({articles, children}: SceneShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isArt = pathname.startsWith('/artworks');
  const {backdrop, capture} = useArtScene();
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const [artCameraEditing, setArtCameraEditing] = useState(false);
  const artCameraStore = useCreateStore();
  const [settledPose, setSettledPose] = useState<SectionId | null | undefined>(isArt ? 'art' : null);
  const {
    sceneState,
    sceneStarted,
    sceneProgress,
    showBypass,
    isReducedMotion,
    handleSceneReady,
    handleSceneProgress,
    handleSceneError,
    enterTerrainFallback,
  } = useSceneLoading(isArt);

  // An Art visit dismisses the old homepage preview, including entry via Nav.
  // Adjust before rendering so Home always returns to the landscape overview.
  if (isArt && activeId !== null) setActiveId(null);

  function toggleSection(id: SectionId) {
    if (id === 'art') {
      // Start from the live camera pose, even while the route is being fetched.
      setActiveId('art');
      router.push('/artworks');
      return;
    }
    setActiveId((currentId) => (currentId === id ? null : id));
  }

  const isBlocking = !isArt && (sceneState === 'loading' || sceneState === 'exiting');
  // Art content stays hidden until the camera has arrived at the Art pose.
  const artArriving = isArt && settledPose !== 'art' && sceneState !== 'fallback';

  return (
    <div
      className={`relative min-h-svh w-full bg-background text-foreground
        ${isArt ? 'art-environment' : 'h-svh overflow-hidden'}`}
      aria-busy={isBlocking}
      data-art-arriving={artArriving}
      data-camera-editing={isArt && artCameraEditing}
    >
      <div aria-hidden={isBlocking} className="contents" inert={isBlocking}>
        <DevPanels isArt={isArt} capturing={capture.enabled} artCameraStore={artCameraStore} />
        {sceneState === 'fallback' ? (
          <TerrainFallback />
        ) : sceneStarted ? (
          <Suspense fallback={null}>
            <SceneCanvas
              activeId={isArt ? 'art' : activeId}
              backdrop={isArt && !artArriving ? backdrop : null}
              artActive={isArt}
              artCameraEditing={artCameraEditing && !artArriving && !capture.enabled}
              artCameraStore={artCameraStore}
              onArtCameraEditingChange={setArtCameraEditing}
              onPoseSettled={setSettledPose}
              introStarted={sceneState === 'ready'}
              onSceneError={handleSceneError}
              onSceneProgress={handleSceneProgress}
              onSceneReady={handleSceneReady}
              onLinkClick={toggleSection}
            />
          </Suspense>
        ) : null}

        {!isBlocking && !isArt ? (
          <HeroLayer isHidden={activeId !== null} useHtmlDesktopName={sceneState === 'fallback'} />
        ) : null}
        <Drawer
          activeId={isArt || activeId === 'art' ? null : activeId}
          articles={articles}
          onClose={() => setActiveId(null)}
        />
      </div>
      <div className="art-content" inert={artArriving || (isArt && artCameraEditing && !capture.enabled)}
        aria-hidden={artArriving || undefined}>
        {children}
      </div>
      {process.env.NODE_ENV === 'development' && isArt && !artArriving && sceneState !== 'fallback'
        ? <CapturePanel />
        : null}
      {isArt && sceneState === 'loading' ? (
        <p className="art-scene-status" role="status">
          Preparing the landscape…
        </p>
      ) : null}
      {isBlocking ? (
        <Preloader
          onContinueWithoutTerrain={enterTerrainFallback}
          progress={sceneProgress}
          reducedMotion={isReducedMotion}
          showBypass={showBypass}
          state={sceneState}
        />
      ) : null}
    </div>
  );
}
