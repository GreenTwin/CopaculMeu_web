import type { TreeResponse } from './tree';
import type { User } from './auth';

export interface TreeRejectRequest {
  reason: string;
}

export interface TreeSpeciesCreateRequest {
  name: string;
  scientificName: string;
  commonName: string;
  aliases?: string;
}

export interface UserPageResponse {
  content: User[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface EmailTemplateResponse {
  id: string;
  name: string;
  subject: string;
  body: string;
  description?: string;
  availablePlaceholders?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplateUpdateRequest {
  subject: string;
  body: string;
  description?: string;
}
