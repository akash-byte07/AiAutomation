import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { token, user, setUser, clearSession } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    api('/auth/me').then(({ user: currentUser }) => setUser(currentUser)).catch(() => {
      clearSession();
      router.replace('/login');
    }).finally(() => setReady(true));
  }, [clearSession, router, setUser, token]);

  if (!token || !ready || !user) return <div className="boot-screen"><span className="pulse-dot" />Loading workspace</div>;
  return children;
}