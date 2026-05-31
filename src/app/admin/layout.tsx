'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Login page doesn't need admin check
    if (pathname === '/admin') {
      setLoading(false);
      return;
    }

    // CRM routes have their own auth handling in their layout
    if (pathname.startsWith('/admin/crm')) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/admin');
          return;
        }
        const data = await res.json();
        if (!data.user) {
          router.push('/admin');
          return;
        }
        // ADMIN or SALES_REP can access store admin
        if (data.user.role === 'ADMIN' || data.user.role === 'SALES_REP') {
          setUser(data.user);
        } else if (data.user.role === 'COACH') {
          router.push('/coach/demo-team');
        } else if (data.user.role === 'PARENT') {
          router.push('/store/demo-team');
        } else {
          router.push('/admin');
        }
      } catch {
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Login page - no sidebar
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  // No user or not admin
  if (!user) {
    return null;
  }

  const navItems = [
    { href: '/admin/overview', label: 'Overview', icon: '📊' },
    { href: '/admin/teams', label: 'Teams', icon: '👥' },
    { href: '/admin/orders', label: 'Orders', icon: '📦' },
    { href: '/admin/partners', label: 'Partners', icon: '🤝' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin');
    } catch {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col border-r"
        style={{ backgroundColor: '#111111', borderColor: '#222222' }}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: '#222222' }}>
          <h1 className="text-xl font-bold" style={{ color: '#E63946' }}>
            RosterRaise
          </h1>
          <p className="text-sm text-gray-500 mt-1">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: isActive ? '#E63946' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#888888',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
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
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t" style={{ borderColor: '#222222' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
            >
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm rounded-lg transition-colors"
            style={{ backgroundColor: '#1a1a1a', color: '#888888' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E63946';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
              e.currentTarget.style.color = '#888888';
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
