// Registers shaders/terrain/placesLens.glsl as the `#include <places_lens>` chunk for the globe, its lines, lights
// and trails. Import for the effect before compiling any of them.
import {ShaderChunk} from 'three';
import placesLens from '@/shaders/terrain/placesLens.glsl';

(ShaderChunk as Record<string, string>).places_lens = placesLens;
