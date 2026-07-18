import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
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

  return {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,
    setAuth: (user, token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },
    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        localStorage.setItem('user', JSON.stringify(newUser));
        return { user: newUser };
      });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
