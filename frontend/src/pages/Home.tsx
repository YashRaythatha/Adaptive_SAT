import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { getStoredUser, setStoredUser, type StoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import Button from '../components/Button'
import LoadingSkeleton from '../components/LoadingSkeleton'

type WeakArea = { skill_id: string; skill_name: string; section: string; domain: string; score_from_exam: number }

export default function Home() {
  const [user, setUser] = useState<StoredUser | null>(null)
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) {
      setUser(null)
      setLoading(false)
      return
    }
    api.get<StoredUser>(`/api/users/${stored.id}`)
      .then((u) => {
        setStoredUser(u)
        setUser(u)
        if (u.has_taken_baseline_exam) {
          return api.get<WeakArea[]>(`/api/exam/weak_areas?user_id=${u.id}&top_n=5`)
        }
        return []
      })
      .then((areas) => setWeakAreas(Array.isArray(areas) ? areas : []))
      .catch(() => setUser(stored))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <PageTitle>Dashboard</PageTitle>
        <LoadingSkeleton lines={4} className="mt-4" />
      </div>
    )
  }

  if (!user) {
    return (
      <div>
        <PageTitle>Adaptive SAT</PageTitle>
        <p className="mt-2 text-gray-600">Complete setup to get started.</p>
        <div className="mt-4">
          <Link to="/setup"><Button>Go to Setup</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>
      <p className="mt-2 text-gray-600">Welcome, {user.name}.</p>

      {!user.has_taken_baseline_exam ? (
        <div className="mt-6 p-4 border rounded bg-amber-50">
          <p className="font-semibold text-amber-800 mb-2">Complete the baseline exam first to unlock practice and see weak areas.</p>
          <Link to="/exam"><Button>Start Full Exam</Button></Link>
          <p className="mt-2 text-sm text-gray-600">Practice and weak-area recommendations are available after the exam.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-4">
            <Link to="/exam"><Button variant="primary">Full Exam</Button></Link>
            <Link to="/practice"><Button variant="secondary">Practice</Button></Link>
          </div>
          {weakAreas.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Recommended: practice these weak areas</h2>
              <ul className="list-disc pl-6 space-y-1">
                {weakAreas.map((a) => (
                  <li key={a.skill_id} className="text-gray-700">
                    <span>{a.skill_name}</span> ({a.section}, score: {a.score_from_exam}%)
                    <Link to={`/practice?domain=${a.domain}`} className="ml-2 text-blue-600 hover:underline">Practice this area</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-6 p-4 border rounded bg-gray-50 text-gray-600">
              <p className="font-medium">No weak areas to show yet.</p>
              <p className="text-sm mt-1">Complete more practice or retake the exam to see recommended skills.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
