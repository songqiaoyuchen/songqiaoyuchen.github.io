# lib/lake

| File | Purpose |
| --- | --- |
| `sonarSound.ts` | The sonar's sound: a recorded sample when `LAKE_DIVE_CONFIG.soundSrc` names one, else a synthesised ping (a detuned tone ringing into a convolver's tail) under a low-pass; the context is made on the first ping |
