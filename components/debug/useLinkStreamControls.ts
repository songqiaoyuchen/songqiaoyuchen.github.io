import {useControls} from 'leva';
import {MOBILE_LINK_STREAM_CONFIG} from '@/config/navigation';

export function useLinkStreamControls() {
  return useControls('Mobile Link Streams', {
    mobileStartX: {
      value: MOBILE_LINK_STREAM_CONFIG.mobileStartX,
      min: -1,
      max: 0,
      step: 0.01,
      label: 'Start X',
    },
    mobileEndX: {
      value: MOBILE_LINK_STREAM_CONFIG.mobileEndX,
      min: 0,
      max: 1,
      step: 0.01,
      label: 'End X',
    },
    mobileCenterY: {
      value: MOBILE_LINK_STREAM_CONFIG.mobileCenterY,
      min: -2,
      max: 0.5,
      step: 0.005,
      label: 'Center Y (NDC)',
    },
    mobileDepthOffset: {
      value: MOBILE_LINK_STREAM_CONFIG.mobileDepthOffset,
      min: 0,
      max: 12,
      step: 0.1,
      label: 'Depth Offset',
    },
  });
}
