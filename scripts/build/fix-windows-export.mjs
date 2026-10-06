// Postbuild fix for static export on Windows: copies prefetch files to the dotted names the router requests.
import {copyFile, readdir} from 'node:fs/promises';
import path from 'node:path';

// Next 16.3 export/index uses path.relative (backslashes on Windows), while
// convertSegmentPathToStaticExportFilename only replaces forward slashes.
// Supply the dotted filenames requested by its client router. Linux exports
// already emit these files. Remove when the upstream exporter normalizes paths.
if (process.platform === 'win32' && process.env.GITHUB_PAGES === 'true') {
  const root = path.resolve('out');
  let count = 0;
  async function visit(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(source);
      } else if (entry.isFile() && entry.name.endsWith('.txt')) {
        const parts = path.relative(root, source).split(path.sep);
        const segment = parts.findIndex((part) => part.startsWith('__next.'));
        if (segment < 0 || segment === parts.length - 1) continue;
        const destination = path.join(root, ...parts.slice(0, segment), parts.slice(segment).join('.'));
        await copyFile(source, destination);
        count++;
      }
    }
  }
  await visit(root);
  console.log(`Normalized ${count} Windows static-export prefetch filenames.`);
}
