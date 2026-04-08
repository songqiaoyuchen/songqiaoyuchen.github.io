import { useState } from 'react';

export function useHomeNavigationState(locationCount: number) {
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  function goToLocation(index: number) {
    // Validate index before updating state
    if (!Number.isInteger(index)) {
      throw new Error(`goToLocation expected an integer index, received ${index}`);
    }
    if (index < 0 || index >= locationCount) {
      throw new Error(
        `goToLocation received out-of-range index ${index}. Valid range: 0 to ${locationCount - 1}`
      );
    }

    setActiveLocationIndex(index);
  }

  return {
    activeLocationIndex,
    isTransitioning,
    goToLocation,
    setIsTransitioning,
  };
}