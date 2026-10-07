# Bugs

Deferred until interaction/layout stabilizes.

The old Art stack was replaced by the [unified Art journey](stage-2-art-journey.md).
Hidden slides are inert, and visible controls/instructions explain browsing.
No remaining Art interaction defect is currently recorded here.

- Content lint: `npm run lint` reports an existing `max-len` error in
  `data/projects.ts:92`. Wrap the entry during the next content cleanup.
- Reduced motion leaves two Art animations running because their selectors outrank
  the reduced-motion overrides: the label entrance `.art-caption-live .art-label > *`
  (`components/art/selected/Caption.css`) beats `.art-caption-item *`, and the swipe
  hint `.art-environment:not([data-art-arriving='true']) .art-swipe-next span`
  (`SwipeRail.css`) beats `.art-environment .art-swipe-next span`. Kept as-is by the
  2026-10 structure refactor (behaviour-neutral); raise the overrides' specificity
  when Art motion is next reviewed.
