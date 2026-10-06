// Invisible HTML button pinned over one scene link, so the WebGL word is clickable, focusable and labelled.
'use client';

import {Html} from '@react-three/drei';
import type {Group} from 'three';
import type {SceneLink} from '@/config/scene';
import type {SectionId} from '@/data/sections';

const HIT_TARGET_CLASS = `scene-link-hit block min-h-11 min-w-11 touch-manipulation
  cursor-pointer rounded-sm border border-transparent bg-transparent
  text-transparent outline-none transition-colors
  focus-visible:border-line-hover focus-visible:bg-accent-dim
  data-active:data-focused:focus-visible:border-transparent
  data-active:data-focused:focus-visible:bg-transparent`;

type SceneLinkHitTargetProps = {
  link: SceneLink;
  position: [number, number, number];
  activeId: SectionId | null;
  groupRef: (node: Group | null) => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onHover: (index: number | null) => void;
  onLinkClick: (id: SectionId) => void;
};

export function SceneLinkHitTarget({
  link, position, activeId, groupRef, buttonRef, onHover, onLinkClick,
}: SceneLinkHitTargetProps) {
  const isFocused = activeId !== null;
  return (
    <group ref={groupRef} position={position}>
      <Html center zIndexRange={[30, 10]}>
        <button
          ref={buttonRef}
          type="button"
          className={HIT_TARGET_CLASS}
          aria-label={`Open ${link.text.toLowerCase()} preview`}
          aria-pressed={activeId === link.id}
          data-active={activeId === link.id || undefined}
          data-focused={isFocused || undefined}
          data-muted={(isFocused && activeId !== link.id) || undefined}
          onPointerEnter={() => onHover(link.index)}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover(link.index)}
          onBlur={() => onHover(null)}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onLinkClick(link.id);
          }}
        />
      </Html>
    </group>
  );
}
