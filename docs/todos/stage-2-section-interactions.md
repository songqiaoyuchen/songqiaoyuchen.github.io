# Stage 2: Distinct section interactions

Status: four experience directions accepted; implementation pending, informed by Art first.

This document tracks exploration, decisions, references, and implementation for
this workstream. Accepted requirements are recorded separately from open design choices.

## Objective

Give sections distinct, useful ways to explore their content while preserving
the atmospheric terrain and the navigation's connection to the scene.

## Accepted requirements

- Progressive disclosure: provide a concise overview, then reveal media, details,
  or longer reading as the visitor chooses to go deeper. A shared panel can support
  this.
- Apply the accepted [navigation model](stage-2-navigation.md): shared destinations,
  top-nav handover, addressable views, local return, and optional Home navigation.
- Four distinct experiences share the landscape: [lake exploration](stage-2-lake-exploration.md)
  reveals a personal letter, [Travel](stage-2-travel.md) explores real geography,
  [Art](stage-2-art-journey.md) changes the terrain's medium, and
  [About](stage-2-about-path.md) uses a metaphorical experience path.
- Blog remains unchanged. Projects is limited to the existing navigation work;
  interactive project demos and content expansion are outside this scope.
- Keep interface identity stable across sections. Terrain transformations must
  settle so readable content and faithful artwork inspection take priority.
- Entry, switching and direct-link choreography follow
  [Navigation](stage-2-navigation.md); restoration follows
  [Loading and return](stage-2-loading-and-return.md).

## Findings and evidence

- The user considers terrain rendering and scene-integrated navigation successful.
  Preserve those strengths while developing interaction depth.
- Sections currently share [Drawer](../../components/home/drawer/Drawer.tsx),
  a similar content entrance, and camera repositioning. The desktop section poses
  share one look-at point in [camera config](../../config/scene/camera.ts).
- Movement changes the view but does not clearly reveal a section-specific
  destination. Define what each movement helps the visitor understand.
- [Project cards](../../components/home/drawer/projects/ProjectCard.tsx) lead to
  repositories; [About's timeline](../../components/home/drawer/about/ExperienceTimeline.tsx)
  already contains scroll-driven progression worth considering.

## Exploration and open decisions

- Define shared navigation, typography, color, and transition rules so variation
  still feels like one site.
- Decide how content takes priority after selection: space, scene brightness,
  motion, and navigation prominence. Avoid sustained competition for attention.
- Camera movement should have a legible destination or purpose. More effects or
  more camera travel alone are not evidence of greater interaction depth.
- Keep essential actions usable on touch, keyboard, and reduced motion.

## Work and validation

- [ ] Design and implement progressive disclosure for section content.
- [ ] Review lessons from the Art prototype and choose transferable principles.
- [ ] Define a meaningful visitor action and payoff for each section.
- [ ] Define shared motion/attention rules without redesigning Blog or Projects.
- [ ] Prototype and review one section at a time, including entry, use, and exit.

Success: sections offer meaningful differences in what visitors can do, movement
clarifies those actions, and the experience remains coherent and easy to navigate.

## References

- User stage 2 brief and Designly-assisted review, 2026-09-29, in this chat.
- [Art journey](stage-2-art-journey.md) is the first complete prototype.
- [Navigation](stage-2-navigation.md) owns the handover and route/view hierarchy.
- [Loading and return](stage-2-loading-and-return.md) owns cross-route restoration.
- User's Lusion reference is a craft aspiration, not a verified benchmark or a
  selected interaction reference. Add specific URLs and observations when chosen.

## Decision log

- 2026-09-29: User accepted progressive disclosure and the unified section model.
  Top-nav switching and URL behavior are owned by [Navigation](stage-2-navigation.md).
  Art remains the first prototype. Current section scope is defined above and in
  the individual experience trackers.
- 2026-09-29: User requested a dedicated document to track this design process.
  Detailed implementation and prototype choices remain open.

Append dated decisions with rationale, alternatives considered, and evidence.

## Experiments and review notes

No prototype selected yet. Record artifacts, observations, and next actions here.
