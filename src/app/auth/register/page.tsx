'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    teamName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePassword = () => {
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          teamName: formData.teamName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      router.push('/auth/login?registered=true');
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
      {/* Outer container */}
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
              margin: '0px 0px 24px 0px',
            }}>
              Create Account
            </h2>

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
              {/* First Name */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="firstName" style={{
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
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Enter first name"
                  autoComplete="given-name"
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

              {/* Last Name */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="lastName" style={{
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
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Enter last name"
                  autoComplete="family-name"
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

              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
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
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
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
                    backgroundColor: '#1A1A1A',
                    border: 'none',
                    borderBottom: '2px solid #E63946',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Team Name */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="teamName" style={{
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
                  Team / Organization Name
                </label>
                <input
                  id="teamName"
                  name="teamName"
                  type="text"
                  value={formData.teamName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Demolition Warriors"
                  autoComplete="organization"
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
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create password"
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
                    placeholder="Confirm password"
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
                {loading ? 'Creating Account...' : 'Create Account'}
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

              {/* Sign in link */}
              <div style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '16px',
                color: '#495057',
              }}>
                Already have an account?{' '}
                <a
                  href="/auth/login"
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '16px',
                    color: '#E63946',
                    textDecoration: 'underline',
                    fontWeight: 600,
                  }}
                >
                  Sign In
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}