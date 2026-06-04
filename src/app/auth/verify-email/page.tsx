'use client';

import { useState } from 'react';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send verification email');
        return;
      }

      setSuccess(true);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0A0A0A',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        padding: '0px 15px',
        flexGrow: 1,
        alignItems: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          verticalAlign: 'baseline',
          width: '380px',
          maxWidth: '380px',
        }}>
          <div style={{ textAlign: 'center' }}>
            {/* Logo */}
            <div style={{ marginBottom: '24px' }}>
              <a href="/" style={{ textDecoration: 'none' }}>
                <img
                  src="/logo_rr.png"
                  alt="RosterRaise"
                  style={{
                    width: '120px',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              </a>
            </div>

            {/* Heading */}
            <h2 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '18px',
              fontWeight: 600,
              color: '#E63946',
              margin: '0px 0px 8px 0px',
            }}>
              Verify Email
            </h2>
            <p style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '14px',
              color: '#ADB5BD',
              margin: '0px 0px 24px 0px',
            }}>
              Enter your email to receive a verification link
            </p>

            {/* Success message */}
            {success && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: '"Inter", sans-serif',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid #10B981',
                color: '#10B981',
                textAlign: 'left',
              }}>
                Verification email sent! Check your inbox.
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: '"Inter", sans-serif',
                backgroundColor: 'rgba(230, 57, 70, 0.08)',
                border: '1px solid #E63946',
                color: '#E63946',
                textAlign: 'left',
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email field */}
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#E63946',
                  marginBottom: '4px',
                  marginLeft: '6px',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '6px',
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#495057',
                    backgroundColor: '#1A1A1A',
                    border: 'none',
                    borderBottom: '2px solid #E63946',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '20px',
                  backgroundColor: loading ? '#B82D3A' : '#E63946',
                  color: '#FFFFFF',
                  border: 'none',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  padding: '10px 30px',
                  transition: 'background-color 0.2s ease',
                  marginBottom: '16px',
                }}
              >
                {loading ? 'Sending...' : 'Send Verification Email'}
              </button>

              {/* Back to Sign In */}
              <div>
                <a
                  href="/auth/login"
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#E63946',
                    textDecoration: 'underline',
                  }}
                >
                  Back to Sign In
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}