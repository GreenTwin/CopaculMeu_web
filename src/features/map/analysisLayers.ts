import type L from 'leaflet';

// Optional analysis overlays shown in the map's layers control (off by default).
// Tiles are static files in public/layers/, built by the scripts in scripts/.

const TIMISOARA_LAYER_BOUNDS: L.LatLngBoundsExpression = [
  [45.67, 21.08],
  [45.83, 21.38],
];

export interface AnalysisLayerDef {
  id: string;
  /** translation keys */
  labelKey: string;
  legendTitleKey: string;
  legendDateKey: string;
  tilesUrl: string;
  bounds: L.LatLngBoundsExpression;
  maxNativeZoom: number;
  attribution: string;
  legend: { color: string; label: string }[];
}

export const ANALYSIS_LAYERS: AnalysisLayerDef[] = [
  {
    // Meta & WRI Global Canopy Height Map (~1.2 m, imagery 2018–2019).
    // Built by scripts/build-canopy-height-layer.py
    id: 'canopy-height',
    labelKey: 'mapControls.treeCoverLayer',
    legendTitleKey: 'mapControls.canopyLegendTitle',
    legendDateKey: 'mapControls.canopyLegendDate',
    tilesUrl: '/layers/canopy-height/{z}/{x}/{y}.png',
    bounds: TIMISOARA_LAYER_BOUNDS,
    maxNativeZoom: 17,
    attribution: 'Canopy height (imagery 2018–2019) © Meta &amp; World Resources Institute (CC BY 4.0)',
    legend: [
      { color: 'rgb(163, 215, 110)', label: '3–10 m' },
      { color: 'rgb(76, 175, 80)', label: '10–20 m' },
      { color: 'rgb(27, 122, 62)', label: '> 20 m' },
    ],
  },
  {
    // Copernicus HRL VLCC Tree Cover Density, 10 m, reference year 2024 (official EU indicator source).
    // Built by scripts/build-copernicus-tcd-layer.py
    id: 'copernicus-tcd',
    labelKey: 'mapControls.copernicusTcdLayer',
    legendTitleKey: 'mapControls.copernicusTcdLegendTitle',
    legendDateKey: 'mapControls.copernicusTcdLegendDate',
    tilesUrl: '/layers/copernicus-tcd/{z}/{x}/{y}.png',
    bounds: TIMISOARA_LAYER_BOUNDS,
    maxNativeZoom: 16,
    attribution:
      'Tree Cover Density 2024 © European Union, Copernicus Land Monitoring Service, European Environment Agency (EEA)',
    legend: [
      { color: 'rgb(221, 232, 104)', label: '1–30%' },
      { color: 'rgb(142, 174, 76)', label: '30–70%' },
      { color: 'rgb(62, 117, 48)', label: '70–100%' },
    ],
  },
];
