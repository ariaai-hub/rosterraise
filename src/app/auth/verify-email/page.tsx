'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (token && email) {
      verifyEmail();
    } else {
      setError('Invalid verification link');
      setVerifying(false);
    }
  }, [token, email]);

  const verifyEmail = async () => {
    if (!token || !email) {
      setError('Invalid verification link');
      setVerifying(false);
      return;
    }

    setLoading(true);
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to verify email');
        return;
      }

      setSuccess(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <div
              className="w-6 h-6 rounded-full animate-pulse"
              style={{ backgroundColor: '#E63946' }}
            />
          </div>
        </div>
        <p className="text-sm" style={{ color: '#666666' }}>
          Verifying your email...
        </p>
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
          <p className="font-semibold">Email verified!</p>
          <p className="text-sm mt-2">
            Your email has been successfully verified. You can now sign in.
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

  return (
    <div>
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          Verify Your Email
        </h2>
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

      {/* Retry button */}
      <button
        onClick={verifyEmail}
        disabled={loading}
        className="w-full py-3 rounded-md font-semibold transition-all"
        style={{
          backgroundColor: loading ? '#F5A0A5' : '#E63946',
          color: '#FFFFFF',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Verifying...' : 'Verify Email'}
      </button>

      <div className="mt-6 text-center">
        <a href="/auth/login" className="text-sm font-semibold" style={{ color: '#E63946' }}>
          Back to Sign In
        </a>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <div className="mb-6">
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <div
                className="w-6 h-6 rounded-full animate-pulse"
                style={{ backgroundColor: '#E63946' }}
              />
            </div>
          </div>
          <p className="text-sm" style={{ color: '#666666' }}>
            Loading...
          </p>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
