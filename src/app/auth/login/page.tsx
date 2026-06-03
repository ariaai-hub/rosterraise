'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      const role = data.user?.role;
      if (role === 'ADMIN' || role === 'SALES_REP') {
        router.push('/admin/crm');
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: '60px 0px 40px',
    }}>
      {/* Outer container */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        padding: '0px 15px',
        flexGrow: 1,
      }}>
        {/* CardLoginSws equivalent */}
        <div style={{
          display: 'inline-block',
          verticalAlign: 'baseline',
          width: '380px',
          maxWidth: '380px',
        }}>
          {/* Form card */}
          <div style={{ textAlign: 'center' }}>
            {/* Logo */}
            <div style={{ marginBottom: '32px' }}>
              <a href="/" style={{ textDecoration: 'none' }}>
                <img
                  src="/logo_cropped.png"
                  alt="RosterRaise"
                  style={{ height: '80px', width: 'auto' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'block';
                  }}
                />
                <div style={{
                  display: 'none',
                  fontFamily: '"Oswald", sans-serif',
                  fontSize: '28px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: '#E63946',
                }}>
                  ROSTERRAISE
                </div>
              </a>
            </div>

            {/* Heading */}
            <h2 style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '18px',
              fontWeight: 600,
              color: '#E63946',
              margin: '0px 0px 24px 0px',
            }}>
              Sign In
            </h2>

            {/* Error message */}
            {error && emailVerificationError && (
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
                <p style={{ margin: '0 0 8px 0' }}>
                  Almost there! Check your email and click the verification link to activate your account. Check your spam folder if you don&apos;t see it.
                </p>
                {!resendSuccess ? (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#E63946',
                      textDecoration: 'underline',
                      cursor: resendLoading ? 'not-allowed' : 'pointer',
                      opacity: resendLoading ? 0.6 : 1,
                    }}
                  >
                    {resendLoading ? 'Sending...' : 'Resend verification email'}
                  </button>
                ) : (
                  <p style={{ margin: 0, fontWeight: 600, color: '#10B981' }}>
                    Verification email sent! Check your inbox.
                  </p>
                )}
              </div>
            )}

            {/* General error */}
            {error && !emailVerificationError && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: '"Inter", sans-serif',
                backgroundColor: 'rgba(230, 57, 70, 0.08)',
                border: '1px solid #E63946',
                color: '#E63946',
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Username / Email field */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#E63946',
                    marginBottom: '0px',
                    marginLeft: '6px',
                    textAlign: 'left',
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter email"
                  autoComplete="email"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '6px',
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#495057',
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    borderBottom: '2px solid #E63946',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'box-shadow 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 0 0 #E63946';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Password field */}
              <div style={{ marginBottom: '8px' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#E63946',
                    marginBottom: '0px',
                    marginLeft: '6px',
                    textAlign: 'left',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      height: '36px',
                      padding: '6px 40px 6px 6px',
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '16px',
                      color: '#495057',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: '2px solid #ADB5BD',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderBottomColor = '#E63946';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderBottomColor = '#ADB5BD';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '0px',
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '16px',
                      color: '#495057',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <a
                  href="/auth/forgot-password"
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#E63946',
                    textDecoration: 'underline',
                  }}
                >
                  Reset my password
                </a>
              </div>

              {/* Sign In button */}
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
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Go Back */}
              <div style={{ marginBottom: '32px' }}>
                <a
                  href="/"
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#E63946',
                    textDecoration: 'underline',
                  }}
                >
                  Go Back
                </a>
              </div>

              {/* Divider / Sign up link */}
              <div style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                color: '#495057',
              }}>
                Don&apos;t have an account?{' '}
                <a
                  href="/auth/register"
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#E63946',
                    textDecoration: 'underline',
                    fontWeight: 600,
                  }}
                >
                  Enroll Here
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}