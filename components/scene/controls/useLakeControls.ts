// Leva "Lake" folder (dev only, on the landscape): the dive's feel and the sonar; Save Config writes the keys to
// config/scene/lake.ts (LAKE_DIVE_CONFIG).
import {useControls} from 'leva';
import {LAKE_DIVE_CONFIG} from '@/config/scene/lake';
import {HOME_SCENE_FOLDER} from './sectionScope';

export function useLakeControls() {
  return useControls('Lake', {
    // LakeDive.tsx: seconds between the player's pings.
    pingCooldown: {value: LAKE_DIVE_CONFIG.pingCooldown, min: 0.5, max: 10, step: 0.1, label: 'Ping cooldown'},
    // crack.frag: how fast a ping's front travels, units per second.
    pingSpeed: {value: LAKE_DIVE_CONFIG.pingSpeed, min: 4, max: 40, step: 0.5, label: 'Ping speed'},
    // crack.frag: seconds the lit walls take to fade behind the front.
    pingDecay: {value: LAKE_DIVE_CONFIG.pingDecay, min: 0.5, max: 8, step: 0.1, label: 'Ping decay'},
    // crack.frag: units over which the return weakens.
    pingRange: {value: LAKE_DIVE_CONFIG.pingRange, min: 5, max: 60, step: 1, label: 'Ping range'},
    // crack.frag: the walls' resting light and how far it reaches.
    ambient: {value: LAKE_DIVE_CONFIG.ambient, min: 0, max: 0.2, step: 0.005, label: 'Resting light'},
    ambientReach: {value: LAKE_DIVE_CONFIG.ambientReach, min: 1, max: 15, step: 0.5, label: 'Resting reach'},
    // lib/scene/lake.ts advanceCraft: the craft's fixed speed and its turn rates.
    speed: {value: LAKE_DIVE_CONFIG.speed, min: 0.5, max: 6, step: 0.1, label: 'Speed'},
    chamberSpeed: {value: LAKE_DIVE_CONFIG.chamberSpeed, min: 0.1, max: 1, step: 0.05, label: 'Chamber speed'},
    turnRate: {value: LAKE_DIVE_CONFIG.turnRate, min: 0.2, max: 3, step: 0.05, label: 'Turn rate'},
    pitchRate: {value: LAKE_DIVE_CONFIG.pitchRate, min: 0.2, max: 3, step: 0.05, label: 'Pitch rate'},
    // LakeDive.tsx: how far off a scanned bottle ends the dive.
    foundRange: {value: LAKE_DIVE_CONFIG.foundRange, min: 3, max: 40, step: 1, label: 'Found range'},
    // lib/lake/sonarSound.ts: the ping's loudness, 0 for silence.
    soundVolume: {value: LAKE_DIVE_CONFIG.soundVolume, min: 0, max: 1, step: 0.05, label: 'Sound'},
  }, HOME_SCENE_FOLDER);
}
