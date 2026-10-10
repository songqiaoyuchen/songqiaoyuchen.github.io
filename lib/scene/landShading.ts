// Registers shaders/terrain/landShading.glsl as the `#include <land_shading>` chunk, so the terrain, the regional
// ground and the globe colour their land with one formula. Import for the effect before compiling any of them.
import {ShaderChunk} from 'three';
import landShading from '@/shaders/terrain/landShading.glsl';

(ShaderChunk as Record<string, string>).land_shading = landShading;
