// Builds the smoothed "shell" height field that contours and scene text sit on.
import type {HeightGrid} from './bake';

function smoothGrid(grid: HeightGrid, iterations: number, factor: number) {
  const {width, height} = grid;
  let source = Float32Array.from(grid.data);
  if (iterations <= 0 || factor === 0) return source;

  let output = new Float32Array(source.length);
  for (let iteration = 0; iteration < iterations; iteration++) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const index = row + x;
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          output[index] = source[index];
          continue;
        }
        const average = (
          source[index - 1]
          + source[index + 1]
          + source[index - width]
          + source[index + width]
        ) * 0.25;
        output[index] = source[index] + (average - source[index]) * factor;
      }
    }
    [source, output] = [output, source];
  }
  return source;
}

function dilateGrid(grid: HeightGrid, radius: number): HeightGrid {
  const {data, width, height} = grid;
  const horizontal = new Float32Array(data.length);
  const output = new Float32Array(data.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let maximum = -Infinity;
      const start = Math.max(x - radius, 0);
      const end = Math.min(x + radius, width - 1);
      for (let index = start; index <= end; index++) {
        maximum = Math.max(maximum, data[row + index]);
      }
      horizontal[row + x] = maximum;
    }
  }
  for (let y = 0; y < height; y++) {
    const start = Math.max(y - radius, 0);
    const end = Math.min(y + radius, height - 1);
    for (let x = 0; x < width; x++) {
      let maximum = -Infinity;
      for (let index = start; index <= end; index++) {
        maximum = Math.max(maximum, horizontal[index * width + x]);
      }
      output[y * width + x] = maximum;
    }
  }
  return {data: output, width, height};
}

export function bakeShellGrid(
  grid: HeightGrid,
  iterations: number,
  factor: number,
): HeightGrid {
  const radius = Math.ceil(Math.sqrt(Math.max(iterations, 1))) + 1;
  const smoothed = smoothGrid(dilateGrid(grid, radius), iterations, factor);
  for (let index = 0; index < smoothed.length; index++) {
    smoothed[index] = Math.max(smoothed[index], grid.data[index]);
  }
  return {data: smoothed, width: grid.width, height: grid.height};
}
