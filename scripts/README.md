# scripts

Node tools run from the repository root (`node scripts/<folder>/<file>`). They import project TypeScript
directly through Node's type stripping, so the `config/` and `lib/` files they load must use type-only
`@/` imports and relative `.ts` paths for anything else.

| Folder | Purpose |
| --- | --- |
| `bake/` | Offline asset baking (terrain artifacts; legacy oil maps) |
| `build/` | Build hooks run by npm scripts |
| `assets/` | Asset helpers: atlases, artwork dimensions, backdrop image registration |
| `test/` | Fast unit checks of pure logic (no browser) |
| `verify/` | Opt-in browser checks with an external Playwright |
