import type { TrendResponse } from './types';

const API_URL = process.env.API_URL || 'http://localhost:4000';

export type TrendResult =
  | { ok: true; data: TrendResponse }
  | { ok: false; status: number; message: string };

/** Server-side fetch of the public trend data. Never cached: always reflects the latest admin edits. */
export async function fetchTrend(): Promise<TrendResult> {
  try {
    const res = await fetch(`${API_URL}/api/public/revenue-trend`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, message: body?.error?.message || `API error ${res.status}` };
    return { ok: true, data: body as TrendResponse };
  } catch {
    return { ok: false, status: 0, message: `Cannot reach the API at ${API_URL}. Is the backend running?` };
  }
}
