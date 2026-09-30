# Stage 2: Lake exploration

Status: direction accepted; design and implementation pending.

## Accepted direction

- Terraform the homepage's central basin into a lake. A subtle glow/hover response
  invites entry; clicking the lake begins a dive into an underwater journey.
- Navigate toward the deep using WASD or arrow keys. Sonar pulses propagate through
  the environment and reveal landforms/walls; the sketch proposes clicking to scan.
- Reward exploration and patience rather than skill or difficulty. Sonar is primarily
  aesthetic and atmospheric, not a requirement to repeatedly earn basic visibility.
  Keep enough spatial information available for comfortable navigation.
- Ordinary collisions are forgiving, without restarting the journey from the beginning.
  Going far off course must still have a consequence; its form remains a prototype choice.
- Reaching the end reveals a treasure: a letter in a bottle containing a more personal
  side of the author. Essential About/contact information remains directly accessible.
- Treat the game as an optional discovery within the shared site. Preserve a clear exit
  and the [shared navigation rules](stage-2-navigation.md).

## Open prototype decisions

- Movement model, route geometry, journey length, speed, camera and touch controls.
- Sonar input/cadence, visual persistence, and baseline visibility without scanning.
- How to communicate course boundaries and apply a proportionate consequence for
  substantial deviation without making minor collisions frustrating.
- Letter content, presentation and replay behavior; game progress restoration.
- Reduced-motion and assisted exploration behavior, keeping essential content usable.

## Work and validation

- [ ] Prototype a short route with entry, movement, sonar, boundaries, treasure and exit.
- [ ] Verify ordinary collisions are forgiving and major deviations have a clear consequence.
- [ ] Check that navigation remains understandable without constant sonar activation.
- [ ] Develop the personal letter and its reveal with representative content.
- [ ] Verify keyboard/touch operation and appropriate reduced-motion behavior.

## Reference

User's illustrated brief and clarified direction, 2026-09-30, in this chat.
Source illustration: `6190261734833067766.jpg` (New Experience Game).
