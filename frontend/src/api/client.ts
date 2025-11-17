import axios from 'axios';

const baseURL = import.meta.env.VITE_CORE_SERVICE_URL ?? '/api';

export function createApiClient(accessToken?: string) {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return axios.create({
    baseURL,
    headers,
  });
}
