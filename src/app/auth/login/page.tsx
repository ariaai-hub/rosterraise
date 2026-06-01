'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailVerificationError, setEmailVerificationError] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendSuccess(true);
      }
    } catch {
      // silently fail
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailVerificationError(false);
    setResendSuccess(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.toLowerCase().includes('verify') || data.error?.toLowerCase().includes('email')) {
          setEmailVerificationError(true);
          setError(data.error || 'Please verify your email before logging in');
        } else {
          setError(data.error || 'Login failed');
        }
        return;
      }

      // Redirect based on role
      const role = data.user?.role;
      if (role === 'ADMIN') {
        router.push('/admin/crm');
      } else if (role === 'COACH') {
        router.push('/coach/demo-team');
      } else {
        router.push('/');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Background gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at top, #1A0A0A 0%, transparent 50%), radial-gradient(ellipse at bottom, #0A0A1A 0%, transparent 50%)'
        }}
      />
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(90deg, #FFFFFF 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Login card */}
      <div className="relative w-full max-w-md px-6">
        <div 
          className="rounded-2xl p-8"
          style={{ 
            backgroundColor: '#111111', 
            border: '1px solid #222222',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.5), 0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)'
          }}
        >
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 
              className="text-4xl font-bold tracking-[0.2em] mb-2"
              style={{ 
                fontFamily: 'Oswald, sans-serif',
                background: 'linear-gradient(135deg, #E63946 0%, #FF6B6B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 10px rgba(230, 57, 70, 0.3)',
              }}
            >
              ROSTERRAISE
            </h1>
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h2 
              className="text-xl font-semibold"
              style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}
            >
              Welcome Back
            </h2>
            <p className="text-sm mt-1" style={{ color: '#888888' }}>
              Sign in to your dashboard
            </p>
          </div>

          {/* Error message */}
          {error && emailVerificationError && (
            <div
              className="mb-6 p-4 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(230, 57, 70, 0.15)',
                border: '1px solid #E63946',
                color: '#FFFFFF',
              }}
            >
              <p className="mb-3">
                Almost there! Check your email and click the verification link to activate your account. Check your spam folder if you don&apos;t see it.
              </p>
              {!resendSuccess ? (
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="font-semibold underline transition-opacity"
                  style={{ color: '#E63946', cursor: resendLoading ? 'not-allowed' : 'pointer', opacity: resendLoading ? 0.6 : 1 }}
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              ) : (
                <p className="font-semibold" style={{ color: '#10B981' }}>Verification email sent! Check your inbox.</p>
              )}
              <p className="mt-3 text-sm" style={{ opacity: 0.7 }}>
                Don&apos;t have an account?{' '}
                <a href="/auth/register" className="underline" style={{ color: '#E63946' }}>
                  Sign Up
                </a>
              </p>
            </div>
          )}

          {/* General error message */}
          {error && !emailVerificationError && (
            <div
              className="mb-6 p-4 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(230, 57, 70, 0.15)',
                border: '1px solid #E63946',
                color: '#FFFFFF',
              }}
            >
              {error}
              <p className="mt-2" style={{ opacity: 0.7 }}>
                Don&apos;t have an account?{' '}
                <a href="/auth/register" className="underline" style={{ color: '#E63946' }}>
                  Sign Up
                </a>
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  border: '1px solid #2A2A2A',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#E63946';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230, 57, 70, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#2A2A2A';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-11 rounded-lg outline-none transition-all"
                  style={{
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    border: '1px solid #2A2A2A',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#E63946';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(230, 57, 70, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#2A2A2A';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your password"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span style={{ color: '#666666', fontSize: '14px' }}>🔒</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a
                href="/auth/forgot-password"
                className="text-xs font-medium transition-colors"
                style={{ color: '#E63946' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg font-semibold transition-all transform"
              style={{
                backgroundColor: loading ? '#B82D3A' : '#E63946',
                color: '#FFFFFF',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(230, 57, 70, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(230, 57, 70, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(230, 57, 70, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: '#666666' }}>
              Don&apos;t have an account?{' '}
              <a href="/auth/register" className="font-semibold transition-colors" style={{ color: '#E63946' }}>
                Sign Up
              </a>
            </p>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs mt-6" style={{ color: '#444444' }}>
          &copy; RosterRaise. All rights reserved.
        </p>
      </div>
    </div>
  );
}
