// Lets TypeScript import GLSL files as strings (bundled by raw-loader, see next.config.ts).
declare module '*.glsl' { const value: string; export default value }
declare module '*.vert' { const value: string; export default value }
declare module '*.frag' { const value: string; export default value }
declare module '*.vs'   { const value: string; export default value }
declare module '*.fs'   { const value: string; export default value }