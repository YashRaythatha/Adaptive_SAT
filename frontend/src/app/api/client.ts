/**
 * API client for Adaptive SAT backend.
 * Uses VITE_API_URL if set, otherwise auto-detects backend on 8000 or 8001.
 */
const CANDIDATES = ['http://127.0.0.1:8000', 'http://127.0.0.1:8001'] as const;

async function canReach(base: string, timeoutMs = 800): Promise<boolean> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/api/health`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(t);
  }
}

let basePromise: Promise<string> | null = null;

export async function getBase(): Promise<string> {
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envBase) return envBase;
  if (!basePromise) {
    basePromise = (async () => {
      for (const base of CANDIDATES) {
        if (await canReach(base)) return base;
      }
      return CANDIDATES[0];
    })();
  }
  return basePromise;
}

function getUserId(): string {
  const user = sessionStorage.getItem('user');
  if (user) {
    const parsed = JSON.parse(user);
    return parsed.id;
  }
  return '';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const base = await getBase();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
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
    throw new ApiError(res.status, detail || res.statusText);
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

async function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

// Backend response shapes
interface UserResponse {
  id: string;
  name: string;
  email: string;
  has_taken_baseline_exam?: boolean;
}

interface ProgressSkillRow {
  skill_id: string;
  skill_name: string;
  section: string;
  mastery_score: number;
}

interface PracticeStartResponse {
  session_id: string;
  section: string;
  skill_id: string;
}

interface PracticeNextResponse {
  question_id: string;
  question_text: string;
  choices: Record<string, string>;
  difficulty: number;
}

interface ExamStartResponse {
  session_id: string;
  current_section: string;
  current_module: number;
  time_limit_sec: number;
}

interface ExamNextResponse {
  question_id: string;
  question_text: string;
  choices: Record<string, string>;
  question_order: number;
  module_total: number;
  section: string;
  module_number: number;
}

interface ExamAdvanceResponse {
  status: 'ACTIVE' | 'ENDED' | 'BREAK';
  current_section?: string;
  current_module?: number;
  time_limit_sec?: number;
  message?: string;
  break_duration_sec?: number;
  break_ends_at?: string;
}

interface SkillsBreakdownItem {
  skill_id: string;
  skill_name: string;
  correct: number;
  total: number;
}

interface ExamResultResponse {
  session_id: string;
  rw_scaled: number;
  math_scaled: number;
  total_scaled: number;
  rw_total_correct?: number;
  math_total_correct?: number;
  domain_breakdown_json: Record<string, number>;
  skills_breakdown?: SkillsBreakdownItem[];
}

export interface ExamReviewQuestion {
  index: number;
  section: string;
  module_number: number;
  question_order: number;
  question_id: string;
  question_text: string;
  choices: Record<string, string>;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  explanation: string | null;
  skill_id: string;
  skill_name: string;
}

export interface ExamHistoryItem {
  session_id: string;
  ended_at: string | null;
  total_scaled: number | null;
  rw_scaled: number | null;
  math_scaled: number | null;
  rw_total_correct: number;
  math_total_correct: number;
}

export interface ExamReviewResponse {
  result: ExamResultResponse;
  analysis: {
    by_module: Array<{ section: string; module: number; correct: number; total: number }>;
    total_correct: number;
    total_questions: number;
  };
  questions: ExamReviewQuestion[];
}

export const api = {
  async createUser(name: string, email: string) {
    const u = await post<UserResponse>('/api/users', { name, email });
    return { id: String(u.id), name: u.name, email: u.email };
  },

  async getSkills() {
    const userId = getUserId();
    if (!userId) return [];
    const rows = await get<ProgressSkillRow[]>(`/api/progress/skills?user_id=${encodeURIComponent(userId)}`);
    return rows.map((r) => ({
      skill_id: r.skill_id,
      section: r.section as 'MATH' | 'RW',
      skill_name: r.skill_name,
      mastery_level: r.mastery_score,
      last_seen: undefined,
    }));
  },

  async startPractice(section: 'MATH' | 'RW') {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    const data = await post<PracticeStartResponse>('/api/practice/start', {
      user_id: userId,
      section,
      domain: null,
    });
    return {
      session_id: String(data.session_id),
      section: data.section as 'MATH' | 'RW',
      current_question_index: 0,
    };
  },

  /** Get the next practice question (backend returns one at a time). Returns null when no more questions. */
  async getNextPracticeQuestion(sessionId: string) {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    try {
      const data = await post<PracticeNextResponse>('/api/practice/next', {
        session_id: sessionId,
        user_id: userId,
      });
      return {
        question_id: String(data.question_id),
        question_text: data.question_text,
        choices: data.choices as Record<'A' | 'B' | 'C' | 'D', string>,
        correct_answer: 'A' as const, // backend does not return correct_answer in next
        difficulty: data.difficulty,
        section: 'MATH' as const, // section comes from session
        skill_id: '',
      };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  /** Kept for compatibility; use getNextPracticeQuestion for real backend. Index 0 only. */
  async getPracticeQuestion(sessionId: string, _index: number) {
    const q = await this.getNextPracticeQuestion(sessionId);
    if (!q) throw new ApiError(404, 'No more questions');
    return q;
  },

  async submitPracticeAnswer(
    sessionId: string,
    questionId: string,
    answer: 'A' | 'B' | 'C' | 'D'
  ) {
    const data = await post<{ is_correct: boolean; correct_answer: string; explanation: string }>(
      '/api/practice/answer',
      {
        session_id: sessionId,
        question_id: questionId,
        user_answer: answer,
        time_taken_sec: null,
      }
    );
    return {
      is_correct: data.is_correct,
      correct_answer: data.correct_answer as 'A' | 'B' | 'C' | 'D',
      explanation: data.explanation ?? '',
    };
  },

  async endPractice(sessionId: string) {
    await post('/api/practice/end', { session_id: sessionId });
    return {
      score: 0,
      total_questions: 0,
      skills_worked: [] as string[],
    };
  },

  async startExam() {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    const data = await post<ExamStartResponse>('/api/exam/start', { user_id: userId });
    return {
      session_id: String(data.session_id),
      current_section: data.current_section as 'RW' | 'MATH',
      current_module: data.current_module,
    };
  },

  /** Get next exam question for current module. Returns null when no more in module. */
  async getNextExamQuestion(sessionId: string): Promise<{
    question_id: string;
    question_text: string;
    choices: Record<'A' | 'B' | 'C' | 'D', string>;
    correct_answer: 'A' | 'B' | 'C' | 'D';
    difficulty: number;
    section: 'MATH' | 'RW';
    skill_id: string;
    question_order: number;
    module_total: number;
  } | null> {
    try {
      const data = await post<ExamNextResponse>('/api/exam/next', { session_id: sessionId });
      return {
        question_id: String(data.question_id),
        question_text: data.question_text,
        choices: data.choices as Record<'A' | 'B' | 'C' | 'D', string>,
        correct_answer: 'A' as const,
        difficulty: 0,
        section: data.section as 'MATH' | 'RW',
        skill_id: '',
        question_order: data.question_order,
        module_total: data.module_total,
      };
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 409)) return null;
      throw e;
    }
  },

  /** Kept for compatibility; delegates to getNextExamQuestion. */
  async getExamQuestion(_sessionId: string, _section: string, _module: number, _index: number) {
    const q = await this.getNextExamQuestion(_sessionId);
    if (!q) throw new ApiError(404, 'No more questions');
    return {
      question_id: q.question_id,
      question_text: q.question_text,
      choices: q.choices,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      section: q.section,
      skill_id: q.skill_id,
    };
  },

  async submitExamAnswer(sessionId: string, questionId: string, answer: 'A' | 'B' | 'C' | 'D') {
    await post('/api/exam/answer', {
      session_id: sessionId,
      question_id: questionId,
      user_answer: answer,
      time_taken_sec: null,
    });
    return { success: true };
  },

  /** Advance to next module. Returns { status: 'ACTIVE', ... } or { status: 'ENDED', message }. */
  async advanceExam(sessionId: string) {
    const data = await post<ExamAdvanceResponse>('/api/exam/advance', { session_id: sessionId });
    return data;
  },

  async endExam(sessionId: string) {
    // Advance until ENDED (skip BREAK by advancing again to reach ACTIVE then ENDED)
    let advance = await this.advanceExam(sessionId);
    while (advance.status === 'ACTIVE' || advance.status === 'BREAK') {
      advance = await this.advanceExam(sessionId);
    }
    return this.getExamResult(sessionId);
  },

  async getExamResult(sessionId: string) {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    const r = await get<ExamResultResponse>(
      `/api/exam/result?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`
    );
    const totalCorrect = (r.rw_total_correct ?? 0) + (r.math_total_correct ?? 0);
    const totalQuestions = 54 + 44; // RW + Math
    const skills_breakdown = (r.skills_breakdown ?? []).map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      correct: s.correct,
      total: s.total,
    }));
    return {
      session_id: r.session_id,
      total_score: r.total_scaled,
      math_score: r.math_scaled,
      rw_score: r.rw_scaled,
      total_questions: totalQuestions,
      correct_answers: totalCorrect,
      skills_breakdown,
    };
  },

  /** Get weakest areas from latest exam (for post-exam "practice these" recommendations). */
  async getWeakAreas(topN = 5): Promise<Array<{ skill_id: string; skill_name: string; section: string; score_from_exam: number }>> {
    const userId = getUserId();
    if (!userId) return [];
    const list = await get<Array<{ skill_id: string; skill_name: string; section: string; score_from_exam: number }>>(
      `/api/exam/weak_areas?user_id=${encodeURIComponent(userId)}&top_n=${topN}`
    );
    return list;
  },

  /** Get seconds remaining for the current exam module. */
  async getExamTimeRemaining(sessionId: string): Promise<{ seconds_remaining: number | null; expired: boolean }> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    const r = await get<{ session_id: string; seconds_remaining: number | null; expired: boolean }>(
      `/api/exam/time_remaining?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`
    );
    return { seconds_remaining: r.seconds_remaining, expired: r.expired };
  },

  /** List past completed exams (for history page). Newest first. */
  async getExamHistory(limit = 50): Promise<ExamHistoryItem[]> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    return get<ExamHistoryItem[]>(
      `/api/exam/history?user_id=${encodeURIComponent(userId)}&limit=${limit}`
    );
  },

  /** Get detailed analysis and full review of all 98 questions for a completed exam. */
  async getExamReview(sessionId: string): Promise<ExamReviewResponse> {
    const userId = getUserId();
    if (!userId) throw new ApiError(401, 'Not logged in');
    return get<ExamReviewResponse>(
      `/api/exam/review?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`
    );
  },
};
