// Development-only Leva panels: the main scene panel on Home, the "Art Camera" panel on Art.
'use client';

import {Leva, LevaPanel, type useCreateStore} from 'leva';

type DevPanelsProps = {
  isArt: boolean;
  capturing: boolean;
  artCameraStore: ReturnType<typeof useCreateStore>;
};

export function DevPanels({isArt, capturing, artCameraStore}: DevPanelsProps) {
  return (
    <>
      <Leva
        collapsed={true}
        hidden={process.env.NODE_ENV !== 'development' || isArt}
        theme={{
          sizes: {
            rootWidth: 'min(400px, calc(100vw - 20px))',
          },
        }}
      />
      {process.env.NODE_ENV === 'development' && isArt && !capturing && (
        <LevaPanel store={artCameraStore} titleBar={{title: 'Art Camera', filter: false}}
          theme={{sizes: {rootWidth: 'min(360px, calc(100vw - 20px))'}}} />
      )}
    </>
  );
}
