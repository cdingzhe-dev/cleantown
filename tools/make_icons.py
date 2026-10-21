"""Rasterise the CleanTown app icon (same geometry as icons/icon.svg) to PNG, with no dependencies.

Usage: python tools/make_icons.py icons
"""
import struct
import sys
import zlib
from pathlib import Path

GREEN = (0x0F, 0x51, 0x32)
WHITE = (0xFF, 0xFF, 0xFF)
ORANGE = (0xF0, 0x8A, 0x24)
BODY = [(150, 214), (362, 214), (341, 390), (338.5, 402), (332, 410.5), (323, 415.5), (311, 416.5),
        (201, 416.5), (189, 415.5), (180, 410.5), (173.5, 402), (171, 390)]


def in_rrect(x, y, rx, ry, w, h, r):
    if x < rx or x > rx + w or y < ry or y > ry + h:
        return False
    cx = min(max(x, rx + r), rx + w - r)
    cy = min(max(y, ry + r), ry + h - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def in_poly(x, y, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def colour_at(x, y, maskable):
    """x, y in the 512-unit icon space; returns RGBA."""
    if maskable:
        # Full-bleed background with the artwork scaled into the 80% safe zone.
        bg = True
        x = (x - 256) / 0.8 + 256
        y = (y - 256) / 0.8 + 256 + 12
    else:
        bg = in_rrect(x, y, 0, 0, 512, 512, 112)
    if in_rrect(x, y, 120, 160, 272, 52, 22) or in_rrect(x, y, 214, 126, 84, 40, 16):
        return ORANGE + (255,)
    if in_poly(x, y, BODY):
        return WHITE + (255,)
    return GREEN + (255,) if bg else (0, 0, 0, 0)


def render(size, maskable, ss):
    rows = []
    step = 512 / size
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    cr, cg, cb, ca = colour_at((px + (sx + 0.5) / ss) * step, (py + (sy + 0.5) / ss) * step, maskable)
                    r += cr * ca
                    g += cg * ca
                    b += cb * ca
                    a += ca
            if a:
                row += bytes((round(r / a), round(g / a), round(b / a), round(a / (ss * ss))))
            else:
                row += bytes(4)
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    Path(path).write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "icons")
    out.mkdir(parents=True, exist_ok=True)
    for name, size, maskable, ss in (("icon-192.png", 192, False, 4), ("icon-512.png", 512, False, 3), ("icon-maskable-512.png", 512, True, 3)):
        write_png(out / name, size, render(size, maskable, ss))
        print("wrote", out / name)
