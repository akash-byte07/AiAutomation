import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Activity, Bell, Blocks, ChevronDown, Command, LayoutDashboard, LogOut, Menu, Settings2, Workflow, X } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const navigation = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Workflows', href: '/workflows', icon: Workflow },
  { label: 'Executions', href: '/executions', icon: Activity },
  { label: 'Integrations', href: '/integrations', icon: Blocks },
];

export default function AppShell({ children }) {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (noticeOpen) api('/notifications').then((data) => setNotifications(data.notifications)).catch(() => {});
  }, [noticeOpen]);

  function signOut() {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearSession();
    localStorage.removeItem('agent-console-token');
    router.push('/login');
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <Link href="/" className="brand-lockup" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark"><Command size={19} /></span>
          <span><b>relay</b><small>AGENT OPERATIONS</small></span>
        </Link>
        <div className="workspace-switch"><span className="workspace-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</span><span><b>{user?.name || 'Workspace'}</b><small>Personal workspace</small></span><ChevronDown size={15} /></div>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav">
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${router.pathname === href || (href !== '/' && router.pathname.startsWith(href)) ? 'nav-active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Icon size={17} strokeWidth={1.8} />{label}
              {label === 'Executions' && <span className="nav-live" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/settings" className={`nav-link ${router.pathname === '/settings' ? 'nav-active' : ''}`}><Settings2 size={17} strokeWidth={1.8} />Settings</Link>
          <button className="profile-row" onClick={signOut}><span className="profile-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</span><span><b>{user?.name}</b><small>{user?.email}</small></span><LogOut size={16} /></button>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <main className="main-frame">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-divider">/</span><b>{navigation.find((item) => item.href === router.pathname || (item.href !== '/' && router.pathname.startsWith(item.href)))?.label || 'Settings'}</b></div>
          <div className="topbar-tools"><span className="system-health"><i />All systems operational</span><button className={`icon-button notification-trigger ${noticeOpen ? 'selected' : ''}`} aria-label="Open notifications" onClick={() => setNoticeOpen(!noticeOpen)}><Bell size={18} />{notifications.some((item) => !item.read) && <i />}</button><div className="topbar-date">LOCAL WORKSPACE</div></div>
        </header>
        <div className="page-content">{children}</div>
      </main>
      {noticeOpen && <><button className="drawer-scrim" aria-label="Close notifications" onClick={() => setNoticeOpen(false)} /><aside className="notification-drawer"><div className="drawer-heading"><div><span className="eyebrow">INBOX</span><h2>Notifications</h2></div><button className="icon-button" aria-label="Close" onClick={() => setNoticeOpen(false)}><X size={18} /></button></div>{notifications.length ? notifications.map((item) => <article className="notice-item" key={item.id}><span className="notice-mark"><Activity size={15} /></span><div><b>{item.title}</b><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>) : <div className="empty-notices"><Bell size={20} /><p>You’re all caught up.</p></div>}</aside></>}
    </div>
  );
}