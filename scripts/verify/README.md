# scripts/verify

Opt-in browser checks against a running server. Set `ART_BASE_URL`, `ARTIFACT_DIR`, and
`PLAYWRIGHT_MODULE` if Playwright is installed elsewhere (`CHROME_PATH` picks a browser).

| File | Checks |
| --- | --- |
| `verify-art.mjs` | Art journeys end to end, with screenshots |
| `verify-art-camera.mjs` | Art camera pose and journeys |
| `verify-art-layout.mjs` | Carousel and caption geometry across viewports |
| `verify-pencil-overlay.mjs` | Backdrop wipe, image framing on resize, reduced motion |
| `verify-text-transitions.mjs` | Scene text dissolves and navigation on desktop and mobile |
