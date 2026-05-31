'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin/crm', label: 'Dashboard', icon: '📊' },
  { href: '/admin/crm/pipeline', label: 'Pipeline', icon: '🔀' },
  { href: '/admin/crm/leads', label: 'Leads', icon: '👥' },
  { href: '/admin/crm/facebook', label: 'Facebook', icon: '📘' },
  { href: '/admin/crm/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/crm/bot-activity', label: 'Bot Activity', icon: '🤖' },
  { href: '/admin/crm/revenue', label: 'Revenue', icon: '💰' },
  { href: '/admin/crm/sms', label: 'SMS', icon: '📱' },
  { href: '/admin/crm/team', label: 'Team', icon: '👔' },
  { href: '/admin/crm/settings', label: 'Settings', icon: '⚙️' },
];

interface User {
  firstName: string;
  lastName: string;
  role: string;
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            if (data.user.role === 'ADMIN' || data.user.role === 'SALES_REP') {
              setUser(data.user);
            } else {
              router.push('/admin');
            }
          } else {
            router.push('/admin');
          }
        } else {
          router.push('/admin');
        }
      } catch {
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="w-64 flex items-center justify-center" style={{ backgroundColor: '#111111' }}>
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const roleLabel = user.role === 'ADMIN' ? 'Admin' : 'Sales Rep';

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col border-r"
        style={{ backgroundColor: '#111111', borderColor: '#1A1A1A' }}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: '#1A1A1A' }}>
          <h1 className="text-xl font-bold" style={{ color: '#E63946' }}>
            RosterRaise
          </h1>
          <p className="text-xs mt-1" style={{ color: '#888888' }}>
            CRM
</p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: isActive ? '#FFFFFF' : '#888888',
                  backgroundColor: isActive ? '#E63946' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#888888';
                  }
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t" style={{ borderColor: '#1A1A1A' }}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>
                {user.firstName} {user.lastName}
              </p>
              <span
                className="inline-block px-2 py-0.5 text-xs rounded"
                style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
              >
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            className="w-full py-2 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: '#1A1A1A', color: '#888888' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E63946';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1A1A1A';
              e.currentTarget.style.color = '#888888';
            }}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/admin');
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
