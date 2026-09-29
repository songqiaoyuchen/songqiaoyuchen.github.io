# Workflow

## Work modes

Infer the mode from the request; an explicit mode takes precedence. These are
not mandatory sequential phases.

| Mode | Behavior |
| --- | --- |
| Plan | Clarify the objective, constraints, dependencies, and next implementable slice. Do not implement unless requested. |
| Design | Explore concrete alternatives with representative content. Keep unrelated variables fixed and prototypes isolated. |
| Code | Implement the requested slice using existing patterns and the automatic checks below. |
| Review | Inspect and report findings with locations and evidence. Make edits only when requested. |

Keep exploration and plans in the conversation unless a saved handoff is needed.
Do not turn a passing preference into a permanent rule.

## Automatic checks for implementation

- At minimum, compile/type-check code changes. Run relevant lint and targeted
  functional checks so the code makes sense, not just parses.
- Review the diff for correctness, unnecessary complexity, obvious inefficiency,
  unrelated edits, and accidental debug code. Avoid speculative optimization.
- Choose checks proportionate to the change. A production build already covers
  compilation/type checking; do not repeat equivalent checks without reason.
  Add tests for meaningful behavior or regressions, not to mirror trivial code.
- Fix failures introduced by the change. Separate existing failures and
  environmental blockers from new defects; report any unverified result.
- Documentation-only edits need link/reference and diff checks, not compilation.

Browser/visual verification and broader release checks run only when requested
in review mode. Do not automatically open a browser, capture screenshots, or run
deployment, device, performance, or full accessibility audits after implementation.
The user may verify visuals personally or request a review when the feature settles.

Finish with a brief account of what changed, what was checked, and any relevant
unresolved failure. No formal verification levels or approval ceremony.

## Deferred work

Record out-of-scope findings in the relevant `docs/todos/` file: issue, location,
and when to revisit; include reproduction/evidence if useful. Read only the
relevant list. Merge duplicates and remove completed or obsolete items.

Todos are deferred work, not release gates or permission to expand the task.
Fix defects introduced by the current change; defer unrelated hardening until
requested or until it directly blocks the work.
