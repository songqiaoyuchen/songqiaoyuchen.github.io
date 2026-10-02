const fs = require('node:fs/promises');
const sharp = require('sharp');
(async () => {
  const prompt = await fs.readFile('tmp/pencil-overlay/pencil-left-shoulder-prompt.txt', 'utf8');
  const contract = JSON.parse(await fs.readFile('tmp/pencil-overlay/pencil-left-shoulder-contract.json', 'utf8'));
  const before = await sharp(contract.source_checkpoint).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const after = await sharp('tmp/pencil-overlay/pencil-left-shoulder-edited.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
  const qa = {};
  for (const [name,[x,y,w,h]] of Object.entries({mainMountain:[280,230,550,600],lowerForeground:[0,560,850,300],right:[900,0,874,887]})) {
    const mean = ({data,info})=> {
      let sum=0;
      for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){
        const p=(j*info.width+i)*info.channels;
        sum+=.2126*data[p]+.7152*data[p+1]+.0722*data[p+2];
      }
      return sum/(w*h);
    };
    const a=mean(before),b=mean(after);
    qa[name]={beforeMean:+a.toFixed(3),afterMean:+b.toFixed(3),relativeChange:+(b/a-1).toFixed(3)};
  }
  await sharp('tmp/pencil-overlay/pencil-left-shoulder-edited.png').webp({quality:90}).toFile('public/textures/terrain/pencil-illustration.webp');
  await fs.writeFile('public/textures/terrain/pencil-illustration-prompt.txt',prompt);
  await fs.writeFile('public/textures/terrain/pencil-illustration.json',JSON.stringify({
    source:contract.source_checkpoint,
    method:'Built-in image_gen; bounded removal of isolated far-left upper shoulder, preserving ascending foreground diagonal and lower slopes.',
    prompt,editContract:contract,
    generatedOriginal:'C:/Users/songq/.codex/generated_images/01a0fc9e-975b-78d3-be50-a7332d4493ac/exec-10f4fa64-221e-48ed-b3a5-0bbb47044fd3.png',
    dimensions:{width:1774,height:887},
    qa:{result:'Accepted after generated-image inspection; no browser review.',...qa}
  },null,2)+'\n');
  console.log(JSON.stringify(qa));
  console.log(await sharp('public/textures/terrain/pencil-illustration.webp').metadata());
})();
