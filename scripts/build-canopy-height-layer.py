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
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from raster_tiles import TIMISOARA_BBOX, color_table_xml, run, write_xyz_tiles  # noqa: E402

BASE = "/vsicurl/https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm"
SOURCE_TILES = ["120231330", "120231321"]  # quadkey tiles covering Timișoara
BBOX = TIMISOARA_BBOX
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
    text = text.replace("<ColorInterp>Gray</ColorInterp>",
                        f"<ColorInterp>Palette</ColorInterp>{color_table_xml(COLORS)}")
    text = re.sub(r"<(Simple|Complex)Source>", "<ComplexSource>", text)
    text = re.sub(r"</(Simple|Complex)Source>", f"<LUT>{LUT}</LUT></ComplexSource>", text)
    text = re.sub(r"<NoDataValue>.*?</NoDataValue>", "", text)
    open(cls_vrt, "w").write(text)

    classes = os.path.join(work, "classes.tif")
    run("gdal_translate", "-q", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", cls_vrt, classes)
    run("gdaladdo", "-q", "-r", "mode", classes, "2", "4", "8", "16", "32")
    return classes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-zoom", type=int, default=12)
    ap.add_argument("--max-zoom", type=int, default=17)
    ap.add_argument("--chm", help="reuse an already downloaded/clipped canopy height GeoTIFF (EPSG:3857)")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as work:
        print("Downloading and classifying source raster...")
        classes = build_classified_raster(work, args.chm)
        write_xyz_tiles(classes, OUT_DIR, BBOX, args.min_zoom, args.max_zoom)

if __name__ == "__main__":
    main()
