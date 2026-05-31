'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in as admin
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'ADMIN') {
            router.push('/admin/crm');
          }
        }
      } catch {
        // Not logged in, stay on login page
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

      if (data.user?.role !== 'ADMIN') {
        setError('Access denied. Admin only.');
        return;
      }

      router.push('/admin/crm');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: '#111111' }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#E63946' }}>
            RosterRaise
          </h1>
          <p className="text-gray-500 mt-2">Admin Login</p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg text-sm"
            style={{ backgroundColor: '#1a0000', color: '#E63946', border: '1px solid #E63946' }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: '#888888' }}
            >
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
              placeholder="admin@rosterraise.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: '#888888' }}
            >
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
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: loading ? '#661a1f' : '#E63946',
              color: '#FFFFFF',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <a href="/" className="text-sm" style={{ color: '#888888' }}>
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
