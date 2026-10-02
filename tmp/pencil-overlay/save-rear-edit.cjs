const fs = require('node:fs/promises');
const sharp = require('sharp');
(async () => {
  const prompt = await fs.readFile('tmp/pencil-overlay/pencil-rear-retry-prompt.txt', 'utf8');
  const contract = JSON.parse(await fs.readFile('tmp/pencil-overlay/pencil-rear-retry-contract.json', 'utf8'));
  await sharp('tmp/pencil-overlay/pencil-rear-retry.png').webp({ quality: 90 }).toFile('public/textures/terrain/pencil-illustration.webp');
  await fs.writeFile('public/textures/terrain/pencil-illustration-prompt.txt', prompt);
  await fs.writeFile('public/textures/terrain/pencil-illustration.json', JSON.stringify({
    source: contract.source_checkpoint,
    method: 'Built-in image_gen; bounded removal of all detached rear mountain ranges and ridges, preserving foreground drawing and right-side negative space.',
    prompt,
    editContract: contract,
    generatedOriginal: 'C:/Users/songq/.codex/generated_images/01a0fc9e-975b-78d3-be50-a7332d4493ac/exec-36f0c709-e275-475d-b791-68aa554abba3.png',
    dimensions: { width: 1774, height: 887 },
    qa: { result: 'Accepted after generated-image inspection; all detached rear ridges removed, foreground composition and marks materially stable. No browser review.' }
  }, null, 2) + '\n');
  console.log(await sharp('public/textures/terrain/pencil-illustration.webp').metadata());
})();
