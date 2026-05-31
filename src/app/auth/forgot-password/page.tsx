'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email');
        return;
      }

      setSuccess(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div
          className="mb-6 p-4 rounded-lg"
          style={{
            backgroundColor: '#F0FDF4',
            color: '#166534',
            border: '1px solid #86EFAC',
          }}
        >
          <p className="font-semibold">Check your email</p>
          <p className="text-sm mt-2">
            If an account exists for <strong>{email}</strong>, we've sent password reset instructions.
          </p>
        </div>
        <p className="text-sm" style={{ color: '#666666' }}>
          Didn't receive the email?{' '}
          <button
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
            className="font-semibold"
            style={{ color: '#E63946', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          Reset Password
        </h2>
        <p className="text-sm mt-2" style={{ color: '#666666' }}>
          Enter your email and we'll send you reset instructions
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg text-sm"
          style={{
            backgroundColor: '#FEF2F2',
            color: '#E63946',
            border: '1px solid #E63946',
          }}
        >
          {error}
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
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = '#2A2A2A')
            }
            placeholder="you@example.com"
          />
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
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <p className="text-sm" style={{ color: '#666666' }}>
          Remember your password?{' '}
          <a href="/auth/login" className="font-semibold" style={{ color: '#E63946' }}>
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
