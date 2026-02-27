import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import { useToast } from '../context/ToastContext'

export default function Exam() {
  const navigate = useNavigate()
  const toast = useToast()
  const user = getStoredUser()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    if (!user?.id) {
      toast.addToast('error', 'Please complete setup first.')
      return
    }
    setError(null)
    setStarting(true)
    try {
      const res = await api.post<{ session_id: string }>('/api/exam/start', { user_id: user.id })
      navigate(`/exam/session/${(res as { session_id: string }).session_id}`)
      toast.addToast('success', 'Exam started. Good luck!')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start exam'
      setError(msg)
      toast.addToast('error', msg)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <PageTitle>Full Digital SAT Exam</PageTitle>
      <p className="mt-2 text-gray-600 mb-4">
        4 modules: RW M1 (27 q, 32 min), RW M2 (27 q, 32 min), Math M1 (22 q, 35 min), Math M2 (22 q, 35 min). Total 98 questions.
      </p>
      {!user && (
        <p className="text-amber-600 mb-4">Complete setup first.</p>
      )}
      {user && (
        <Button onClick={handleStart} disabled={starting}>
          {starting ? 'Starting…' : 'Start exam'}
        </Button>
      )}
      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
    </div>
  )
}
