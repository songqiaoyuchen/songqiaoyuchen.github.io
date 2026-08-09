import {useControls} from 'leva';
import {DECOR_STREAM_CONFIG} from '@/config/scene';

const ANIMATION = DECOR_STREAM_CONFIG.animation;

export function useDecorStreamControls() {
  return useControls('Decor Streams', {
    fallRowsPerSecond: {
      value: [...ANIMATION.fallRowsPerSecond],
      min: 0,
      max: 12,
      step: 0.1,
      label: 'Stream Speed',
    },
    packetRowsPerSecond: {
      value: [...ANIMATION.packetRowsPerSecond],
      min: 0,
      max: 24,
      step: 0.1,
      label: 'Packet Speed',
    },
    letterSwapsPerSecond: {
      value: [...ANIMATION.letterSwapsPerSecond],
      min: 0,
      max: 12,
      step: 0.1,
      label: 'Letter Swap Speed',
    },
  });
}
