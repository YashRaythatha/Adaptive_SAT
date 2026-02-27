import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { getStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import { useToast } from '../context/ToastContext'

type Section = 'MATH' | 'RW'

export default function Practice() {
  const navigate = useNavigate()
  const toast = useToast()
  const user = getStoredUser()
  const [section, setSection] = useState<Section>('RW')
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
      const res = await api.post<{ session_id: string }>('/api/practice/start', { user_id: user.id, section })
      navigate(`/practice/session/${(res as { session_id: string }).session_id}`)
      toast.addToast('success', 'Practice started.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start practice'
      setError(msg)
      toast.addToast('error', msg)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <PageTitle>Practice</PageTitle>
      <p className="mt-2 text-gray-600 mb-4">Practice by section. Mastery is updated from practice and from full exam results.</p>
      {!user && (
        <p className="text-amber-600 mb-4">Complete setup to practice.</p>
      )}
      {user && (
        <>
          <label className="block mb-4">
            <span className="text-gray-700 mr-2">Section</span>
            <select
              className="border rounded px-3 py-2"
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
            >
              <option value="RW">Reading & Writing</option>
              <option value="MATH">Math</option>
            </select>
          </label>
          <Button onClick={handleStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start practice'}
          </Button>
        </>
      )}
      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
    </div>
  )
}
