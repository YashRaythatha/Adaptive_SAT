const USER_STORAGE_KEY = 'adaptive_sat_user'

export interface StoredUser {
  id: string
  name: string
  email: string
  has_taken_baseline_exam: boolean
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY)
}
