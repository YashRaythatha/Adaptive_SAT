import { useState, useEffect } from 'react'
import { getStoredUser } from '../lib/user'
import PageTitle from '../components/PageTitle'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { api } from '../api/client'

type SkillState = { skill_name: string; section: string; mastery_score: number }

export default function Progress() {
  const user = getStoredUser()
  const [skills, setSkills] = useState<SkillState[]>([])
  const [loading, setLoading] = useState(!!user?.id)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    api.get<SkillState[]>(`/api/progress/skills?user_id=${user.id}`)
      .then((r) => setSkills(Array.isArray(r) ? r : []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  if (!user) {
    return (
      <div>
        <PageTitle>Progress</PageTitle>
        <div className="mt-6 p-4 border rounded bg-gray-50 text-gray-600">
          <p className="font-medium">No progress data yet.</p>
          <p className="text-sm mt-1">Complete setup and practice or take the exam to see skills and mastery here.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <PageTitle>Progress</PageTitle>
        <LoadingSkeleton lines={5} className="mt-4" />
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <div>
        <PageTitle>Progress</PageTitle>
        <p className="mt-2 text-gray-600">Skills and mastery overview.</p>
        <div className="mt-6 p-4 border rounded bg-gray-50 text-gray-600">
          <p className="font-medium">No skill data yet.</p>
          <p className="text-sm mt-1">Practice or complete the baseline exam to populate mastery scores.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageTitle>Progress</PageTitle>
      <p className="mt-2 text-gray-600 mb-4">Skills and mastery overview.</p>
      <ul className="space-y-2">
        {skills.map((s, i) => (
          <li key={i} className="flex justify-between py-2 border-b">
            <span>{s.skill_name}</span>
            <span className="text-gray-600">Mastery: {s.mastery_score}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
