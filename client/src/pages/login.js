import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Command, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const session = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      setSession(session); localStorage.setItem('agent-console-token', session.token); router.push('/');
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }

  return <main className="auth-layout"><div className="auth-story"><Link href="/" className="brand-lockup auth-brand"><span className="brand-mark"><Command size={19} /></span><span><b>relay</b><small>AGENT OPERATIONS</small></span></Link><div className="auth-story-copy"><span className="eyebrow">AUTOMATION, WITH A WATCHFUL EYE</span><h1>Make the busywork<br /><em>move itself.</em></h1><p>Design clear workflows, let agents handle the steps, and keep the whole run in view.</p><div className="auth-flow"><span>PLAN</span><i /><span>EXECUTE</span><i /><span>VERIFY</span></div></div><div className="auth-story-footer">AGENT AUTOMATION CONSOLE <span>v1.0</span></div></div><section className="auth-form-side"><form className="auth-form" onSubmit={submit}><span className="eyebrow">WELCOME BACK</span><h2>Sign in to Relay</h2><p className="auth-subtitle">Pick up where your automations left off.</p><label className="field-label">Work email<span className="input-icon"><Mail size={16} /><input autoComplete="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></span></label><label className="field-label">Password<span className="input-icon"><LockKeyhole size={16} /><input autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>{error && <p className="form-error">{error}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}<ArrowRight size={16} /></button><p className="auth-switch">New to Relay? <Link href="/register">Create an account</Link></p></form><div className="auth-legal">Your workspace is private and encrypted in transit.</div></section></main>;
}
Login.authRoute = '/login';