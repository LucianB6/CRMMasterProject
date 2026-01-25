'use client';

import { useEffect, useState } from 'react';

import { API_BASE_URL, apiFetchRaw } from '../../lib/api';

type HealthStatus = 'loading' | 'ok' | 'error';

const parseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export default function StatusPage() {
  const [status, setStatus] = useState<HealthStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);

  useEffect(() => {
    const runCheck = async () => {
      setStatus('loading');
      setMessage(null);
      try {
        let response = await apiFetchRaw('/actuator/health');
        if (response.status === 404) {
          response = await apiFetchRaw('/health');
        }
        const body = await parseBody(response);
        if (!response.ok) {
          const detail =
            typeof body === 'string' ? body : JSON.stringify(body ?? {});
          throw new Error(detail || `Status ${response.status}`);
        }
        setPayload(body);
        setStatus('ok');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    void runCheck();
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="font-headline text-2xl">Connection Test</h1>
        <p className="text-muted-foreground">
          API Base URL: <span className="font-mono">{API_BASE_URL}</span>
        </p>
      </header>

      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">Status</div>
        <div className="text-xl font-semibold">
          {status === 'loading' && 'Checking...'}
          {status === 'ok' && 'OK'}
          {status === 'error' && 'ERROR'}
        </div>
        {message && (
          <p className="mt-2 text-sm text-destructive">{message}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">Response</div>
        <pre className="mt-2 overflow-x-auto text-xs">
          {payload ? JSON.stringify(payload, null, 2) : 'No response body.'}
        </pre>
      </div>
    </div>
  );
}
