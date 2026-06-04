'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 15px 40px',
      }}>
        <div style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '16px',
          color: '#E63946',
          textAlign: 'center',
        }}>
          <p>Invalid or expired reset link.</p>
          <a
            href="/auth/forgot-password"
            style={{
              color: '#E63946',
              textDecoration: 'underline',
              display: 'block',
              marginTop: '16px',
            }}
          >
            Request a new reset link
          </a>
        </div>
      </div>
    );
  }

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
              Set New Password
            </h2>
            <p style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '14px',
              color: '#ADB5BD',
              margin: '0px 0px 24px 0px',
            }}>
              Enter your new password below
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
                Password updated! Redirecting to sign in...
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
              {/* Password */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="password" style={{
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
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create new password"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="confirmPassword" style={{
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
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm new password"
                    autoComplete: "new-password"
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
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
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
                {loading ? 'Updating...' : 'Update Password'}
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