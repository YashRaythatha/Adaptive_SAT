/**
 * API base URL for the Adaptive SAT backend.
 * - Set EXPO_PUBLIC_API_URL in .env (no trailing slash), e.g.:
 *   EXPO_PUBLIC_API_URL=http://localhost:8000
 *   For Android emulator: http://10.0.2.2:8000
 *   For physical device: http://YOUR_COMPUTER_IP:8000
 * - Default: http://localhost:8000 (works for iOS simulator; for Android use .env).
 */
export function getApiBaseUrl(): string {
  const url = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
  if (url && typeof url === 'string' && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}
