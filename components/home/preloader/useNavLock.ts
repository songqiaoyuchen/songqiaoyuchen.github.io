// While the preloader is up: make the site nav inert and hidden, and lock page scroll (html[data-home-loading]).
'use client';

import {useEffect} from 'react';

export function useNavLock() {
  useEffect(() => {
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Site navigation"]');
    const previousAriaHidden = navigation?.getAttribute('aria-hidden');
    navigation?.setAttribute('inert', '');
    navigation?.setAttribute('aria-hidden', 'true');
    if (navigation?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    document.documentElement.dataset.homeLoading = 'true';

    return () => {
      navigation?.removeAttribute('inert');
      if (previousAriaHidden === null) navigation?.removeAttribute('aria-hidden');
      else if (previousAriaHidden !== undefined) {
        navigation?.setAttribute('aria-hidden', previousAriaHidden);
      }
      delete document.documentElement.dataset.homeLoading;
    };
  }, []);
}
