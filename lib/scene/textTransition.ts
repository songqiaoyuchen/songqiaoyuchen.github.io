export type TextTransition = {key: string; visibility: number};

export function advanceTextVisibility(
  current: number,
  visible: boolean,
  delta: number,
  reducedMotion: boolean,
  revealSpeed: number,
  hideSpeed: number,
) {
  const target = visible ? 1 : 0;
  if (reducedMotion) return target;
  const step = Math.min(Math.max(delta, 0), .05);
  return visible ? Math.min(1, current + step * revealSpeed)
    : Math.max(0, current - step * hideSpeed);
}

/** Replace a text layout only while fully dissolved; reveal after camera arrival. */
export function advanceTextTransition(
  state: TextTransition,
  request: {key: string; visible: boolean; ready: boolean},
  delta: number,
  reducedMotion: boolean,
  revealSpeed: number,
  hideSpeed: number,
): TextTransition {
  if (reducedMotion) return {key: request.key, visibility: request.visible && request.ready ? 1 : 0};
  const visible = request.visible && request.ready && state.key === request.key;
  const visibility = advanceTextVisibility(state.visibility, visible, delta, false, revealSpeed, hideSpeed);
  return {key: visibility === 0 ? request.key : state.key, visibility};
}
