import { ApiError } from './api';

/** Short human message for page-level error states. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0 || err.code === 'network_error') return 'Cannot reach the API. Is it running?';
    if (err.status === 501) return 'Not implemented on the backend yet.';
    if (err.status === 503) return 'This AI feature is disabled for now.';
    if (err.status === 401) return 'Please sign in again.';
    if (err.status === 404) return 'Not found.';
    if (err.code) return err.code.replace(/_/g, ' ');
    return `Request failed (${err.status}).`;
  }
  return err instanceof Error ? err.message : 'Unexpected error.';
}
