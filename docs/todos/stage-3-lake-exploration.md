# Stage 3: Lake exploration

Status: direction and prototype decisions accepted (2026-10-25); first prototype built the same day (see
[architecture](../architecture.md#lake)), frame-checked in the browser, awaiting the user's play-through.

## Experience

- The homepage's central basin becomes a lake. It glows on hover; clicking it dives in.
- The dive simulates the sonar sequence of the reference film: descending a deep, narrow,
  water-filled crack, seeing the terrain only through sonar pings.
- The purpose is a reward for patience with some play in it, not a skill test. Collisions
  are very forgiving, yet the player must feel they are achieving something: going deeper,
  and a reveal at the end.
- The end reveals a treasure: a letter in a bottle with a more personal side of the author.
  Essential About/contact information remains directly accessible outside the game.
- The game is an optional discovery within the shared site. Clicking the lake in the home
  scene is the only way in: no top-nav entry and no route of its own, so it cannot be
  reached by URL (2026-10-25). Escape or a "Surface" control exits to the homepage at any
  time, under the [shared navigation rules](stage-2-navigation.md).

## Decisions (2026-10-25)

- Palette: the site's own gold and cyan, with small variations only. Terrain imaging in gold,
  continuous with the homepage contours; HUD text and the active wavefront in cyan. The film's
  yellow-green and orange do not carry over. No cockpit, no pilot, no instruments: only the
  dive screen.
- Two absolute keys: the scanning action on the terrain, and the sonar screen UI (distance
  readouts, possibly speed, a scanning label). Everything else is secondary.
- Sonar ping: one pulse with three phases, after the film. A near-field flash, a wavefront
  travelling outward that draws terrain edges as it passes, then decay to an afterimage over
  a few seconds. The left and right distance readouts count up with the wavefront's range,
  and their asymmetry is the navigation information.
- Sonar input: click, space or tap, on a cooldown of about 3 s that the HUD shows as a bar.
  One ping is sent as the crack comes into view, with "press space to scan" on screen until the
  player's first; every later scan is the player's (play-through, 2026-10-25). The wall readouts
  are live, passive soundings; a ping in flight makes them count up with its front.
- Baseline visibility: a faint resting light on surfaces within a few units, nothing beyond,
  after the film; the sonar reveals the rest, and what it showed goes back to black in about a
  second, with a five-second cooldown, so the sonar is needed to navigate (fourth play-through,
  2026-10-26).
- After a finished dive the overview offers "Read the letter" and the dive screen "Skip to the
  bottle" (second play-through, 2026-10-25).
- Movement: first-person view down the crack. The player controls direction only (yaw free,
  pitch to near-vertical either way) and the sonar; speed is fixed (a forward-and-back drive
  was tried in the ninth play-through and removed: it fought the steering keys and weighed on
  phones). No automatic steering or current (play-through,
  2026-10-25): steering off course runs into the wall and stalls there until steered away.
  The heading is free in every direction, including right round: the trench has one way, so
  the player cannot be lost, only stuck, and a free turn is how they get unstuck (eighth
  play-through, 2026-10-26; a cone about the route's direction was tried and removed for that
  reason). Steering answers at once with light damping at a modest rate, and no course aid on
  screen. Touch: drag to steer, tap to ping.
- The route bends gently and runs straight for the last stretch into the basin, whose end wall
  stands across the trench within sonar range (sixth play-through: a sharp bend at the end lost
  the walls).
- The crack is a trench, not a tunnel: two near-vertical rock faces either side of the view, a
  narrow gap apart, with void above and below (the floor and the lake bed lie far beyond the
  sonar), on a gentle descent so the faces stand up (fourth play-through, 2026-10-26: a tall
  closed ring still read as a tunnel).
- Route: one hand-placed centreline, a few control points, descending in a winding crack.
  Walls are noise-displaced around it. A few short side pockets; no maze.
- Journey length: short. The first prototype is a quick dive, not the full experience; the
  final length is decided after playing it, and stays well under a few minutes.
- Collisions: a knock: the system's two-tone warning repeating for as long as the contact lasts
  (not a crash sound, nor a beep per touch; fifth and ninth play-throughs), a jolt of the
  view, the speed cut to a quarter and a few seconds to come back, the readouts warming and the
  screen's edges closing in while it lasts. Pressed against a wall, the heading eases along it
  over a fraction of a second rather than snapping (tenth play-through). The move is checked
  against the walls in short sub-steps, so nothing slips through a face.
  No health, no restart (fourth play-through, 2026-10-26: the dive was too easy without this).
- Off course: invisible checkpoints along the main channel. Deep in a side pocket an
  "off course" warning appears; persisting, a current carries the player back to the last
  checkpoint. The cost is time, never progress.
- Treasure: a glowing bottle lying on the basin's floor (2026-10-26: the trench opens into a basin whose walls
  stand beyond the sonar; a scan there shows a short stretch of seafloor and nothing else, and the bottle's own
  light reaches only a few units, so the floor has to be searched); at the basin's far end the craft holds still (it
  can still turn, look and scan) rather than pushing on (eighth play-through, 2026-10-26: the
  end could be reached without the bottle in reach; a beacon pulse from the bottle was tried
  and removed).
  A scan that reaches it while it lies ahead, within a
  set range, ends the dive: the craft stops facing it and the player opens it (click, tap, space)
  for the letter (third play-through, 2026-10-25). Reaching it ends the dive and opens the letter as
  a readable, accessible HTML overlay with its own route, reachable only once unlocked.
  Completion and the last checkpoint are remembered in the browser; a refresh resumes, and a
  completed lake offers "Dive again" or "Read the letter".
- Entry/exit choreography: the camera sinks through the lake surface, the contours fade to
  black and the HUD fades in; the reverse on surfacing.
- Reduced motion: no sway or inertia, pings appear instantly rather than travelling. The game
  stays keyboard-operable. No skip to the letter; the letter is the reward.
- Assets: one, the walls' scanned rock (Poly Haven's CC0 "Cliff Side", packed to a 0.6 MB map
  by `scripts/assets/pack-lake-rock.mjs`, 2026-10-26: the procedural faces read as smooth
  walls; the mesh now carries blocks and ledges and the scan the fine grain). Everything else
  is generated procedurally or built from scratch; the sonar's sound is synthesised with Web
  Audio (a recorded ping can replace it, `soundSrc`).
- Tuning: Leva's Lake folder (cooldown, sonar, resting light, feel, found range, sound), saved
  to `LAKE_DIVE_CONFIG` by Save Config.
- Places stays visible; the earlier idea of gating Places behind the game (2026-10-16) was
  set aside. Only the letter is gated.

## Work and validation

- [x] Prototype a short dive: entry from the basin, fixed-speed descent with direction control,
      the three-phase ping on procedural crack walls, HUD readouts, the bottle, and exit (2026-10-25: about a
      minute of descent on the current alone; letter copy is a placeholder in `data/lake.ts`).
- [ ] Play it to decide journey length, ping cadence and how little baseline visibility works.
- [ ] Verify collisions are forgiving and the off-course current reads as proportionate.
- [ ] Develop the letter and its reveal with representative content.
- [ ] Verify keyboard/touch operation and reduced-motion behaviour.

## Reference

- User's illustrated brief and clarified direction, 2026-09-30 (illustration:
  [lake-brief.jpg](assets/lake-brief.jpg)); refocus and decisions, 2026-10-25.
- Key reference: CGI short film "DEEP: 深海" by Singularity VIL,
  https://www.youtube.com/watch?v=NeeaLHNCfRM, from 4:30; 5:20 to 5:30 is the key sequence
  (the ping: flash, travelling wavefront with readouts counting up, decay).
