export type EventImpact = 'positive' | 'negative' | null;

export interface DayValues {
  posRevenue: number;
  eatclubRevenue: number;
  labourCost: number;
  covers: number;
}

export interface TrendDay extends DayValues {
  dayIndex: number;
  label: string;
  eventImpact: EventImpact;
  eventNote: string | null;
  previous: DayValues | null;
}

export interface SummaryValues {
  totalRevenue: number;
  averagePerDay: number;
  totalCovers: number;
  totalLabour: number;
}

export interface TrendResponse {
  week: { id: number; weekStart: string; updatedAt: string };
  previousWeek: { id: number; weekStart: string } | null;
  days: TrendDay[];
  summary: {
    current: SummaryValues;
    previous: SummaryValues | null;
    change: { totalRevenue: number | null; averagePerDay: number | null; totalCovers: number | null } | null;
  };
}

export interface AdminDay extends DayValues {
  dayIndex: number;
  label: string;
  eventImpact: EventImpact;
  eventNote: string | null;
}

export interface AdminWeekSummary {
  id: number;
  weekStart: string;
  updatedAt: string;
  totalRevenue: number;
  totalCovers: number;
}

export interface AdminWeek {
  id: number;
  weekStart: string;
  createdAt: string;
  updatedAt: string;
  days: AdminDay[];
  summary: SummaryValues;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
