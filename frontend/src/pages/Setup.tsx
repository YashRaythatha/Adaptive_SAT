import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { setStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import { useToast } from '../context/ToastContext'

export default function Setup() {
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await api.post<{ id: string; name: string; email: string; has_taken_baseline_exam: boolean }>(
        '/api/users',
        { name, email }
      )
      setStoredUser({
        id: user.id,
        name: user.name,
        email: user.email,
        has_taken_baseline_exam: user.has_taken_baseline_exam,
      })
      toast.addToast('success', 'Account created. Welcome!')
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      toast.addToast('error', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageTitle>Setup</PageTitle>
      <p className="mt-2 text-gray-600 mb-4">Create your account. Your progress is stored locally.</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <label className="block">
          <span className="text-gray-700">Name</span>
          <input
            type="text"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            className="mt-1 block w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </div>
  )
}
