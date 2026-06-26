'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SectionId } from '@/data/homeSections';

export function useHomeState() {
  const [activeSection, setActiveSectionState] = useState<SectionId | null>(null);

  const setActiveSection = useCallback((id: SectionId) => {
    setActiveSectionState(id);
  }, []);

  const clearSection = useCallback(() => {
    setActiveSectionState(null);
  }, []);

  const toggleSection = useCallback((id: SectionId) => {
    setActiveSectionState((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') clearSection();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSection]);

  return { activeSection, setActiveSection, clearSection, toggleSection };
}