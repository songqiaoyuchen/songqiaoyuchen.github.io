// Shared prefers-reduced-motion subscription (one media query listener for all components).
'use client';

import {useSyncExternalStore} from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const subscribers = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;

function getMediaQuery() {
  mediaQuery ??= window.matchMedia(REDUCED_MOTION_QUERY);
  return mediaQuery;
}

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber: () => void) {
  const query = getMediaQuery();
  subscribers.add(subscriber);
  if (subscribers.size === 1) query.addEventListener('change', notifySubscribers);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) query.removeEventListener('change', notifySubscribers);
  };
}

function getSnapshot() {
  return getMediaQuery().matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
