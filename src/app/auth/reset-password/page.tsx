'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    // Validate that we have required params
    if (!token || !email) {
      setError('Invalid reset link. Please request a new one.');
      setValidating(false);
    } else {
      setValidating(false);
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError('Invalid reset link');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm" style={{ color: '#666666' }}>
          Validating reset link...
        </div>
      </div>
    );
  }

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
          <p className="font-semibold">Password reset successful!</p>
          <p className="text-sm mt-2">
            You can now sign in with your new password.
          </p>
        </div>
        <a
          href="/auth/login"
          className="inline-block py-3 px-6 rounded-md font-semibold"
          style={{
            backgroundColor: '#E63946',
            color: '#FFFFFF',
          }}
        >
          Sign In
        </a>
      </div>
    );
  }

  if (!token || !email) {
    return (
      <div>
        <div
          className="mb-6 p-4 rounded-lg text-sm"
          style={{
            backgroundColor: '#FEF2F2',
            color: '#E63946',
            border: '1px solid #E63946',
          }}
        >
          {error || 'Invalid reset link'}
        </div>
        <div className="text-center">
          <a
            href="/auth/forgot-password"
            className="text-sm font-semibold"
            style={{ color: '#E63946' }}
          >
            Request new reset link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          Set New Password
        </h2>
        <p className="text-sm mt-2" style={{ color: '#666666' }}>
          Enter your new password below
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
            htmlFor="password"
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: '#E63946' }}
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
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
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: '#E63946' }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
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
            placeholder="Confirm your password"
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
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <div className="text-sm" style={{ color: '#666666' }}>
            Loading...
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
