import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import { QuestionSkeleton } from '../components/LoadingSkeleton'

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

type Question = {
  question_id: string
  question_text: string
  choices: Record<string, string>
  question_order: number
  module_total: number
  section: string
  module_number: number
}

type AnswerResult = { is_correct: boolean; correct_answer: string; explanation: string }

export default function ExamSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const user = getStoredUser()
  const [question, setQuestion] = useState<Question | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moduleLabel, setModuleLabel] = useState('')
  const [noMoreInModule, setNoMoreInModule] = useState(false)

  const fetchTimeRemaining = useCallback(() => {
    if (!sessionId || !user?.id) return
    fetch(`${BASE}/api/exam/time_remaining?session_id=${sessionId}&user_id=${user.id}`)
      .then((r) => r.json())
      .then((d: { seconds_remaining: number | null; expired: boolean }) => {
        setSecondsRemaining(d.seconds_remaining ?? null)
        setExpired(d.expired === true)
      })
      .catch(() => {})
  }, [sessionId, user?.id])

  useEffect(() => {
    if (!sessionId || !user?.id) return
    fetchTimeRemaining()
    const interval = setInterval(fetchTimeRemaining, 1000)
    return () => clearInterval(interval)
  }, [sessionId, user?.id, fetchTimeRemaining])

  const fetchNext = useCallback(() => {
    if (!sessionId) return
    setError(null)
    setResult(null)
    setSelected(null)
    setNoMoreInModule(false)
    setLoading(true)
    api.post<Question>('/api/exam/next', { session_id: sessionId })
      .then((q) => {
        setQuestion(q)
        setModuleLabel(`${q.section} Module ${q.module_number}`)
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('409') || msg.includes('MODULE_TIME_EXPIRED')) {
          setExpired(true)
          setError('Module time expired. Advance to continue.')
        } else if (msg.includes('404') || msg.includes('No more questions')) {
          setError(null)
          setQuestion(null)
          setNoMoreInModule(true)
        } else {
          setError(msg)
          setQuestion(null)
        }
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    if (sessionId) fetchNext()
  }, [sessionId])

  function handleSubmit() {
    if (!sessionId || !user?.id || !question || selected === null) return
    setLoading(true)
    setError(null)
    api.post<AnswerResult>('/api/exam/answer', {
      session_id: sessionId,
      question_id: question.question_id,
      user_answer: selected,
      time_taken_sec: null,
    })
      .then((r) => setResult(r))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('409') || msg.includes('MODULE_TIME_EXPIRED')) {
          setExpired(true)
          setError('Module time expired.')
        } else setError(msg)
      })
      .finally(() => setLoading(false))
  }

  function handleAdvance() {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    setResult(null)
    setQuestion(null)
    setNoMoreInModule(false)
    api.post<{ status: string; message?: string; current_section?: string; current_module?: number }>(
      '/api/exam/advance',
      { session_id: sessionId }
    )
      .then((out) => {
        if (out.status === 'ENDED') {
          navigate(`/exam/result?session_id=${sessionId}&user_id=${user?.id}`)
          return
        }
        fetchNext()
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }

  function handleNextQuestion() {
    setResult(null)
    fetchNext()
  }

  if (!user) {
    return (
      <div>
        <PageTitle>Exam Session</PageTitle>
        <p className="mt-2 text-gray-600">Please complete setup first.</p>
      </div>
    )
  }

  const showAdvance = (result && !question && !loading && !expired) || noMoreInModule

  return (
    <div>
      <PageTitle>Exam — {moduleLabel || 'Loading…'}</PageTitle>
      {secondsRemaining !== null && (
        <p className={`font-mono ${secondsRemaining <= 60 ? 'text-red-600' : ''}`}>
          Time remaining: {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')}
        </p>
      )}
      {expired && (
        <p className="text-red-600 font-semibold mb-4">Module time expired. Click Advance to continue to the next module.</p>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading && !question && !result && <QuestionSkeleton />}
      {question && !result && (
        <>
          <p className="text-gray-600 mb-2">
            Question {question.question_order} of {question.module_total}
          </p>
          <p className="mb-4">{question.question_text}</p>
          <ul className="space-y-2">
            {Object.entries(question.choices).map(([key, text]) => (
              <li key={key}>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="choice"
                    value={key}
                    checked={selected === key}
                    onChange={() => setSelected(key)}
                    disabled={expired}
                  />
                  <span>{key}. {text}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button className="mt-4" onClick={handleSubmit} disabled={selected === null || loading || expired}>
            Submit
          </Button>
        </>
      )}
      {result && (
        <>
          <p className={`font-semibold ${result.is_correct ? 'text-green-600' : 'text-red-600'}`}>
            {result.is_correct ? 'Correct' : 'Incorrect'}
          </p>
          <p className="mt-2">Correct answer: {result.correct_answer}</p>
          <p className="mt-4 p-4 bg-gray-100 rounded">{result.explanation}</p>
          {!expired && (
            <div className="mt-4 flex gap-4">
              <Button onClick={handleNextQuestion}>Next question</Button>
              <Button variant="secondary" onClick={handleAdvance}>Advance to next module</Button>
            </div>
          )}
        </>
      )}
      {showAdvance && !expired && (
        <Button className="mt-4" onClick={handleAdvance}>Advance to next module</Button>
      )}
    </div>
  )
}
