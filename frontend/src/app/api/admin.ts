// Admin API client

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

function getAdminHeaders(): HeadersInit {
  const key = getAdminKey();
  return {
    'Content-Type': 'application/json',
    'X-ADMIN-KEY': key || '',
  };
}

// Mock admin API
export const adminApi = {
  async listQuestions(status?: string, limit: number = 50) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const key = getAdminKey();
    if (!key || key !== 'demo-admin-key') {
      throw new Error('Invalid admin key');
    }

    // Mock data
    const mockQuestions = Array.from({ length: 15 }, (_, i) => ({
      id: `question-${i + 1}-${Math.random().toString(36).substr(2, 9)}`,
      section: i % 2 === 0 ? ('MATH' as const) : ('RW' as const),
      skill_id: `skill-${i % 5}`,
      difficulty_llm: (i % 5) + 1,
      quality_status: (['DRAFT', 'APPROVED', 'REJECTED'][i % 3]) as 'DRAFT' | 'APPROVED' | 'REJECTED',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    if (status && status !== 'All') {
      return mockQuestions.filter((q) => q.quality_status === status);
    }

    return mockQuestions;
  },

  async getQuestionDetail(id: string) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const key = getAdminKey();
    if (!key || key !== 'demo-admin-key') {
      throw new Error('Invalid admin key');
    }

    return {
      id,
      section: 'MATH' as const,
      skill_id: 'algebra-1',
      difficulty_llm: 3,
      quality_status: 'DRAFT' as const,
      created_at: new Date().toISOString(),
      question_text: 'What is the value of x in the equation 2x + 5 = 15?',
      choices: {
        A: 'x = 3',
        B: 'x = 5',
        C: 'x = 10',
        D: 'x = 7.5',
      },
      correct_answer: 'B' as const,
      explanation: 'Subtract 5 from both sides: 2x = 10. Then divide by 2: x = 5.',
    };
  },

  async setQuestionStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const key = getAdminKey();
    if (!key || key !== 'demo-admin-key') {
      throw new Error('Invalid admin key');
    }

    return { success: true, id, quality_status: status };
  },

  async getQuestionStats(id: string) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const key = getAdminKey();
    if (!key || key !== 'demo-admin-key') {
      throw new Error('Invalid admin key');
    }

    return {
      question_id: id,
      times_used: Math.floor(Math.random() * 100) + 10,
      correct_rate: Math.random() * 0.5 + 0.3,
      avg_time_taken_sec: Math.floor(Math.random() * 60) + 30,
    };
  },
};
