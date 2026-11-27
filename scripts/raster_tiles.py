"""
Shared helpers for building static XYZ map tiles from a paletted raster with GDAL command-line tools.
Used by build-canopy-height-layer.py and build-copernicus-tcd-layer.py (standard library only).
"""
import hashlib
import math
import os
import shutil
import subprocess
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

ORIGIN = 20037508.342789244  # EPSG:3857 half-world size

# Area covered by the map layers (Timișoara): west, south, east, north (WGS84)
TIMISOARA_BBOX = (21.08, 45.67, 21.38, 45.83)


def run(*args):
    subprocess.run(args, check=True)


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return x, y


def tile_bounds_3857(x, y, z):
    size = 2 * ORIGIN / 2 ** z
    minx = -ORIGIN + x * size
    maxy = ORIGIN - y * size
    return minx, maxy, minx + size, maxy - size  # ulx, uly, lrx, lry


def color_table_xml(colors):
    """colors: list of (r, g, b, a) indexed by pixel value -> VRT <ColorTable> element."""
    entries = "".join(f'<Entry c1="{r}" c2="{g}" c3="{b}" c4="{a}"/>' for r, g, b, a in colors)
    return f"<ColorTable>{entries}</ColorTable>"


def _render_tile(raster, out_dir, z, x, y):
    ulx, uly, lrx, lry = tile_bounds_3857(x, y, z)
    path = os.path.join(out_dir, str(z), str(x), f"{y}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(["gdal_translate", "-q", "-of", "PNG", "-r", "nearest", "-outsize", "256", "256",
                    "-projwin", repr(ulx), repr(uly), repr(lrx), repr(lry), raster, path],
                   check=True, stderr=subprocess.DEVNULL)
    aux = path + ".aux.xml"
    if os.path.exists(aux):
        os.remove(aux)
    return path


def write_xyz_tiles(raster, out_dir, bbox, min_zoom, max_zoom):
    """Render 256px PNG tiles {z}/{x}/{y}.png for bbox from a paletted EPSG:3857 raster.
    Values outside the raster render as palette entry 0, so keep entry 0 transparent.
    Fully transparent tiles are removed."""
    shutil.rmtree(out_dir, ignore_errors=True)
    w, s, e, n = bbox
    jobs = []
    for z in range(min_zoom, max_zoom + 1):
        x0, y0 = lonlat_to_tile(w, n, z)
        x1, y1 = lonlat_to_tile(e, s, z)
        jobs += [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    print(f"Rendering {len(jobs)} tiles...")
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        paths = list(pool.map(lambda j: _render_tile(raster, out_dir, *j), jobs))

    # Fully transparent tiles are byte-identical, so they share the most common hash
    hashes = {p: hashlib.md5(open(p, "rb").read()).hexdigest() for p in paths}
    empty_hash, count = Counter(hashes.values()).most_common(1)[0]
    removed = 0
    for p, h in hashes.items():
        if count > 1 and h == empty_hash:
            os.remove(p)
            removed += 1
    for root, dirs, _ in os.walk(out_dir, topdown=False):
        for d in dirs:
            full = os.path.join(root, d)
            if not os.listdir(full):
                os.rmdir(full)
    print(f"Done: {len(paths) - removed} tiles kept, {removed} empty tiles removed -> {out_dir}")
