#!/usr/bin/env python3
"""Extract RT_ICON / RT_BITMAP from napster.exe and write pixel-perfect SVGs.

The EXE is not shipped in this repo. Point --exe at a local copy of the
unpacked payload (MD5 6d121b9717f53c48ee1254bd28ed9c00) or at the ICO/BMP
files already dumped by wrestool.
"""

from __future__ import annotations

import argparse
import struct
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore


# GROUP_ICON id → filename (from napster.exe RT_GROUP_ICON names)
ICON_NAMES = {
    101: "app",
    108: "chat",
    157: "play",
    259: "file-list",
    277: "speaker",
    292: "download",
    293: "upload",
    331: "stop",
    332: "pause",
    334: "wave-left",
    335: "wave-right",
    336: "transfer",
    339: "search",
    346: "folder",
    348: "checkbox",
    349: "checkbox-on",
    355: "hand",
    381: "user",
    387: "badge-red",
    388: "blank",
    389: "checkbox-dim",
    393: "folders",
    394: "folder-open",
    395: "drive",
    396: "computer",
    397: "drive-net",
    398: "cdrom",
    400: "help",
    409: "disc",
    410: "cd",
    419: "user-online",
    420: "window",
    423: "note",
    457: "lock",
    458: "unlock",
}

BITMAP_NAMES = {
    264: "status-yellow",
    265: "status-red",
    266: "status-green",
    268: "status-black",
    379: "logo",
    452: "cdnow",
}

# 8×8 status dots sit on white in the BMP; treat white as transparent.
STATUS_KEY = {(264, 265, 266, 268): (255, 255, 255)}


def parse_ico(data: bytes) -> list[list[list[tuple[int, int, int] | None]]]:
    reserved, itype, count = struct.unpack_from("<HHH", data, 0)
    if reserved != 0 or itype != 1 or count < 1:
        raise ValueError("not an ICO")
    images = []
    for i in range(count):
        _w, _h, _cc, _res, _planes, _bpp, size, off = struct.unpack_from(
            "<BBBBHHII", data, 6 + i * 16
        )
        images.append(decode_icon_dib(data[off : off + size]))
    return images


def decode_icon_dib(dib: bytes) -> list[list[tuple[int, int, int] | None]]:
    bi_size, width, height, planes, bpp = struct.unpack_from("<IiiHH", dib, 0)
    if bi_size < 40 or width <= 0:
        raise ValueError("bad BITMAPINFOHEADER")
    # Icons store XOR+AND, so biHeight is typically 2× the pixel height.
    pix_h = abs(height) // 2 if abs(height) >= width * 2 or abs(height) > width else abs(height)
    if pix_h <= 0:
        pix_h = abs(height) if height else width

    n_colors = struct.unpack_from("<I", dib, 32)[0]
    if n_colors == 0:
        n_colors = 2**bpp if bpp <= 8 else 0

    pal: list[tuple[int, int, int]] = []
    off = bi_size
    for _ in range(n_colors):
        b, g, r, _x = dib[off : off + 4]
        pal.append((r, g, b))
        off += 4

    xor_stride = ((width * bpp + 31) // 32) * 4
    and_stride = ((width + 31) // 32) * 4
    xor = dib[off : off + xor_stride * pix_h]
    andb = dib[off + xor_stride * pix_h : off + xor_stride * pix_h + and_stride * pix_h]

    rows: list[list[tuple[int, int, int] | None]] = []
    for y in range(pix_h):
        src_y = pix_h - 1 - y
        row: list[tuple[int, int, int] | None] = []
        for x in range(width):
            mask = 1
            if andb:
                byte = andb[src_y * and_stride + (x // 8)]
                mask = (byte >> (7 - (x % 8))) & 1
            color = sample_xor(xor, pal, bpp, width, xor_stride, src_y, x)
            row.append(None if mask else color)
        rows.append(row)
    return rows


def sample_xor(
    xor: bytes,
    pal: list[tuple[int, int, int]],
    bpp: int,
    width: int,
    stride: int,
    y: int,
    x: int,
) -> tuple[int, int, int]:
    if bpp == 1:
        byte = xor[y * stride + x // 8]
        idx = (byte >> (7 - (x % 8))) & 1
        return pal[idx] if pal else ((0, 0, 0) if idx == 0 else (255, 255, 255))
    if bpp == 4:
        byte = xor[y * stride + x // 2]
        idx = (byte >> 4) if x % 2 == 0 else (byte & 0xF)
        return pal[idx]
    if bpp == 8:
        idx = xor[y * stride + x]
        return pal[idx]
    if bpp == 24:
        o = y * stride + x * 3
        b, g, r = xor[o : o + 3]
        return (r, g, b)
    if bpp == 32:
        o = y * stride + x * 4
        b, g, r, _a = xor[o : o + 4]
        return (r, g, b)
    raise ValueError(f"unsupported bpp {bpp}")


def pil_to_rows(
    im: "Image.Image", key: tuple[int, int, int] | None = None
) -> list[list[tuple[int, int, int] | None]]:
    im = im.convert("RGBA")
    w, h = im.size
    rows: list[list[tuple[int, int, int] | None]] = []
    for y in range(h):
        row: list[tuple[int, int, int] | None] = []
        for x in range(w):
            r, g, b, a = im.getpixel((x, y))
            if a < 16 or (key and (r, g, b) == key):
                row.append(None)
            else:
                row.append((r, g, b))
        rows.append(row)
    return rows


def merge_rects(rows: list[list[tuple[int, int, int] | None]]) -> list[tuple[int, int, int, int, str]]:
    """Greedy horizontal-run then vertical-merge rectangles."""
    h = len(rows)
    w = len(rows[0]) if h else 0
    used = [[False] * w for _ in range(h)]
    rects: list[tuple[int, int, int, int, str]] = []

    def hex_of(c: tuple[int, int, int]) -> str:
        return f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}"

    for y in range(h):
        x = 0
        while x < w:
            if used[y][x] or rows[y][x] is None:
                x += 1
                continue
            color = rows[y][x]
            run = 1
            while x + run < w and rows[y][x + run] == color and not used[y][x + run]:
                run += 1
            height = 1
            grow = True
            while y + height < h and grow:
                for i in range(run):
                    if used[y + height][x + i] or rows[y + height][x + i] != color:
                        grow = False
                        break
                if grow:
                    height += 1
            for dy in range(height):
                for dx in range(run):
                    used[y + dy][x + dx] = True
            rects.append((x, y, run, height, hex_of(color)))  # type: ignore[arg-type]
            x += run
    return rects


def rows_to_svg(rows: list[list[tuple[int, int, int] | None]], comment: str = "") -> str:
    h = len(rows)
    w = len(rows[0]) if h else 0
    rects = merge_rects(rows)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" shape-rendering="crispEdges">'
    ]
    if comment:
        parts.append(f"  <!-- {comment} -->")
    for x, y, rw, rh, fill in rects:
        parts.append(f'  <rect x="{x}" y="{y}" width="{rw}" height="{rh}" fill="{fill}"/>')
    parts.append("</svg>\n")
    return "\n".join(parts)


def write_svg(path: Path, rows: list[list[tuple[int, int, int] | None]], comment: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(rows_to_svg(rows, comment), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ico-dir", type=Path, help="Directory of wrestool group-icon .ico files")
    ap.add_argument("--bmp-dir", type=Path, help="Directory of wrestool .bmp files")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    if args.ico_dir:
        for ico in sorted(args.ico_dir.glob("*.ico")):
            # napster.exe_14_101.ico
            try:
                gid = int(ico.stem.split("_")[-1])
            except ValueError:
                continue
            name = ICON_NAMES.get(gid, f"icon-{gid}")
            images = parse_ico(ico.read_bytes())
            for img in images:
                h = len(img)
                suffix = f"-{h}" if len(images) > 1 else ""
                dest = out / f"{name}{suffix}.svg"
                write_svg(dest, img, f"napster.exe RT_GROUP_ICON {gid} ({h}×{h})")
                written.append(dest.name)

    if args.bmp_dir and Image is not None:
        for bmp in sorted(args.bmp_dir.glob("*.bmp")):
            try:
                bid = int(bmp.stem.split("_")[-1])
            except ValueError:
                continue
            name = BITMAP_NAMES.get(bid, f"bmp-{bid}")
            im = Image.open(bmp)
            key = (255, 255, 255) if bid in (264, 265, 266, 268) else None
            rows = pil_to_rows(im, key)
            dest = out / f"{name}.svg"
            write_svg(dest, rows, f"napster.exe RT_BITMAP {bid} ({im.size[0]}×{im.size[1]})")
            written.append(dest.name)

    manifest = out / "README.txt"
    manifest.write_text(
        "Pixel-perfect SVGs traced from napster.exe (BETA 10.3) RT_ICON / RT_BITMAP.\n"
        "Icons keep the original 16-color palette and AND-mask transparency.\n"
        "Source executable is not bundled.\n\n"
        + "\n".join(sorted(written))
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(written)} svgs to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
