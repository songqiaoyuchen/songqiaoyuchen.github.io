const sharp = require('sharp');
(async () => {
  const paths = ['tmp/pencil-overlay/pencil-before-rear-edit.webp', process.argv[2] || 'tmp/pencil-overlay/pencil-rear-edited.png'];
  const images = await Promise.all(paths.map(path => sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  const regions = { foreground: [0, 300, 850, 580], mainSummit: [420, 220, 130, 140], rearRemoved: [0, 70, 450, 155], right: [900, 0, 874, 887] };
  for (const [name, [x, y, w, h]] of Object.entries(regions)) {
    const values = images.map(({data,info}) => {
      let sum = 0;
      for (let j=y; j<y+h; j++) for (let i=x; i<x+w; i++) {
        const p=(j*info.width+i)*info.channels;
        sum += .2126*data[p]+.7152*data[p+1]+.0722*data[p+2];
      }
      return +(sum/(w*h)).toFixed(3);
    });
    console.log(name, JSON.stringify({before:values[0],after:values[1],relativeChange:+(values[1]/values[0]-1).toFixed(3)}));
  }
  console.log('dimensions', images.map(i=>[i.info.width,i.info.height]));
})();
