import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { getStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import { QuestionSkeleton } from '../components/LoadingSkeleton'

type Question = {
  question_id: string
  question_text: string
  choices: Record<string, string>
  difficulty: number
}

type AnswerResult = {
  is_correct: boolean
  correct_answer: string
  explanation: string
}

export default function PracticeSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const user = getStoredUser()
  const [question, setQuestion] = useState<Question | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNext = useCallback(async () => {
    if (!sessionId || !user?.id) return
    setError(null)
    setResult(null)
    setSelected(null)
    setLoading(true)
    try {
      const res = await api.post<Question>('/api/practice/next', { session_id: sessionId, user_id: user.id })
      setQuestion(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load question')
      setQuestion(null)
    } finally {
      setLoading(false)
    }
  }, [sessionId, user?.id])

  useEffect(() => {
    if (sessionId && user?.id) fetchNext()
  }, [sessionId, user?.id])

  async function handleSubmit() {
    if (!sessionId || !user?.id || !question || selected === null) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<AnswerResult>('/api/practice/answer', {
        session_id: sessionId,
        question_id: question.question_id,
        user_answer: selected,
        time_taken_sec: null,
      })
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    setResult(null)
    setQuestion(null)
    fetchNext()
  }

  if (!user) {
    return (
      <div>
        <PageTitle>Practice Session</PageTitle>
        <p className="mt-2 text-gray-600">Please complete setup first.</p>
      </div>
    )
  }

  return (
    <div>
      <PageTitle>Practice Session</PageTitle>
      {error && <p className="mt-2 text-red-600 text-sm mb-4">{error}</p>}
      {loading && !question && !result && <QuestionSkeleton />}
      {question && !result && (
        <>
          <p className="mt-2 text-gray-600 mb-2">Difficulty: {question.difficulty}</p>
          <p className="mb-4">{question.question_text}</p>
          <ul className="space-y-2">
            {Object.entries(question.choices).map(([key, text]) => (
              <li key={key}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="choice"
                    value={key}
                    checked={selected === key}
                    onChange={() => setSelected(key)}
                  />
                  <span>{key}. {text}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button className="mt-4" onClick={handleSubmit} disabled={selected === null || loading}>
            Submit
          </Button>
        </>
      )}
      {result && (
        <>
          <p className={`font-semibold mt-4 ${result.is_correct ? 'text-green-600' : 'text-red-600'}`}>
            {result.is_correct ? 'Correct' : 'Incorrect'}
          </p>
          <p className="mt-2">Correct answer: {result.correct_answer}</p>
          <p className="mt-4 p-4 bg-gray-100 rounded">{result.explanation}</p>
          <Button className="mt-4" onClick={handleNext}>
            Next question
          </Button>
        </>
      )}
    </div>
  )
}
