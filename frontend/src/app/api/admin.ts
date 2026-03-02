// Admin API client — calls backend with X-ADMIN-KEY

import { getBase } from './client';

const ADMIN_KEY_STORAGE = 'admin_key';

export function getAdminKey(): string | null {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string): void {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey(): void {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function hasAdminKey(): boolean {
  return !!getAdminKey();
}

async function adminRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = await getBase();
  const key = getAdminKey();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-ADMIN-KEY': key || '',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      if (j.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
    } catch {
      // use text as-is
    }
    throw new Error(detail || res.statusText);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// Backend response types
interface BackendListResponse {
  total: number;
  skip: number;
  limit: number;
  items: Array<{
    id: string;
    section: string;
    skill_id: string;
    difficulty_llm: number;
    question_text?: string;
    quality_status: string;
    created_at: string | null;
  }>;
}

interface BackendQuestionDetail {
  id: string;
  section: string;
  skill_id: string;
  difficulty_llm: number;
  question_text: string;
  choices_json: Record<string, string> | null;
  correct_answer: string;
  explanation: string | null;
  quality_status: string;
  created_at: string | null;
}

export const adminApi = {
  async listQuestions(
    status?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ items: Array<{
    id: string;
    section: 'MATH' | 'RW';
    skill_id: string;
    difficulty_llm: number;
    quality_status: 'DRAFT' | 'APPROVED' | 'REJECTED';
    created_at?: string;
  }>; total: number; skip: number; limit: number }> {
    const skip = (page - 1) * pageSize;
    const params = new URLSearchParams();
    if (status && status !== 'All') params.set('status', status);
    params.set('skip', String(skip));
    params.set('limit', String(pageSize));
    const data = await adminRequest<BackendListResponse>(
      `/api/admin/questions?${params.toString()}`
    );
    return {
      items: data.items.map((x) => ({
        id: x.id,
        section: x.section as 'MATH' | 'RW',
        skill_id: String(x.skill_id),
        difficulty_llm: x.difficulty_llm,
        quality_status: x.quality_status as 'DRAFT' | 'APPROVED' | 'REJECTED',
        created_at: x.created_at ?? undefined,
      })),
      total: data.total,
      skip: data.skip,
      limit: data.limit,
    };
  },

  async getQuestionDetail(id: string) {
    const q = await adminRequest<BackendQuestionDetail>(
      `/api/admin/questions/${encodeURIComponent(id)}`
    );
    const choices = (q.choices_json || {}) as Record<'A' | 'B' | 'C' | 'D', string>;
    return {
      id: q.id,
      section: q.section as 'MATH' | 'RW',
      skill_id: String(q.skill_id),
      difficulty_llm: q.difficulty_llm,
      quality_status: q.quality_status as 'DRAFT' | 'APPROVED' | 'REJECTED',
      created_at: q.created_at ?? undefined,
      question_text: q.question_text,
      choices,
      correct_answer: q.correct_answer as 'A' | 'B' | 'C' | 'D',
      explanation: q.explanation ?? undefined,
    };
  },

  async setQuestionStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const action = status === 'APPROVED' ? 'approve' : 'reject';
    await adminRequest<{ id: string; quality_status: string }>(
      `/api/admin/questions/${encodeURIComponent(id)}/${action}`,
      { method: 'POST' }
    );
    return { success: true, id, quality_status: status };
  },

  async getQuestionStats(id: string) {
    const s = await adminRequest<{
      question_id: string;
      times_used: number;
      correct_rate: number | null;
      avg_time_taken_sec: number | null;
    }>(`/api/admin/questions/${encodeURIComponent(id)}/stats`);
    return {
      question_id: s.question_id,
      times_used: s.times_used,
      correct_rate: s.correct_rate ?? 0,
      avg_time_taken_sec: s.avg_time_taken_sec ?? 0,
    };
  },
};
