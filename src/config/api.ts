/**
 * Centralized API & Cloud Sync Configuration
 * Supports Local Development, Cloud Production Endpoint, and Offline Fallback
 */

// Production Cloud Backend URL (configured for Koyeb/Render/Vercel free tier)
export const CLOUD_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://khata-backend.koyeb.app/api';
export const LOCAL_API_URL = 'http://localhost:5000/api';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port } = window.location;
    // Vite local dev server
    if (port === '5173' || port === '3000') {
      return `http://${hostname}:5000/api`;
    }
    // GitHub Pages or Deployed Web domain
    if (hostname.includes('github.io') || hostname.includes('vercel.app')) {
      return CLOUD_API_URL;
    }
  }
  return CLOUD_API_URL;
};
