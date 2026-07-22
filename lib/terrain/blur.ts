function boxBlur(
  source: Float32Array,
  width: number,
  height: number,
  horizontal: boolean,
  radius: number,
) {
  const output = new Float32Array(width * height);
  const normalization = 1 / (radius * 2 + 1);
  if (horizontal) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let x = -radius; x <= radius; x++) {
        sum += source[row + Math.min(width - 1, Math.max(0, x))];
      }
      for (let x = 0; x < width; x++) {
        output[row + x] = sum * normalization;
        sum += source[row + Math.min(width - 1, x + radius + 1)]
          - source[row + Math.max(0, x - radius)];
      }
    }
  } else {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) {
        sum += source[Math.min(height - 1, Math.max(0, y)) * width + x];
      }
      for (let y = 0; y < height; y++) {
        output[y * width + x] = sum * normalization;
        sum += source[Math.min(height - 1, y + radius + 1) * width + x]
          - source[Math.max(0, y - radius) * width + x];
      }
    }
  }
  return output;
}

export function gaussianBlur(
  heights: Float32Array,
  width: number,
  height: number,
  sigma: number,
) {
  const radius = Math.max(1, Math.round((-1 + Math.sqrt(1 + 4 * sigma * sigma)) / 2));
  let field = heights;
  for (let pass = 0; pass < 3; pass++) {
    field = boxBlur(field, width, height, true, radius);
    field = boxBlur(field, width, height, false, radius);
  }
  return field;
}
