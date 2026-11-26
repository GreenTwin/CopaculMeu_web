#!/usr/bin/env python3
"""
Builds the "Canopy height (1 m)" map layer for Timișoara as XYZ tiles:
  public/layers/canopy-height/{z}/{x}/{y}.png

Source: Meta & WRI Global Canopy Height Map (~1.2 m, imagery ~2018-2019), CC BY 4.0
  https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/
Pixels hold an estimated canopy height in metres. We colour 3 height classes:
  3-10 m, 10-20 m, >20 m (below 3 m is transparent).

Requires GDAL command-line tools (gdalwarp, gdal_translate, gdaladdo) on PATH.
Only the Python standard library is used. Usage:
  python3 scripts/build-canopy-height-layer.py [--min-zoom 12] [--max-zoom 17]
"""
import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

BASE = "/vsicurl/https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm"
SOURCE_TILES = ["120231330", "120231321"]  # quadkey tiles covering Timișoara
BBOX = (21.08, 45.67, 21.38, 45.83)  # west, south, east north (WGS84)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "layers", "canopy-height")

# Height (m) -> class: 0 transparent, 1 = 3-10 m, 2 = 10-20 m, 3 = >20 m
LUT = "0:0,2.5:0,3:1,9.5:1,10:2,19.5:2,20:3,255:3"
# Kept fairly transparent so streets and buildings stay readable underneath
COLORS = [(0, 0, 0, 0), (163, 215, 110, 150), (76, 175, 80, 170), (27, 122, 62, 190)]

# Alignment correction (metres, east / north). The source imagery is offset from the
# OpenStreetMap-based basemap; this was measured by finding the shift that minimises
# canopy pixels falling on building footprints (central Timișoara, Nov 2026):
# ~5-7 m east and ~10 m north. Re-measure if the area or source changes.
SHIFT_EAST_M = 6.0
SHIFT_NORTH_M = 9.6

ORIGIN = 20037508.342789244  # EPSG:3857 half-world size


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


def build_classified_raster(work, cached_chm=None):
    chm = cached_chm or os.path.join(work, "chm.tif")
    if not cached_chm:
        vrt = os.path.join(work, "src.vrt")
        run("gdalbuildvrt", "-q", vrt, *[f"{BASE}/{t}.tif" for t in SOURCE_TILES])
        w, s, e, n = BBOX
        run("gdalwarp", "-q", "-te", str(w), str(s), str(e), str(n), "-te_srs", "EPSG:4326",
            "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", vrt, chm)

    # Apply the alignment correction by moving the raster's georeference (no resampling)
    info = json.loads(subprocess.run(["gdalinfo", "-json", chm], check=True,
                                     capture_output=True, text=True).stdout)
    (ulx, uly), (lrx, lry) = info["cornerCoordinates"]["upperLeft"], info["cornerCoordinates"]["lowerRight"]
    shifted = os.path.join(work, "chm_shifted.vrt")
    run("gdal_translate", "-q", "-of", "VRT", "-a_ullr",
        repr(ulx + SHIFT_EAST_M), repr(uly + SHIFT_NORTH_M),
        repr(lrx + SHIFT_EAST_M), repr(lry + SHIFT_NORTH_M), chm, shifted)
    chm = shifted

    # Classify heights and attach a colour table via a VRT (no numpy needed)
    cls_vrt = os.path.join(work, "classes.vrt")
    run("gdal_translate", "-q", "-of", "VRT", chm, cls_vrt)
    text = open(cls_vrt).read()
    table = "".join(f'<Entry c1="{r}" c2="{g}" c3="{b}" c4="{a}"/>' for r, g, b, a in COLORS)
    text = text.replace("<ColorInterp>Gray</ColorInterp>",
                        f"<ColorInterp>Palette</ColorInterp><ColorTable>{table}</ColorTable>")
    text = re.sub(r"<(Simple|Complex)Source>", "<ComplexSource>", text)
    text = re.sub(r"</(Simple|Complex)Source>", f"<LUT>{LUT}</LUT></ComplexSource>", text)
    text = re.sub(r"<NoDataValue>.*?</NoDataValue>", "", text)
    open(cls_vrt, "w").write(text)

    classes = os.path.join(work, "classes.tif")
    run("gdal_translate", "-q", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", cls_vrt, classes)
    run("gdaladdo", "-q", "-r", "mode", classes, "2", "4", "8", "16", "32")
    return classes


def render_tile(classes, z, x, y):
    ulx, uly, lrx, lry = tile_bounds_3857(x, y, z)
    path = os.path.join(OUT_DIR, str(z), str(x), f"{y}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(["gdal_translate", "-q", "-of", "PNG", "-r", "nearest", "-outsize", "256", "256",
                    "-projwin", repr(ulx), repr(uly), repr(lrx), repr(lry), classes, path],
                   check=True, stderr=subprocess.DEVNULL)
    aux = path + ".aux.xml"
    if os.path.exists(aux):
        os.remove(aux)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-zoom", type=int, default=12)
    ap.add_argument("--max-zoom", type=int, default=17)
    ap.add_argument("--chm", help="reuse an already downloaded/clipped canopy height GeoTIFF (EPSG:3857)")
    args = ap.parse_args()

    shutil.rmtree(OUT_DIR, ignore_errors=True)
    with tempfile.TemporaryDirectory() as work:
        print("Downloading and classifying source raster...")
        classes = build_classified_raster(work, args.chm)

        w, s, e, n = BBOX
        jobs = []
        for z in range(args.min_zoom, args.max_zoom + 1):
            x0, y0 = lonlat_to_tile(w, n, z)
            x1, y1 = lonlat_to_tile(e, s, z)
            jobs += [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
        print(f"Rendering {len(jobs)} tiles...")
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
            paths = list(pool.map(lambda j: render_tile(classes, *j), jobs))

    # Drop fully transparent tiles (they are all byte-identical; the most common hash)
    hashes = {p: hashlib.md5(open(p, "rb").read()).hexdigest() for p in paths}
    empty_hash, count = Counter(hashes.values()).most_common(1)[0]
    removed = 0
    for p, h in hashes.items():
        if count > 1 and h == empty_hash:
            os.remove(p)
            removed += 1
    for root, dirs, _ in os.walk(OUT_DIR, topdown=False):
        for d in dirs:
            full = os.path.join(root, d)
            if not os.listdir(full):
                os.rmdir(full)
    print(f"Done: {len(paths) - removed} tiles kept, {removed} empty tiles removed -> {OUT_DIR}")


if __name__ == "__main__":
    main()
