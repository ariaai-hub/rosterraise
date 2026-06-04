'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId: string;
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract teamSlug from pathname: /coach/[teamSlug]/...
  const teamSlug = pathname.split('/')[2];

  useEffect(() => {
    if (pathname === `/coach/${teamSlug}`) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        if (!data.user || data.user.role !== 'COACH') {
          router.push('/auth/login');
          return;
        }
        // Verify coach's teamId matches the actual team's UUID id (not slug)
        const teamRes = await fetch(`/api/teams/${teamSlug}`, { credentials: 'include' });
        if (!teamRes.ok || teamRes.ok) {
          const teamData = await teamRes.json().catch(() => ({}));
          // teamId in session is the team's UUID; teamSlug is the URL slug
          // For coaches, teamId is their team UUID, which matches teamData.id
          if (teamData.team && data.user.teamId !== teamData.team.id) {
            router.push('/auth/login');
            return;
          }
        }
        setUser(data.user);
      } catch {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, teamSlug]);

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
  if (pathname === `/coach/${teamSlug}`) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: `/coach/${teamSlug}`, label: 'Dashboard', icon: '📊' },
    { href: `/coach/${teamSlug}/players`, label: 'Players', icon: '👥' },
    { href: `/coach/${teamSlug}/orders`, label: 'Orders', icon: '📦' },
    { href: `/coach/${teamSlug}/settings`, label: 'Settings', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/auth/login');
    } catch {
      router.push('/auth/login');
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
          <p className="text-sm text-gray-500 mt-1">Coach Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== `/coach/${teamSlug}` && pathname.startsWith(item.href));
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