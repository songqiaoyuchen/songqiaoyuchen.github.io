import { useState } from 'react';
import { HOME_LOCATIONS } from './locations/homeLocations';

export function useHomeNavigationState() {
  const locationCount = HOME_LOCATIONS.length;

  if (locationCount < 1) {
    throw new Error('useHomeNavigationState expected HOME_LOCATIONS to contain at least one location');
  }

  const lastLocationIndex = locationCount - 1;
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const activeLocation = HOME_LOCATIONS[activeLocationIndex];

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

  function goToPreviousLocation() {
    if (activeLocationIndex <= 0) {
      return;
    }

    setActiveLocationIndex(activeLocationIndex - 1);
  }

  function goToNextLocation() {
    if (activeLocationIndex >= lastLocationIndex) {
      return;
    }

    setActiveLocationIndex(activeLocationIndex + 1);
  }

  const canGoPrevious = activeLocationIndex > 0;
  const canGoNext = activeLocationIndex < lastLocationIndex;

  return {
    activeLocationIndex,
    activeLocation,
    locationCount,
    isTransitioning,
    goToLocation,
    goToPreviousLocation,
    goToNextLocation,
    canGoPrevious,
    canGoNext,
    setIsTransitioning,
  };
}