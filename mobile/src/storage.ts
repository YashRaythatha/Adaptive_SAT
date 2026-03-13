import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@adaptive_sat_user';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
}

export async function getUser(): Promise<StoredUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredUser;
    if (parsed?.id && typeof parsed.id === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function setUser(user: StoredUser | null): Promise<void> {
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
}

export async function getUserId(): Promise<string> {
  const user = await getUser();
  return user?.id ?? '';
}
