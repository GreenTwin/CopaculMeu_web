#!/usr/bin/env python3
"""
Builds the "Copernicus tree cover density (10 m)" map layer for Timișoara as XYZ tiles:
  public/layers/copernicus-tcd/{z}/{x}/{y}.png

Source: Copernicus Land Monitoring Service, HRL VLCC Tree Cover Density, 10 m, yearly
(free, attribution required). Download needs a free Copernicus Data Space account:
  https://browser.dataspace.copernicus.eu -> Search -> product name, e.g.
  CLMS_HRLVLCC_TCD_S2024_R10m_E51N25_03035_V01_R00   (2024, tile covering Timișoara)
Pixel values: 0 = no trees, 1-100 = % tree cover, 255 = no data.
Colours follow the official Copernicus legend (yellow -> dark green), made semi-transparent.

Requires GDAL command-line tools on PATH. Only the Python standard library is used. Usage:
  python3 scripts/build-copernicus-tcd-layer.py path/to/CLMS_HRLVLCC_TCD_S2024_...zip
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from raster_tiles import TIMISOARA_BBOX, color_table_xml, run, write_xyz_tiles  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "layers", "copernicus-tcd")

# Official ramp endpoints from the product legend (.clr): 1% = (253,255,115), 100% = (28,92,36)
LOW, HIGH = (253, 255, 115), (28, 92, 36)


def color_for(value):
    if not 1 <= value <= 100:
        return (0, 0, 0, 0)  # 0 = no trees, 255 = no data
    t = (value - 1) / 99
    r, g, b = (round(lo + (hi - lo) * t) for lo, hi in zip(LOW, HIGH))
    alpha = round(90 + 110 * t)  # low-density pixels fainter, so the basemap stays readable
    return (r, g, b, alpha)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("product_zip", help="downloaded CLMS_HRLVLCC_TCD_S<year>_R10m_... .zip (or the .tif)")
    ap.add_argument("--min-zoom", type=int, default=12)
    ap.add_argument("--max-zoom", type=int, default=16)
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as work:
        src = args.product_zip
        if src.lower().endswith(".zip"):
            with zipfile.ZipFile(src) as z:
                name = next(n for n in z.namelist() if re.search(r"TCD_S\d{4}_R10m.*\.tif$", n))
                z.extract(name, work)
            src = os.path.join(work, name)
        year = re.search(r"TCD_S(\d{4})", os.path.basename(src))
        print(f"Source: {os.path.basename(src)} (reference year {year.group(1) if year else '?'})")

        # Reproject the city area to Web Mercator, keeping the original 10 m pixels (nearest)
        clip = os.path.join(work, "clip.tif")
        w, s, e, n = TIMISOARA_BBOX
        run("gdalwarp", "-q", "-te", str(w), str(s), str(e), str(n), "-te_srs", "EPSG:4326",
            "-t_srs", "EPSG:3857", "-r", "near", "-co", "COMPRESS=DEFLATE", src, clip)

        # Attach the colour table via a VRT; pixel values are used directly as palette indexes
        vrt = os.path.join(work, "tcd.vrt")
        run("gdal_translate", "-q", "-of", "VRT", "-a_nodata", "none", clip, vrt)
        text = open(vrt).read()
        text = re.sub(r"<ColorInterp>\w+</ColorInterp>",
                      f"<ColorInterp>Palette</ColorInterp>{color_table_xml([color_for(v) for v in range(256)])}",
                      text)
        text = re.sub(r"<ColorTable>.*?</ColorTable>(?=.*<ColorTable>)", "", text, flags=re.S)
        open(vrt, "w").write(text)

        write_xyz_tiles(vrt, OUT_DIR, TIMISOARA_BBOX, args.min_zoom, args.max_zoom)


if __name__ == "__main__":
    main()
