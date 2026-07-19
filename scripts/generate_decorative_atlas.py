"""Generate the compact bitmap alphabet used by decorative text streams."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+-*/<>"


def render_glyph(font: ImageFont.FreeTypeFont, character: str, width: int, height: int) -> Image.Image:
    source = Image.new("L", (96, 112), 0)
    draw = ImageDraw.Draw(source)
    draw.text((48, 56), character, font=font, fill=255, anchor="mm", stroke_width=1)
    bounds = source.getbbox()
    if bounds is None:
        return Image.new("L", (width, height), 0)

    glyph = source.crop(bounds).filter(ImageFilter.MaxFilter(3))
    scale = min((width - 1) / glyph.width, (height - 1) / glyph.height)
    target = (
        max(1, round(glyph.width * scale)),
        max(1, round(glyph.height * scale)),
    )
    glyph = glyph.resize(target, Image.Resampling.LANCZOS)
    glyph = glyph.point(lambda value: 255 if value >= 72 else 0)

    cell = Image.new("L", (width, height), 0)
    cell.paste(glyph, ((width - target[0]) // 2, (height - target[1]) // 2))
    return cell


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("font", type=Path)
    parser.add_argument("image", type=Path)
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--cell-width", type=int, default=6)
    parser.add_argument("--cell-height", type=int, default=8)
    parser.add_argument("--font-size", type=int, default=72)
    args = parser.parse_args()

    font = ImageFont.truetype(str(args.font), args.font_size)
    atlas = Image.new("L", (len(CHARACTERS) * args.cell_width, args.cell_height), 0)
    for index, character in enumerate(CHARACTERS):
        atlas.paste(
            render_glyph(font, character, args.cell_width, args.cell_height),
            (index * args.cell_width, 0),
        )

    args.image.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.image, optimize=True)
    args.metadata.write_text(
        json.dumps(
            {
                "type": "bitmap",
                "font": args.font.name,
                "characters": CHARACTERS,
                "cellWidth": args.cell_width,
                "cellHeight": args.cell_height,
                "columns": len(CHARACTERS),
                "width": atlas.width,
                "height": atlas.height,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Generated {args.image} ({atlas.width}x{atlas.height})")


if __name__ == "__main__":
    main()
