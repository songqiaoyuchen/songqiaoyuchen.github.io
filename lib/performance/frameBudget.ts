type BrowserScheduler = {
  postTask?: (
    callback: () => void,
    options?: {priority: 'background' | 'user-blocking' | 'user-visible'},
  ) => Promise<void>;
};

function nextAnimationFrame() {
  return new Promise<number>((resolve) => window.requestAnimationFrame(resolve));
}

export async function yieldToBackgroundTask() {
  const scheduler = (window as Window & {scheduler?: BrowserScheduler}).scheduler;
  if (scheduler?.postTask) {
    await scheduler.postTask(() => undefined, {priority: 'background'});
    return;
  }
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

/**
 * Wait for consecutive frames with room for another startup phase. A bounded
 * sample count prevents low-refresh-rate devices from waiting forever.
 */
export async function waitForHealthyFrames(
  requiredFrames = 2,
  frameBudgetMs = 24,
  maximumSamples = 12,
) {
  await yieldToBackgroundTask();
  let previous = await nextAnimationFrame();
  let healthyFrames = 0;
  for (let sample = 0; sample < maximumSamples; sample++) {
    const current = await nextAnimationFrame();
    healthyFrames = current - previous <= frameBudgetMs ? healthyFrames + 1 : 0;
    if (healthyFrames >= requiredFrames) return;
    previous = current;
  }
}
