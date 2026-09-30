import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, Command, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function Register() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const session = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      setSession(session); localStorage.setItem('agent-console-token', session.token); router.push('/');
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }

  return <main className="auth-layout"><div className="auth-story"><Link href="/" className="brand-lockup auth-brand"><span className="brand-mark"><Command size={19} /></span><span><b>relay</b><small>AGENT OPERATIONS</small></span></Link><div className="auth-story-copy"><span className="eyebrow">ONE PLACE FOR EVERY RUN</span><h1>Good work<br /><em>in motion.</em></h1><p>Start with a sentence. Shape it into a workflow. Stay close to every outcome.</p><div className="auth-flow"><span>DESCRIBE</span><i /><span>CONNECT</span><i /><span>LAUNCH</span></div></div><div className="auth-story-footer">AGENT AUTOMATION CONSOLE <span>v1.0</span></div></div><section className="auth-form-side"><form className="auth-form" onSubmit={submit}><span className="eyebrow">CREATE YOUR WORKSPACE</span><h2>Get started</h2><p className="auth-subtitle">Your automations will live here.</p><label className="field-label">Full name<span className="input-icon"><UserRound size={16} /><input autoComplete="name" required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" /></span></label><label className="field-label">Work email<span className="input-icon"><Mail size={16} /><input autoComplete="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></span></label><label className="field-label">Password<span className="input-icon"><LockKeyhole size={16} /><input autoComplete="new-password" type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></span></label>{error && <p className="form-error">{error}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Creating workspace...' : 'Create account'}<ArrowRight size={16} /></button><p className="auth-switch">Already using Relay? <Link href="/login">Sign in</Link></p></form><div className="auth-legal">Passwords are hashed before they leave the application server.</div></section></main>;
}
Register.authRoute = '/register';