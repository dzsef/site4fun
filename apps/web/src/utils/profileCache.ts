import type { ProfileResponse } from '../types/profile';

export const PROFILE_CACHE_KEY = 'profile:last';
export const PROFILE_CACHE_EVENT = 'profile-cache-updated';

type CachePayload = ProfileResponse | null;

const safeParse = (value: string | null): CachePayload => {
  if (!value) return null;
  try {
    return JSON.parse(value) as ProfileResponse;
  } catch (error) {
    console.warn('Failed to parse cached profile payload', error);
    return null;
  }
};

export const readProfileCache = (): CachePayload => {
  if (typeof window === 'undefined') return null;
  return safeParse(window.localStorage.getItem(PROFILE_CACHE_KEY));
};

export const writeProfileCache = (payload: ProfileResponse): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist profile payload', error);
  }
  window.dispatchEvent(
    new CustomEvent<CachePayload>(PROFILE_CACHE_EVENT, { detail: payload }),
  );
};

export const clearProfileCache = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PROFILE_CACHE_KEY);
  window.dispatchEvent(
    new CustomEvent<CachePayload>(PROFILE_CACHE_EVENT, { detail: null }),
  );
};
