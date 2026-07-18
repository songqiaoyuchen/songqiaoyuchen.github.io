"""Generate the runtime SDF atlas used by the terrain text layer.

The generator intentionally uses only Pillow and NumPy so the atlas can be
rebuilt without a native font toolchain. ASCII 32..126 is placed on a stable
16-column grid; the accompanying JSON records both pixel and normalized cells.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


FIRST_CODEPOINT = 32
LAST_CODEPOINT = 126
COLUMNS = 16
ROWS = 8


def edt_1d(values: np.ndarray) -> np.ndarray:
    """Squared Euclidean distance transform (Felzenszwalb/Huttenlocher)."""

    count = values.shape[0]
    sites = np.zeros(count, dtype=np.int32)
    bounds = np.empty(count + 1, dtype=np.float64)
    distances = np.empty(count, dtype=np.float64)
    k = 0
    sites[0] = 0
    bounds[0] = -np.inf
    bounds[1] = np.inf

    for q in range(1, count):
        while True:
            p = sites[k]
            crossing = ((values[q] + q * q) - (values[p] + p * p)) / (2 * (q - p))
            if crossing > bounds[k] or k == 0:
                break
            k -= 1
        k += 1
        sites[k] = q
        bounds[k] = crossing
        bounds[k + 1] = np.inf

    k = 0
    for q in range(count):
        while bounds[k + 1] < q:
            k += 1
        delta = q - sites[k]
        distances[q] = delta * delta + values[sites[k]]
    return distances


def edt(mask: np.ndarray) -> np.ndarray:
    """Distance to the nearest true pixel in a boolean mask."""

    large = float(mask.shape[0] * mask.shape[0] + mask.shape[1] * mask.shape[1] + 1)
    field = np.where(mask, 0.0, large)
    vertical = np.empty_like(field)
    for x in range(field.shape[1]):
        vertical[:, x] = edt_1d(field[:, x])
    result = np.empty_like(field)
    for y in range(field.shape[0]):
        result[y, :] = edt_1d(vertical[y, :])
    return np.sqrt(result)


def glyph_sdf(font: ImageFont.FreeTypeFont, character: str, cell_size: int, distance_range: int) -> np.ndarray:
    mask_image = Image.new("L", (cell_size, cell_size), 0)
    draw = ImageDraw.Draw(mask_image)
    ascent, descent = font.getmetrics()
    baseline = (cell_size - (ascent + descent)) * 0.5 + ascent
    draw.text((cell_size * 0.5, baseline), character, font=font, fill=255, anchor="ms")
    mask = np.asarray(mask_image, dtype=np.uint8) >= 128
    if not mask.any():
        return np.zeros((cell_size, cell_size), dtype=np.uint8)

    inside = edt(~mask)
    outside = edt(mask)
    signed_distance = inside - outside
    encoded = np.clip(0.5 + signed_distance / (2.0 * distance_range), 0.0, 1.0)
    return np.rint(encoded * 255.0).astype(np.uint8)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("font", type=Path)
    parser.add_argument("image", type=Path)
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--cell-size", type=int, default=128)
    parser.add_argument("--font-size", type=int, default=88)
    parser.add_argument("--distance-range", type=int, default=14)
    args = parser.parse_args()

    font = ImageFont.truetype(str(args.font), args.font_size)
    width = COLUMNS * args.cell_size
    height = ROWS * args.cell_size
    atlas = np.zeros((height, width), dtype=np.uint8)
    glyphs: dict[str, object] = {}

    for codepoint in range(FIRST_CODEPOINT, LAST_CODEPOINT + 1):
        index = codepoint - FIRST_CODEPOINT
        column = index % COLUMNS
        row = index // COLUMNS
        x = column * args.cell_size
        y = row * args.cell_size
        atlas[y : y + args.cell_size, x : x + args.cell_size] = glyph_sdf(
            font,
            chr(codepoint),
            args.cell_size,
            args.distance_range,
        )
        glyphs[str(codepoint)] = {
            "character": chr(codepoint),
            "index": index,
            "column": column,
            "row": row,
            "pixelBounds": [x, y, x + args.cell_size, y + args.cell_size],
            "uvBounds": [
                x / width,
                y / height,
                (x + args.cell_size) / width,
                (y + args.cell_size) / height,
            ],
        }

    args.image.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(atlas, mode="L").save(args.image, optimize=True)
    args.metadata.write_text(
        json.dumps(
            {
                "type": "sdf",
                "font": args.font.name,
                "firstCodepoint": FIRST_CODEPOINT,
                "lastCodepoint": LAST_CODEPOINT,
                "columns": COLUMNS,
                "rows": ROWS,
                "cellSize": args.cell_size,
                "fontSize": args.font_size,
                "distanceRange": args.distance_range,
                "width": width,
                "height": height,
                "glyphs": glyphs,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {args.image} ({width}x{height}) and {args.metadata}")


if __name__ == "__main__":
    main()
