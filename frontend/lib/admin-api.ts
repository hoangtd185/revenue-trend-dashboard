'use client';

import type { AdminDay, AdminWeek, AdminWeekSummary, Paginated } from './types';

/** Mirrors the API error contract: { error: { code, message, details? } } */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string = 'UNKNOWN',
    public details: string[] = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0, 'NETWORK_ERROR');
  }

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    // Session expired or invalid: clear the cookie and go to login, then come back here.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login?next=${next}`;
    throw new ApiError('Session expired', 401, 'UNAUTHORIZED');
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(err.message || `Request failed (${res.status})`, res.status, err.code, err.details || []);
  }
  return body as T;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
}

export type DayInput = Pick<
  AdminDay,
  'dayIndex' | 'posRevenue' | 'eatclubRevenue' | 'labourCost' | 'covers' | 'eventImpact' | 'eventNote'
>;

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ user: AdminUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: AdminUser }>('/auth/me'),
  listWeeks: (page = 1, pageSize = 20) =>
    request<Paginated<AdminWeekSummary>>(`/admin/weeks?page=${page}&pageSize=${pageSize}`),
  getWeek: (id: number) => request<{ week: AdminWeek }>(`/admin/weeks/${id}`),
  createWeek: (weekStart: string, days: DayInput[] = []) =>
    request<{ week: AdminWeek }>('/admin/weeks', { method: 'POST', body: JSON.stringify({ weekStart, days }) }),
  /** Partial update: only the days passed are changed. */
  updateDays: (id: number, days: DayInput[]) =>
    request<{ week: AdminWeek }>(`/admin/weeks/${id}`, { method: 'PATCH', body: JSON.stringify({ days }) }),
  deleteWeek: (id: number) => request<void>(`/admin/weeks/${id}`, { method: 'DELETE' }),
};

/** Human-readable message for any thrown value. */
export const errorMessage = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
