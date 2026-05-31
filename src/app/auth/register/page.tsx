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
    role: 'PARENT' as 'COACH' | 'PARENT',
    teamName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Redirect based on role
      const role = data.user?.role;
      if (role === 'COACH') {
        router.push(`/coach/${data.user?.teamSlug}`);
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
          Create Account
        </h2>
        <p className="text-sm mt-2" style={{ color: '#666666' }}>
          Join RosterRaise and start fundraising
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-xs font-semibold uppercase mb-2"
              style={{ color: '#E63946' }}
            >
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
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
              placeholder="John"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-xs font-semibold uppercase mb-2"
              style={{ color: '#E63946' }}
            >
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
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
              placeholder="Smith"
            />
          </div>
        </div>

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
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
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
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
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
            htmlFor="role"
            className="block text-xs font-semibold uppercase mb-2"
            style={{ color: '#E63946' }}
          >
            I am a...
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
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
          >
            <option value="PARENT">Parent</option>
            <option value="COACH">Coach</option>
          </select>
        </div>

        {formData.role === 'COACH' && (
          <div>
            <label
              htmlFor="teamName"
              className="block text-xs font-semibold uppercase mb-2"
              style={{ color: '#E63946' }}
            >
              Team Name
            </label>
            <input
              id="teamName"
              name="teamName"
              type="text"
              value={formData.teamName}
              onChange={handleChange}
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
              placeholder="e.g., Warriors Soccer"
            />
          </div>
        )}

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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Login link */}
      <div className="mt-6 text-center">
        <p className="text-sm" style={{ color: '#666666' }}>
          Already have an account?{' '}
          <a href="/auth/login" className="font-semibold" style={{ color: '#E63946' }}>
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
