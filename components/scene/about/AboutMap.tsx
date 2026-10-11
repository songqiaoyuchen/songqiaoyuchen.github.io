// About's map: the quiet survey contours that replace the homepage's on About (ABOUT_MAP_CONFIG). Phones see the
// whole ridge from far off, where every line is widened to its minimum and dimmed with it, so they draw the lines a
// little wider and brighter.
'use client';

import {useThree} from '@react-three/fiber';
import {useMemo, type ComponentProps} from 'react';
import {SCENE_LAYOUT_CONFIG} from '@/config/scene';
import {ABOUT_MAP_CONFIG} from '@/config/scene/aboutPath';
import {Contours} from '../terrain/Contours';

type AboutMapProps = Omit<ComponentProps<typeof Contours>, 'focus' | 'lighting' | 'minPixels'>;

export function AboutMap({contourSettings, ...props}: AboutMapProps) {
  const isMobile = useThree((state) => state.size.width) < SCENE_LAYOUT_CONFIG.mobileMaxWidth;
  const {phoneIntensityGain, phoneMinPixels, minPixels, focus, lighting} = ABOUT_MAP_CONFIG;
  const settings = useMemo(() => (isMobile ? {
    ...contourSettings,
    minorIntensity: contourSettings.minorIntensity * phoneIntensityGain,
    majorIntensity: contourSettings.majorIntensity * phoneIntensityGain,
  } : contourSettings), [contourSettings, isMobile, phoneIntensityGain]);
  return (
    <Contours
      {...props}
      contourSettings={settings}
      focus={focus}
      lighting={lighting}
      minPixels={isMobile ? phoneMinPixels : minPixels}
    />
  );
}
