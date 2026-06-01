'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  slug: string;
  sport: string;
  logoUrl: string | null;
  primaryColor: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId: string;
}

const SPORTS = ['Basketball', 'Football', 'Soccer', 'Baseball', 'Volleyball', 'Track', 'Other'];

export default function SettingsPage() {
  const pathname = usePathname();
  const teamSlug = pathname.split('/')[2];
  const [team, setTeam] = useState<Team | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [teamForm, setTeamForm] = useState({
    name: '',
    sport: '',
    logoUrl: '',
    primaryColor: '#E63946',
  });

  const [coachForm, setCoachForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
        if (!sessionRes.ok) return;
        const sessionData = await sessionRes.json();
        const userData = sessionData.user;
        if (!userData) return;

        setUser(userData);
        setCoachForm({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          role: userData.role || 'COACH',
        });

        const teamId = userData.teamId;
        if (!teamId) {
          setLoading(false);
          return;
        }

        const teamRes = await fetch(`/api/teams/${teamId}`);
        if (teamRes.ok) {
          const data = await teamRes.json();
          const t = data.team;
          setTeam(t);
          setTeamForm({
            name: t.name || '',
            sport: t.sport || '',
            logoUrl: t.logoUrl || '',
            primaryColor: t.primaryColor || '#E63946',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamSlug]);

  const handleTeamSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamForm.name,
          sport: teamForm.sport,
          logoUrl: teamForm.logoUrl || null,
          primaryColor: teamForm.primaryColor,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }

      setTeam(data.team);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
        return;
      }

      setPasswordSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPasswordError('An error occurred');
    }
  };

  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${teamSlug}` : '';

  const copyStoreUrl = () => {
    if (storeUrl) {
      navigator.clipboard.writeText(storeUrl);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10B981';
      case 'PENDING': return '#F59E0B';
      case 'REJECTED': return '#EF4444';
      default: return '#888888';
    }
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#0A0A0A', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
            Settings
          </h1>
          <p className="text-gray-500 mt-1">Manage your team and profile</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Store URL Section */}
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            >
              <label className="block text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: '#888888' }}>
                Your Store URL
              </label>
              <div className="flex items-center gap-3">
                <input
                  readOnly
                  value={storeUrl}
                  className="flex-1 px-4 py-3 rounded-lg outline-none"
                  style={{ 
                    backgroundColor: '#0A0A0A', 
                    color: '#E63946', 
                    border: '1px solid #333333',
                    fontFamily: 'Inter, sans-serif'
                  }}
                />
                <button
                  type="button"
                  onClick={copyStoreUrl}
                  className="px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: '#1a1a1a', 
                    color: '#FFFFFF', 
                    border: '1px solid #333333',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E63946';
                    e.currentTarget.style.borderColor = '#E63946';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                    e.currentTarget.style.borderColor = '#333333';
                  }}
                >
                  Copy
                </button>
                <a
                  href={`/store/${teamSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: '#E63946', 
                    color: '#FFFFFF',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c92d3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E63946'}
                >
                  Preview →
                </a>
              </div>
            </div>

            {/* Team Settings Form */}
            <form onSubmit={handleTeamSave} className="space-y-6">
              <div
                className="p-6 rounded-xl"
                style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
              >
                <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                  Team Information
                </h2>

                {/* Team Name */}
                <div className="mb-6">
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Team Name
                  </label>
                  <input
                    value={teamForm.name}
                    onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                    style={{ 
                      backgroundColor: '#1A1A1A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                    placeholder="e.g. Warriors Basketball"
                  />
                </div>

                {/* Sport */}
                <div className="mb-6">
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Sport
                  </label>
                  <select
                    value={teamForm.sport}
                    onChange={e => setTeamForm(f => ({ ...f, sport: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                    style={{ 
                      backgroundColor: '#1A1A1A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                  >
                    <option value="">Select sport</option>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Team Status */}
                <div className="mb-6">
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Status
                  </label>
                  <div className="flex items-center gap-3">
                    <span
                      className="px-3 py-2 text-sm font-semibold rounded-lg"
                      style={{ 
                        backgroundColor: getStatusColor(team?.status || '') + '20',
                        color: getStatusColor(team?.status || ''),
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      {team?.status || 'PENDING'}
                    </span>
                    <span className="text-sm" style={{ color: '#666666' }}>
                      {team?.status === 'APPROVED' ? 'Your team is live and accepting orders' : 'Your team is pending approval'}
                    </span>
                  </div>
                </div>

                {/* Logo URL */}
                <div className="mb-6">
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={teamForm.logoUrl}
                    onChange={e => setTeamForm(f => ({ ...f, logoUrl: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                    style={{ 
                      backgroundColor: '#1A1A1A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                    placeholder="https://example.com/logo.png"
                  />
                  {teamForm.logoUrl && (
                    <div className="mt-3">
                      <img
                        src={teamForm.logoUrl}
                        alt="Logo preview"
                        className="w-20 h-20 object-contain rounded-lg"
                        style={{ backgroundColor: '#1A1A1A' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>

                {/* Primary Color */}
                <div className="mb-4">
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Primary Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={teamForm.primaryColor}
                      onChange={e => setTeamForm(f => ({ ...f, primaryColor: e.target.value }))}
                      className="w-12 h-12 rounded cursor-pointer"
                      style={{ backgroundColor: 'transparent', border: 'none' }}
                    />
                    <input
                      value={teamForm.primaryColor}
                      onChange={e => setTeamForm(f => ({ ...f, primaryColor: e.target.value }))}
                      className="flex-1 px-4 py-2 rounded-lg outline-none transition-colors"
                      style={{ 
                        backgroundColor: '#1A1A1A', 
                        color: '#FFFFFF', 
                        border: '1px solid #2A2A2A',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                      placeholder="#E63946"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-lg text-sm" style={{ 
                  backgroundColor: '#1a0000', 
                  color: '#E63946', 
                  border: '1px solid #E63946',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {error}
                </div>
              )}

              {saved && (
                <div className="p-4 rounded-lg text-sm" style={{ 
                  backgroundColor: '#002200', 
                  color: '#22c55e', 
                  border: '1px solid #22c55e',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  Settings saved successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-lg font-semibold transition-all"
                style={{ 
                  backgroundColor: saving ? '#661a1f' : '#E63946', 
                  color: '#FFFFFF', 
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = '#c92d3a';
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.backgroundColor = '#E63946';
                }}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>

            {/* Commission Section */}
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                Commission
              </h2>
              <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: '#0A0A0A' }}>
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{ backgroundColor: '#10B98120', color: '#10B981', fontFamily: 'Oswald, sans-serif' }}
                >
                  %
                </div>
                <div>
                  <p className="font-semibold text-lg" style={{ color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
                    You earn 30% commission
                  </p>
                  <p className="text-sm" style={{ color: '#888888', fontFamily: 'Inter, sans-serif' }}>
                    Paid bi-weekly via direct deposit
                  </p>
                </div>
              </div>
            </div>

            {/* Coach Profile Section */}
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            >
              <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                Coach Profile
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                      First Name
                    </label>
                    <input
                      value={coachForm.firstName}
                      onChange={e => setCoachForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                      style={{ 
                        backgroundColor: '#1A1A1A', 
                        color: '#FFFFFF', 
                        border: '1px solid #2A2A2A',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                      Last Name
                    </label>
                    <input
                      value={coachForm.lastName}
                      onChange={e => setCoachForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                      style={{ 
                        backgroundColor: '#1A1A1A', 
                        color: '#FFFFFF', 
                        border: '1px solid #2A2A2A',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={coachForm.email}
                    readOnly
                    className="w-full px-4 py-3 rounded-lg outline-none cursor-not-allowed"
                    style={{ 
                      backgroundColor: '#0A0A0A', 
                      color: '#555555', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    placeholder="coach@team.com"
                  />
                  <p className="text-xs mt-2" style={{ color: '#555555' }}>
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Role
                  </label>
                  <div
                    className="px-4 py-3 rounded-lg"
                    style={{ 
                      backgroundColor: '#0A0A0A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {coachForm.role || 'COACH'}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security Section */}
            <div
              className="p-6 rounded-xl"
              style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
            >
              <h2 className="text-lg font-semibold mb-6" style={{ color: '#FFFFFF', fontFamily: 'Oswald, sans-serif' }}>
                Account Security
              </h2>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                    style={{ 
                      backgroundColor: '#1A1A1A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                    style={{ 
                      backgroundColor: '#1A1A1A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#888888' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-colors"
                    style={{ 
                      backgroundColor: '#1A1A1A', 
                      color: '#FFFFFF', 
                      border: '1px solid #2A2A2A',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#E63946')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordError && (
                  <div className="p-4 rounded-lg text-sm" style={{ 
                    backgroundColor: '#1a0000', 
                    color: '#E63946', 
                    border: '1px solid #E63946',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-4 rounded-lg text-sm" style={{ 
                    backgroundColor: '#002200', 
                    color: '#22c55e', 
                    border: '1px solid #22c55e',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {passwordSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg font-semibold transition-all"
                  style={{ 
                    backgroundColor: '#1A1A1A', 
                    color: '#FFFFFF', 
                    border: '1px solid #2A2A2A',
                    fontFamily: 'Inter, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E63946';
                    e.currentTarget.style.borderColor = '#E63946';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1A1A1A';
                    e.currentTarget.style.borderColor = '#2A2A2A';
                  }}
                >
                  Change Password
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}