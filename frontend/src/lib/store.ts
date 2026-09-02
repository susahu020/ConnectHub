import { create } from 'zustand';
import type { NotificationPreferences } from '../components/settings/NotificationPreferencesCard';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  customRoleId?: string | null;
  customRoleName?: string;
  permissions?: Record<string, Record<string, boolean>>;
  designation?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  skills: string[];
  status: string;
  departmentId?: string;
  birthday?: string;
  joiningDate?: string;
  createdAt?: string;
  settings?: {
    theme: string;
    language: string;
    pushEnabled: boolean;
    emailEnabled: boolean;
    desktopEnabled: boolean;
    notificationPreferences?: NotificationPreferences;
    hidePhoneInDirectory?: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe SSR checking for window storage
  const getInitialToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const getInitialUser = () => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    }
    return null;
  };

  const initialToken = getInitialToken();
  const initialUser = getInitialUser();

  // Non-secret marker cookie so middleware.ts can redirect signed-out users
  // to /login (and signed-in users away from /login) before the page shell
  // renders, instead of relying solely on a client-side useEffect redirect.
  // This is a UX/defense-in-depth layer only — it carries no token and
  // grants no access by itself; every API call still requires the real
  // Bearer token, and the backend re-checks role/permission on every
  // request regardless of what this cookie says.
  const setSessionCookie = (role: User['role']) => {
    if (typeof document === 'undefined') return;
    document.cookie = `ch_session=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  };
  const clearSessionCookie = () => {
    if (typeof document === 'undefined') return;
    document.cookie = 'ch_session=; path=/; max-age=0; SameSite=Lax';
  };

  return {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,
    setAuth: (user, token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setSessionCookie(user.role);
      set({ user, token, isAuthenticated: true });
    },
    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(newUser));
        if (updatedFields.role) setSessionCookie(newUser.role);
        return { user: newUser };
      });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      clearSessionCookie();
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
