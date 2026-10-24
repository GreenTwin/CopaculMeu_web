import React, { useState, useCallback, useMemo, useRef } from 'react';
import { MapCanvas } from './features/map/MapCanvas';
import { Header } from './components/Header';
import { MapControls } from './components/MapControls';
import { TreeDrawer } from './features/tree-details/TreeDrawer';
import { ProposeTreeModal } from './components/ProposeTreeModal';
import { SettingsModal } from './components/SettingsModal';
import {
  fetchTreesInArea,
  submitTreeCheckin,
  proposeNewTree,
  ApiStatus,
} from './services/api';
import type { TreeResponse, BoundingBox, TreeCheckinRequest, TreeCreateRequest } from './types/tree';
import { TIMISOARA_DEFAULT_CENTER } from './data/mockTrees';
import type { AppConfig } from './services/config';

export const App: React.FC = () => {
  const [trees, setTrees] = useState<TreeResponse[]>([]);
  const [selectedTree, setSelectedTree] = useState<TreeResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDroughtOnly, setFilterDroughtOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const debounceTimeoutRef = useRef<number | null>(null);
  const currentBoundsRef = useRef<BoundingBox | null>(null);

  // Viewport bounds change handler (debounced)
  const handleBoundsChange = useCallback((bounds: BoundingBox) => {
    currentBoundsRef.current = bounds;
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      const result = await fetchTreesInArea(bounds);
      setTrees(result.trees);
      setApiStatus(result.status);
    }, 300);
  }, []);

  // Reload data when config (Demo / Live host) changes
  const handleConfigChanged = useCallback(async (_newConfig: AppConfig) => {
    if (currentBoundsRef.current) {
      const result = await fetchTreesInArea(currentBoundsRef.current);
      setTrees(result.trees);
      setApiStatus(result.status);
    }
  }, []);

  // HTML5 Geolocation tracking
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocația nu este suportată de acest browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setUserLocation({
          lat: 45.7537,
          lng: 21.2257,
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Simulate user standing right next to selected tree for rapid testing of check-in
  const handleSimulateNearby = (tree: TreeResponse) => {
    // 0.00001 degrees is ~1.1 meters
    setUserLocation({
      lat: tree.latitude + 0.00001,
      lng: tree.longitude + 0.00001,
    });
  };

  // Check-in submission
  const handleCheckinSubmit = async (treeId: number, data: TreeCheckinRequest) => {
    const res = await submitTreeCheckin(treeId, data);
    if (res.tree) {
      setSelectedTree(res.tree);
      setTrees((prev) => prev.map((t) => (t.id === treeId ? res.tree! : t)));
    }
  };

  // Propose new tree submission
  const handleProposeSubmit = async (data: TreeCreateRequest) => {
    const newTree = await proposeNewTree(data);
    setTrees((prev) => [newTree, ...prev]);
    setSelectedTree(newTree);
  };

  // Filter trees based on search query and drought alert toggle
  const filteredTrees = useMemo(() => {
    return trees.filter((tree) => {
      // Drought alert filter
      if (
        filterDroughtOnly &&
        tree.wateringLevel !== 'CRITICAL_DROUGHT' &&
        tree.wateringLevel !== 'LOW'
      ) {
        return false;
      }

      // Search query filter (species, notes, or location)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSpecies = tree.species.toLowerCase().includes(q);
        const matchesLocation = tree.locationDescription?.toLowerCase().includes(q);
        const matchesNotes = tree.notes?.toLowerCase().includes(q);
        return matchesSpecies || matchesLocation || matchesNotes;
      }

      return true;
    });
  }, [trees, searchQuery, filterDroughtOnly]);

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        apiStatus={apiStatus}
        onOpenProposeModal={() => setIsProposeOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        totalVisibleTrees={filteredTrees.length}
      />

      {/* Main Map with clean cluster bubbles */}
      <MapCanvas
        trees={filteredTrees}
        selectedTree={selectedTree}
        onSelectTree={setSelectedTree}
        onBoundsChange={handleBoundsChange}
        userLocation={userLocation}
      />

      {/* Floating HUD Controls */}
      <MapControls
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        filterDroughtOnly={filterDroughtOnly}
        onToggleDroughtFilter={() => setFilterDroughtOnly(!filterDroughtOnly)}
      />

      {/* Tree Details Drawer & Check-in Flow */}
      <TreeDrawer
        tree={selectedTree}
        onClose={() => setSelectedTree(null)}
        userLocation={userLocation}
        onSubmitCheckin={handleCheckinSubmit}
        onSimulateNearby={handleSimulateNearby}
      />

      {/* Propose Tree Modal */}
      <ProposeTreeModal
        isOpen={isProposeOpen}
        onClose={() => setIsProposeOpen(false)}
        defaultCoords={userLocation || { lat: TIMISOARA_DEFAULT_CENTER.lat, lng: TIMISOARA_DEFAULT_CENTER.lng }}
        onSubmit={handleProposeSubmit}
      />

      {/* Settings Modal (Demo vs Live Backend & Host configuration) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChanged={handleConfigChanged}
      />
    </div>
  );
};

export default App;
