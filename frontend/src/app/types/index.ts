// Core types for the Adaptive SAT application

export type Section = "MATH" | "RW";

export type QualityStatus = "DRAFT" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Skill {
  skill_id: string;
  section: Section;
  skill_name: string;
  mastery_level: number; // 0-100
  last_seen?: string;
}

export interface Question {
  question_id: string;
  question_text: string;
  choices: Record<"A" | "B" | "C" | "D", string>;
  correct_answer: "A" | "B" | "C" | "D";
  difficulty: number;
  section: Section;
  skill_id: string;
}

export interface SessionQuestion extends Question {
  user_answer?: "A" | "B" | "C" | "D";
  is_correct?: boolean;
}

export interface PracticeSession {
  session_id: string;
  user_id: string;
  section: Section;
  questions: SessionQuestion[];
  current_question_index: number;
  score: number;
  total_questions: number;
  skills_worked: string[];
}

export interface ExamSession {
  session_id: string;
  user_id: string;
  current_section: Section;
  current_module: number;
  questions: SessionQuestion[];
  current_question_index: number;
  total_score: number;
  ended_at?: string;
}

export interface ExamResult {
  session_id: string;
  total_score: number;
  math_score: number;
  rw_score: number;
  total_questions: number;
  correct_answers: number;
  skills_breakdown: Array<{
    skill_id: string;
    skill_name: string;
    correct: number;
    total: number;
  }>;
}

export interface AdminQuestion {
  id: string;
  section: Section;
  skill_id: string;
  difficulty_llm: number;
  quality_status: QualityStatus;
  created_at?: string;
}

export interface AdminQuestionDetail extends AdminQuestion {
  question_text: string;
  choices: Record<"A" | "B" | "C" | "D", string>;
  correct_answer: "A" | "B" | "C" | "D";
  explanation?: string;
}

export interface QuestionStats {
  question_id: string;
  times_used: number;
  correct_rate: number;
  avg_time_taken_sec: number;
}