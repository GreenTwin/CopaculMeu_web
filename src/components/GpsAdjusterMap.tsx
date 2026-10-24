import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getDistanceMetersPrecise } from '../utils/geo';
import { Navigation, RefreshCw, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface GpsAdjusterMapProps {
  deviceBase: { lat: number; lng: number };
  adjustedPos: { lat: number; lng: number };
  adjustmentMeters: number;
  onPositionChange: (pos: { lat: number; lng: number }, dist: number) => void;
  onRecalibrate: () => void;
  isLocating: boolean;
  gpsStatus: 'locating' | 'acquired' | 'fallback';
  height?: number | string;
}

export const GpsAdjusterMap: React.FC<GpsAdjusterMapProps> = ({
  deviceBase,
  adjustedPos,
  adjustmentMeters,
  onPositionChange,
  onRecalibrate,
  isLocating,
  gpsStatus,
  height,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const baseDotRef = useRef<L.CircleMarker | null>(null);

  // Keep references to latest props to prevent stale closure in Leaflet event callbacks
  const deviceBaseRef = useRef(deviceBase);
  deviceBaseRef.current = deviceBase;

  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  // Track dragging state to prevent React re-renders from fighting Leaflet's Draggable
  const isDraggingRef = useRef(false);

  // Initialize mini-map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Zoom 22 gives an intuitive ~77px diameter for the 1.0m green boundary circle
    const map = L.map(containerRef.current, {
      center: [deviceBase.lat, deviceBase.lng],
      zoom: 22,
      minZoom: 18,
      maxZoom: 22,
      zoomControl: true,
      scrollWheelZoom: false, // Prevent hijacking modal scroll
      dragging: true,
      attributionControl: false,
    });

    // Clean OpenStreetMap tiles with overzooming support (tiles maxNativeZoom 19 upscaled to 22)
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
    }).addTo(map);

    // 1.0-meter boundary circle - clearly visible semi-transparent green circle
    const circle = L.circle([deviceBase.lat, deviceBase.lng], {
      radius: 1.0,
      color: '#059669', // Emerald border
      weight: 2.5,
      dashArray: '6, 6',
      fillColor: '#10b981', // Vibrant emerald
      fillOpacity: 0.32, // Distinct semi-transparent green fill
      className: 'gps-adjustment-circle',
      interactive: false,
    }).addTo(map);
    circleRef.current = circle;

    // Static Blue dot representing exact physical device GPS position
    const baseDot = L.circleMarker([deviceBase.lat, deviceBase.lng], {
      radius: 4,
      color: '#ffffff',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);
    baseDotRef.current = baseDot;

    // Draggable Tree Pin (Teardrop shape pointing directly to marker coordinate)
    const pinIcon = L.divIcon({
      html: `
        <div class="draggable-adjuster-pin" title="Trage pentru a ajusta arborele până la 1 metru">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#047857">
            <path d="M12 2C7.5 2 4 5.5 4 10c0 4.1 2.9 7.5 6.8 8.3V21c0 .6.4 1 1 1h.4c.6 0 1-.4 1-1v-2.7c3.9-.8 6.8-4.2 6.8-8.3 0-4.5-3.5-8-8-8z"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    const marker = L.marker([adjustedPos.lat, adjustedPos.lng], {
      icon: pinIcon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);
    markerRef.current = marker;

    // Smooth clamping during drag via Draggable predrag hook
    // Leaflet calculates _newPos before applying to DOM; clamping it in predrag ensures
    // the pin glides seamlessly along the 1.0m boundary with zero jumps or coordinate conflicts
    const handlePreDrag = () => {
      const draggable = (marker.dragging as any)?._draggable;
      if (!draggable || !draggable._newPos) return;

      const base = deviceBaseRef.current;
      const candLatLng = map.layerPointToLatLng(draggable._newPos);
      const dist = getDistanceMetersPrecise(base.lat, base.lng, candLatLng.lat, candLatLng.lng);

      if (dist > 1.0) {
        const ratio = 1.0 / dist;
        const clampedLat = base.lat + (candLatLng.lat - base.lat) * ratio;
        const clampedLng = base.lng + (candLatLng.lng - base.lng) * ratio;
        draggable._newPos = map.latLngToLayerPoint(L.latLng(clampedLat, clampedLng));
      }
    };

    const handleDragStart = () => {
      isDraggingRef.current = true;
    };

    const handleDrag = () => {
      const base = deviceBaseRef.current;
      const latlng = marker.getLatLng();
      const dist = Math.min(1.0, getDistanceMetersPrecise(base.lat, base.lng, latlng.lat, latlng.lng));
      onPositionChangeRef.current({ lat: latlng.lat, lng: latlng.lng }, dist);
    };

    const handleDragEnd = () => {
      isDraggingRef.current = false;
      const base = deviceBaseRef.current;
      let latlng = marker.getLatLng();
      let dist = getDistanceMetersPrecise(base.lat, base.lng, latlng.lat, latlng.lng);

      if (dist > 1.0) {
        const ratio = 1.0 / dist;
        const clampedLat = base.lat + (latlng.lat - base.lat) * ratio;
        const clampedLng = base.lng + (latlng.lng - base.lng) * ratio;
        latlng = L.latLng(clampedLat, clampedLng);
        dist = 1.0;
        marker.setLatLng(latlng);
      }
      onPositionChangeRef.current({ lat: latlng.lat, lng: latlng.lng }, dist);
    };

    // Also support clicking directly inside or near the circle to adjust the position
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const base = deviceBaseRef.current;
      const cand = e.latlng;
      let dist = getDistanceMetersPrecise(base.lat, base.lng, cand.lat, cand.lng);
      let targetLat = cand.lat;
      let targetLng = cand.lng;

      if (dist > 1.0) {
        const ratio = 1.0 / dist;
        targetLat = base.lat + (cand.lat - base.lat) * ratio;
        targetLng = base.lng + (cand.lng - base.lng) * ratio;
        dist = 1.0;
      }

      marker.setLatLng([targetLat, targetLng]);
      onPositionChangeRef.current({ lat: targetLat, lng: targetLng }, dist);
    };

    marker.on('dragstart', handleDragStart);
    marker.on('drag', handleDrag);
    marker.on('dragend', handleDragEnd);

    const draggable = (marker.dragging as any)?._draggable;
    if (draggable) {
      draggable.on('predrag', handlePreDrag);
    }

    map.on('click', handleMapClick);

    mapRef.current = map;

    // Invalidate size after modal animation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      marker.off('dragstart', handleDragStart);
      marker.off('drag', handleDrag);
      marker.off('dragend', handleDragEnd);
      if (draggable) {
        draggable.off('predrag', handlePreDrag);
      }
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center, circle and base dot when deviceBase changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.panTo([deviceBase.lat, deviceBase.lng], { animate: true });

    if (circleRef.current) {
      circleRef.current.setLatLng([deviceBase.lat, deviceBase.lng]);
    }
    if (baseDotRef.current) {
      baseDotRef.current.setLatLng([deviceBase.lat, deviceBase.lng]);
    }
  }, [deviceBase.lat, deviceBase.lng]);

  // Sync marker position if reset externally (e.g. Reset button or recalibrate)
  // Skip during active user dragging to prevent React fighting Leaflet's Draggable
  useEffect(() => {
    if (isDraggingRef.current) return;

    if (markerRef.current) {
      const current = markerRef.current.getLatLng();
      if (
        Math.abs(current.lat - adjustedPos.lat) > 0.0000001 ||
        Math.abs(current.lng - adjustedPos.lng) > 0.0000001
      ) {
        markerRef.current.setLatLng([adjustedPos.lat, adjustedPos.lng]);
      }
    }
  }, [adjustedPos.lat, adjustedPos.lng]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 60);
    }
  }, [height]);

  const handleReset = () => {
    onPositionChange(deviceBase, 0);
    if (markerRef.current) {
      markerRef.current.setLatLng([deviceBase.lat, deviceBase.lng]);
    }
  };

  return (
    <div className="gps-adjuster-card">
      <div className="gps-adjuster-header">
        <div className="gps-header-left">
          <Navigation size={16} className="gps-pulse-icon" />
          <span className="gps-header-title">{t('gpsAdjuster.headerTitle')}</span>
        </div>

        <div className="gps-header-right">
          <span className={`gps-status-pill status-${gpsStatus}`}>
            {gpsStatus === 'locating'
              ? t('gpsAdjuster.statusLocating')
              : gpsStatus === 'acquired'
              ? t('gpsAdjuster.statusAcquired')
              : t('gpsAdjuster.statusFallback')}
          </span>
          <button
            type="button"
            className="recalibrate-gps-btn"
            onClick={onRecalibrate}
            disabled={isLocating}
            title={t('gpsAdjuster.recalibrateTooltip')}
          >
            <RefreshCw size={13} className={isLocating ? 'rotating' : ''} />
            <span>{t('gpsAdjuster.recalibrateBtn')}</span>
          </button>
        </div>
      </div>

      {/* Mini-map container */}
      <div
        className="gps-minimap-container"
        ref={containerRef}
        style={height ? { height } : undefined}
      />

      {/* Footer with 1-meter meter & reset */}
      <div className="gps-adjuster-footer">
        <div className="adjustment-meter-info">
          <span>{t('gpsAdjuster.fineAdjustment')}</span>
          <strong className={adjustmentMeters >= 0.95 ? 'max-reached' : ''}>
            {adjustmentMeters.toFixed(2)} m
          </strong>
          <span className="limit-hint">{t('gpsAdjuster.maxLimitHint')}</span>
        </div>

        {adjustmentMeters > 0.05 && (
          <button
            type="button"
            className="reset-adjustment-btn"
            onClick={handleReset}
            title={t('gpsAdjuster.resetTooltip')}
          >
            <RotateCcw size={12} />
            <span>{t('gpsAdjuster.resetBtn')}</span>
          </button>
        )}
      </div>

      <div className="gps-adjuster-note">
        <span className="green-circle-indicator" />
        <span>{t('gpsAdjuster.instructionNote')}</span>
      </div>
    </div>
  );
};
