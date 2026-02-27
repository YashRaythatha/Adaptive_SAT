import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { getStoredUser, setStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import LoadingSkeleton from '../components/LoadingSkeleton'

type ExamResultData = {
  session_id: string
  rw_total_correct: number
  math_total_correct: number
  rw_scaled: number
  math_scaled: number
  total_scaled: number
}

export default function ExamResult() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const userId = searchParams.get('user_id')
  const [result, setResult] = useState<ExamResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const user = getStoredUser()

  useEffect(() => {
    if (!sessionId || !userId) {
      setLoading(false)
      return
    }
    api.get<ExamResultData>(`/api/exam/result?session_id=${sessionId}&user_id=${userId}`)
      .then((r) => {
        setResult(r)
        if (user?.id === userId) {
          api.get<{ id: string; name: string; email: string; has_taken_baseline_exam: boolean }>(`/api/users/${userId}`)
            .then((u) => setStoredUser(u))
            .catch(() => {})
        }
      })
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [sessionId, userId, user?.id])

  if (loading) {
    return (
      <div>
        <PageTitle>Exam Complete</PageTitle>
        <LoadingSkeleton lines={4} className="mt-4" />
      </div>
    )
  }
  if (!result) {
    return (
      <div>
        <PageTitle>Exam Result</PageTitle>
        <p className="mt-2 text-gray-600">Result not found.</p>
        <Link to="/" className="mt-4 inline-block"><Button variant="secondary">Back to Dashboard</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <PageTitle>Exam Complete</PageTitle>
      <p className="mt-2 text-gray-600 mb-4">Your baseline exam results:</p>
      <div className="grid gap-4 max-w-md p-4 border rounded bg-gray-50">
        <p><strong>RW</strong> (54 questions): {result.rw_total_correct} correct → Scaled: {result.rw_scaled}</p>
        <p><strong>Math</strong> (44 questions): {result.math_total_correct} correct → Scaled: {result.math_scaled}</p>
        <p><strong>Total scaled score:</strong> {result.total_scaled} (400–1600)</p>
      </div>
      <p className="mt-4 text-green-700 font-medium">Baseline exam completed. Practice and weak-area recommendations are now available on the dashboard.</p>
      <div className="mt-6">
        <Link to="/"><Button>Back to Dashboard</Button></Link>
      </div>
    </div>
  )
}
