export type HealthLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' | 'DEAD';

export type WateringLevel = 'CRITICAL_DROUGHT' | 'LOW' | 'MODERATE' | 'OPTIMAL' | 'OVERWATERED';

export type TreeStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';

export interface TreeResponse {
  id: number;
  latitude: number;
  longitude: number;
  originalLatitude?: number;
  originalLongitude?: number;
  species: string;
  healthLevel: HealthLevel;
  wateringLevel: WateringLevel;
  lastWateredAt?: string | null;
  height?: number | null;
  age?: number | null;
  trunkCircumference?: number | null;
  locationDescription?: string | null;
  notes?: string | null;
  status: TreeStatus;
  proposedByUserId?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreeCheckinRequest {
  latitude: number;
  longitude: number;
  watered: boolean;
  wateringLevel: WateringLevel;
  proposedSpecies?: string;
  healthLevel?: HealthLevel;
  height?: number;
  age?: number;
  trunkCircumference?: number;
  locationDescription?: string;
  notes?: string;
}

export interface TreeCheckinResponse {
  id: string;
  treeId: number;
  userId?: string;
  latitude: number;
  longitude: number;
  deviationMeters: number;
  valid: boolean;
  wateringLevel: WateringLevel;
  watered: boolean;
  proposedSpecies?: string;
  healthLevel?: HealthLevel;
  height?: number;
  age?: number;
  trunkCircumference?: number;
  locationDescription?: string;
  notes?: string;
  createdAt: string;
  tree?: TreeResponse;
}

export interface TreeCreateRequest {
  latitude: number;
  longitude: number;
  species: string;
  healthLevel: HealthLevel;
  wateringLevel?: WateringLevel;
  lastWateredAt?: string;
  height?: number;
  age?: number;
  trunkCircumference?: number;
  locationDescription?: string;
  notes?: string;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface SpeciesResponse {
  id: number;
  name: string;
  scientificName?: string;
  commonName?: string;
  aliases?: string;
}

