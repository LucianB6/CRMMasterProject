export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not set.');
}

export type ApiErrorShape = {
  status: number;
  message: string;
  body?: string;
};

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  body?: string;

  constructor(status: number, message: string, body?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export const buildUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, API_BASE_URL).toString();
};

const buildErrorMessage = (status: number, bodyText: string) => {
  if (status === 401) return 'Unauthorized (401). Please sign in.';
  if (status === 403) return 'Forbidden (403).';
  if (status === 404) return 'Not Found (404).';
  if (status >= 500) return 'Server error. Please try again later.';
  return bodyText || `Request failed (status ${status}).`;
};

export const apiFetchRaw = async (
  path: string,
  options: RequestInit = {}
) => {
  const url = buildUrl(path);
  const headers = new Headers(options.headers ?? {});
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {}
) => {
  const response = await apiFetchRaw(path, options);
  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, buildErrorMessage(response.status, text), text);
  }
  if (!text) {
    return null as T;
  }
  return JSON.parse(text) as T;
};
