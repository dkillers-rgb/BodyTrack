import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

/** Base da API BodyTrack (sem /api). Ex.: https://api.bodytrack.com */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (extra.apiUrl as string | undefined) ||
  'https://api.bodytrack.com'
).replace(/\/$/, '');
