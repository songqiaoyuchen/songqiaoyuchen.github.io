ART TERRAIN - MAIN PROMPTS

pencil.txt, oil.txt and digital.txt are the three consolidated prompts. 
Each describes the complete intended result;

Attach a clean realistic terrain capture as image 1. 
Optionally attach an existing illustration as image 2 for style only. 
Camera, crop and mountain geometry always come from image 1. 
Oil and pencil combine the established art direction into one prompt each. 
The digital prompt is for external models; 
the website's digital treatment remains procedural.

Open Art > Screenshot mode. 
Choose a source and adjust exposure, contrast and saturation. 
The default +2 exposure lifts dark terrain; 0 / 1 / 1 preserves source colors. 
Export a clean 2:1 PNG at 2048x1024 or 4096x2048. 
Controls, gallery, navigation and scrim are excluded. 
Hide controls for manual screenshots; 
Esc or a tap restores them. 
Save settings to record the actual camera and adjustments.

Generate the complete terrain, including rear ranges and both sides. 
Gallery darkening is applied separately by the website. 
Preserve the screenshot's camera exactly when making replacement overlays. 
A changed Art camera requires matching config/scene/artIllustration.ts and 
regenerated oil/pencil images.

Image models drift the composition (both current illustrations came back ~3.5% too high). 
After saving a new image, 
run node scripts/register-illustration.mjs <oil|pencil> --apply 
to align it to tmp/pencil-overlay/terrain-source.png, then bump its version in config/scene.
