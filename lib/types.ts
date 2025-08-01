export interface Marker {
  id: string;
  name?: string; // Optional since we're not using it anymore
  percentage: number;
}

export interface LinkRotationConfig {
  originalLink: string;
  markers: Marker[];
  batchSize: number;
  subid?: string;
}

export interface ShortenedLink {
  originalUrl: string;
  shortUrl: string;
  marker: string;
  subid?: string;
  createdAt: string;
}

export interface YourlsApiResponse {
  status: string;
  message: string;
  shorturl?: string;
  url?: string;
  title?: string;
  timestamp?: string;
  ip?: string;
  clicks?: number;
}

export interface YourlsListResponse {
  status: string;
  message: string;
  links?: Record<string, {
    shorturl: string;
    url: string;
    title: string;
    timestamp: string;
    ip: string;
    clicks: number;
  }>;
}

export interface Admin {
  id: string;
  username: string;
  codephrase: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  apiKey?: string;
}

export interface LoginRequest {
  username: string;
  codephrase: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  admin?: Admin;
  token?: string;
} 