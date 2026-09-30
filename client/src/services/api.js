const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function api(path, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('agent-console-token') : null;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'The request could not be completed.');
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const apiBaseUrl = baseUrl;