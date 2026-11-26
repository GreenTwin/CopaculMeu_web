export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'UNCONFIRMED' | 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  treesAdded?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LogoutResponse {
  message?: string;
}
