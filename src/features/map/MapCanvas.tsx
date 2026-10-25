import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import '@maplibre/maplibre-gl-leaflet';
import Supercluster from 'supercluster';
import type { TreeResponse, BoundingBox } from '../../types/tree';
import { TIMISOARA_DEFAULT_CENTER } from '../../data/mockTrees';
import { openMapTilesTerrainStyle } from '../../styles/openMapTilesTerrainStyle';
import { darkMatterStyle } from '../../styles/darkMatterStyle';
import { useTheme } from '../../context/ThemeContext';

// Register MapLibre Web Worker for Vite background vector tile processing
setWorkerUrl(workerUrl);

interface MapCanvasProps {
  trees: TreeResponse[];
  selectedTree: TreeResponse | null;
  onSelectTree: (tree: TreeResponse | null) => void;
  onBoundsChange: (bounds: BoundingBox) => void;
  userLocation: { lat: number; lng: number } | null;
  flyToCoords?: { lat: number; lng: number; ts: number } | null;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  trees,
  selectedTree,
  onSelectTree,
  onBoundsChange,
  userLocation,
  flyToCoords,
}) => {
  const { theme } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.Layer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const superclusterRef = useRef<Supercluster | null>(null);
  const currentThemeRef = useRef(theme);

  // Initialize Leaflet Map with OpenMapTiles GL Theme (Terrain for Light, Dark Matter for Dark)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [TIMISOARA_DEFAULT_CENTER.lat, TIMISOARA_DEFAULT_CENTER.lng],
      zoom: TIMISOARA_DEFAULT_CENTER.zoom,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false,
    });

    // Zoom control at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial GL style based on current theme
    const activeStyle = currentThemeRef.current === 'dark' ? darkMatterStyle : openMapTilesTerrainStyle;

    // OpenMapTiles GL Layer via MapLibre Leaflet adapter
    const glLayer = (L as any).maplibreGL({
      style: activeStyle,
      padding: 0.15,
    }).addTo(map);
    tileLayerRef.current = glLayer;

    try {
      const libreMap = glLayer.getMaplibreMap();
      if (libreMap) {
        libreMap.on('error', (e: any) => {
          console.warn('[MapLibre Warning]', e);
        });
        libreMap.on('load', () => {
          console.log('[MapLibre] Style loaded successfully');
        });
      }
    } catch (err) {
      console.warn('Could not attach MapLibre listeners:', err);
    }

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    // Handle map movement & zoom
    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      });
      renderClusters();
    };

    map.on('moveend', handleMoveEnd);

    // Initial bounds trigger
    handleMoveEnd();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch MapLibre vector style dynamically when theme changes (Terrain for Light, Dark Matter for Dark)
  useEffect(() => {
    currentThemeRef.current = theme;
    if (!tileLayerRef.current) return;
    try {
      const libreMap = (tileLayerRef.current as any).getMaplibreMap?.();
      if (libreMap) {
        const nextStyle = theme === 'dark' ? darkMatterStyle : openMapTilesTerrainStyle;
        libreMap.setStyle(nextStyle);
      }
    } catch (err) {
      console.warn('Could not switch MapLibre style:', err);
    }
  }, [theme]);
  useEffect(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 17,
    });

    const points: GeoJSON.Feature<GeoJSON.Point, { cluster: boolean; treeId: number; tree: TreeResponse }>[] =
      trees.map((tree) => ({
        type: 'Feature',
        properties: {
          cluster: false,
          treeId: tree.id,
          tree,
        },
        geometry: {
          type: 'Point',
          coordinates: [tree.longitude, tree.latitude],
        },
      }));

    cluster.load(points);
    superclusterRef.current = cluster;
    renderClusters();
  }, [trees, selectedTree]);

  // Render clusters and individual tree markers
  const renderClusters = useCallback(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const cluster = superclusterRef.current;

    if (!map || !markersLayer || !cluster) return;

    markersLayer.clearLayers();

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const zoom = Math.floor(map.getZoom());

    const clusters = cluster.getClusters(bbox, zoom);

    clusters.forEach((item) => {
      const [lng, lat] = item.geometry.coordinates;

      if (item.properties.cluster) {
        // --- Clustered Bubble Marker ---
        const count = item.properties.point_count;
        const clusterId = item.id as number;

        let tierClass = 'cluster-small';
        let size = 38;
        if (count >= 50) {
          tierClass = 'cluster-large';
          size = 54;
        } else if (count >= 10) {
          tierClass = 'cluster-medium';
          size = 46;
        }

        // Clean modern count bubble: purely the number (no confusing icon or 'o' prefix!)
        const clusterIcon = L.divIcon({
          html: `
            <div class="tree-cluster-bubble ${tierClass}">
              <span class="cluster-count-number">${count}</span>
            </div>
          `,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([lat, lng], { icon: clusterIcon });
        marker.on('click', () => {
          const expansionZoom = Math.min(cluster.getClusterExpansionZoom(clusterId), 18);
          map.flyTo([lat, lng], expansionZoom, { duration: 0.65 });
        });
        markersLayer.addLayer(marker);
      } else {
        // --- Individual Tree Marker ---
        const tree = item.properties.tree as TreeResponse;
        const isSelected = selectedTree?.id === tree.id;
        const isCriticalDrought = tree.wateringLevel === 'CRITICAL_DROUGHT';

        const treeIcon = L.divIcon({
          html: `
            <div class="tree-marker-pin pin-health-${tree.healthLevel} ${isSelected ? 'selected' : ''}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C7.5 2 4 5.5 4 10c0 4.1 2.9 7.5 6.8 8.3V21c0 .6.4 1 1 1h.4c.6 0 1-.4 1-1v-2.7c3.9-.8 6.8-4.2 6.8-8.3 0-4.5-3.5-8-8-8z"/>
              </svg>
              ${
                isCriticalDrought
                  ? `
                <div class="water-alert-badge" title="Necesită apă urgent!">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.7l4.5 6.5C18 11.4 19 13.5 19 16c0 3.9-3.1 7-7 7s-7-3.1-7-7c0-2.5 1-4.6 2.5-6.8L12 2.7z"/>
                  </svg>
                </div>`
                  : ''
              }
            </div>
          `,
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([lat, lng], { icon: treeIcon });
        marker.on('click', () => {
          onSelectTree(tree);
          map.panTo([lat, lng], { animate: true, duration: 0.5 });
        });
        markersLayer.addLayer(marker);
      }
    });
  }, [selectedTree, onSelectTree]);

  // Update user GPS location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation) {
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          html: '<div class="user-gps-pulse" title="Locația ta actuală"></div>',
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userLocation]);

  // Fly camera to target coordinates smoothly when requested (initial fix or 'Where am I' click)
  useEffect(() => {
    if (!flyToCoords || !mapRef.current) return;
    const map = mapRef.current;
    const targetZoom = Math.max(map.getZoom(), 16);
    map.flyTo([flyToCoords.lat, flyToCoords.lng], targetZoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [flyToCoords]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
