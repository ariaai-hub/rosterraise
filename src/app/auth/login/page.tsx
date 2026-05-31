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
    <div>
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          Welcome Back
        </h2>
        <p className="text-sm mt-2" style={{ color: '#666666' }}>
          Sign in to your team dashboard
        </p>
      </div>

      {/* Error message */}
      {error && emailVerificationError && (
        <div
          className="mb-6 p-4 rounded-lg text-sm"
          style={{
            backgroundColor: '#E63946',
            color: '#FFFFFF',
          }}
        >
          <p className="mb-3">
            Almost there! Check your email and click the verification link to activate your account. Check your spam folder if you don't see it.
          </p>
          {!resendSuccess ? (
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="font-semibold underline"
              style={{ color: '#FFFFFF', cursor: resendLoading ? 'not-allowed' : 'pointer' }}
            >
              {resendLoading ? 'Sending...' : 'Resend verification email'}
            </button>
          ) : (
            <p className="font-semibold">Verification email sent! Check your inbox.</p>
          )}
          <p className="mt-3 text-sm" style={{ opacity: 0.8 }}>
            Don't have an account?{' '}
            <a href="/auth/register" className="underline" style={{ color: '#FFFFFF' }}>
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
            backgroundColor: '#E63946',
            color: '#FFFFFF',
          }}
        >
          {error}
          <p className="mt-2" style={{ opacity: 0.8 }}>
            Don't have an account?{' '}
            <a href="/auth/register" className="underline" style={{ color: '#FFFFFF' }}>
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
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: '#E63946' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-md outline-none transition-colors"
            style={{
              backgroundColor: '#1A1A1A',
              color: '#E63946',
              border: '1px solid #2A2A2A',
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = '#E63946')
            }
            onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: '#E63946' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-md outline-none transition-colors"
            style={{
              backgroundColor: '#1A1A1A',
              color: '#E63946',
              border: '1px solid #2A2A2A',
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = '#E63946')
            }
            onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
            placeholder="Enter your password"
          />
        </div>

        <div className="flex items-center justify-end">
          <a
            href="/auth/forgot-password"
            className="text-xs font-medium"
            style={{ color: '#E63946' }}
          >
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-md font-semibold transition-all"
          style={{
            backgroundColor: loading ? '#F5A0A5' : '#E63946',
            color: '#FFFFFF',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Register link */}
      <div className="mt-6 text-center">
        <p className="text-sm" style={{ color: '#666666' }}>
          Don't have an account?{' '}
          <a href="/auth/register" className="font-semibold" style={{ color: '#E63946' }}>
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
