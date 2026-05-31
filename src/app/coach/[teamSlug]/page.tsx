'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function CoachDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const teamSlug = pathname.split('/')[2];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'COACH') {
            // Verify this coach's teamId matches the teamSlug by fetching team
            const teamRes = await fetch(`/api/teams/${teamSlug}`, { credentials: 'include' });
            if (teamRes.ok) {
              const teamData = await teamRes.json();
              if (teamData.team?.id === data.user.teamId) {
                setSession(data.user);
              }
            }
          }
        }
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [teamSlug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.user?.role !== 'COACH') {
        setError('Access denied. Coaches only.');
        return;
      }

      // Verify coach's team matches this page's team
      const teamRes = await fetch(`/api/teams/${teamSlug}`, { credentials: 'include' });
      if (!teamRes.ok) {
        setError('Team not found.');
        return;
      }
      const teamData = await teamRes.json();
      if (data.user?.teamId !== teamData.team?.id) {
        setError('You do not have access to this team.');
        return;
      }

      router.push(`/coach/${teamSlug}`);
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Loading state
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

  // Logged in coach - show dashboard
  if (session) {
    return <DashboardContent teamSlug={teamSlug} user={session} />;
  }

  // Login form
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: '#111111' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#E63946' }}>
            RosterRaise
          </h1>
          <p className="text-gray-500 mt-2">Coach Login</p>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-lg text-sm"
            style={{ backgroundColor: '#1a0000', color: '#E63946', border: '1px solid #E63946' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: '#0A0A0A',
                color: '#FFFFFF',
                border: '1px solid #333333',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333333')}
              placeholder="coach@team.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#888888' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
              style={{
                backgroundColor: '#0A0A0A',
                color: '#FFFFFF',
                border: '1px solid #333333',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#333333')}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: loggingIn ? '#661a1f' : '#E63946',
              color: '#FFFFFF',
              cursor: loggingIn ? 'not-allowed' : 'pointer',
            }}
          >
            {loggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/" className="text-sm" style={{ color: '#888888' }}>
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({ teamSlug, user }: { teamSlug: string; user: any }) {
  const [stats, setStats] = useState<{ playerCount: number; orderCount: number; teamName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [teamRes, playersRes, ordersRes] = await Promise.all([
          fetch(`/api/teams/${teamSlug}`),
          fetch(`/api/teams/${user.teamId}/players`),
          fetch('/api/orders'),
        ]);

        const teamData = teamRes.ok ? await teamRes.json() : { team: { name: 'Your Team' } };
        const playersData = playersRes.ok ? await playersRes.json() : { players: [] };
        const ordersData = ordersRes.ok ? await ordersRes.json() : { orders: [] };

        // Filter orders for this team
        const teamOrders = (ordersData.orders || []).filter(
          (o: any) => o.teamId === user.teamId || (o.team && o.team.slug === teamSlug)
        );

        setStats({
          teamName: teamData.team?.name || 'Your Team',
          playerCount: playersData.players?.length || 0,
          orderCount: teamOrders.length,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setStats({
          teamName: 'Your Team',
          playerCount: 0,
          orderCount: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [teamSlug, user.teamId]);

  const storeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${teamSlug}`;

  return (
    <div className="p-8" style={{ backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s an overview of your team store.</p>
        </div>

        {/* Store URL */}
        <div
          className="mb-8 p-4 rounded-xl flex items-center justify-between"
          style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
        >
          <div>
            <p className="text-sm text-gray-500 mb-1">Your Team Store</p>
            <a
              href={`/store/${teamSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-medium hover:underline"
              style={{ color: '#E63946' }}
            >
              {storeUrl}
            </a>
          </div>
          <a
            href={`/store/${teamSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#E63946', color: '#FFFFFF' }}
          >
            View Store →
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
          >
            <p className="text-sm text-gray-500 mb-2">Team Name</p>
            <p className="text-2xl font-bold text-white">
              {loading ? '...' : stats?.teamName}
            </p>
          </div>

          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
          >
            <p className="text-sm text-gray-500 mb-2">Total Players</p>
            <p className="text-2xl font-bold" style={{ color: '#E63946' }}>
              {loading ? '...' : stats?.playerCount}
            </p>
          </div>

          <div
            className="p-6 rounded-xl"
            style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
          >
            <p className="text-sm text-gray-500 mb-2">Total Orders</p>
            <p className="text-2xl font-bold" style={{ color: '#E63946' }}>
              {loading ? '...' : stats?.orderCount}
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href={`/coach/${teamSlug}/players`}
            className="p-6 rounded-xl transition-colors"
            style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E63946';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1E1E1E';
            }}
          >
            <p className="text-2xl mb-2">👥</p>
            <p className="font-semibold text-white">Manage Players</p>
            <p className="text-sm text-gray-500 mt-1">Add, edit, or remove players</p>
          </a>

          <a
            href={`/coach/${teamSlug}/orders`}
            className="p-6 rounded-xl transition-colors"
            style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E63946';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1E1E1E';
            }}
          >
            <p className="text-2xl mb-2">📦</p>
            <p className="font-semibold text-white">View Orders</p>
            <p className="text-sm text-gray-500 mt-1">Track and manage orders</p>
          </a>

          <a
            href={`/coach/${teamSlug}/settings`}
            className="p-6 rounded-xl transition-colors"
            style={{ backgroundColor: '#141414', border: '1px solid #1E1E1E' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E63946';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1E1E1E';
            }}
          >
            <p className="text-2xl mb-2">⚙️</p>
            <p className="font-semibold text-white">Settings</p>
            <p className="text-sm text-gray-500 mt-1">Update team info and logo</p>
          </a>
        </div>
      </div>
    </div>
  );
}