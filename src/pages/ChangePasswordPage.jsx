import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) return setError('Please enter your current password (Employee ID)');
    if (!newPassword) return setError('Please enter a new password');
    if (!confirmPassword) return setError('Please confirm your new password');
    if (newPassword !== confirmPassword) return setError('New passwords do not match');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters');

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
      } else {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.must_change_password = false;
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #134e4a 100%)',
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🔐</div>
          <h2 style={{ margin: 0, color: '#1e3a5f', fontSize: '22px', fontWeight: '700' }}>
            Set New Password
          </h2>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: '13px' }}>
            First login — please set your personal password
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', marginBottom: '7px',
              color: '#333', fontWeight: '600', fontSize: '14px'
            }}>
              Current Password (your Employee ID)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="e.g. 4500466"
              style={{
                width: '100%', padding: '13px 14px',
                border: '2px solid #e5e7eb', borderRadius: '10px',
                fontSize: '15px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', marginBottom: '7px',
              color: '#333', fontWeight: '600', fontSize: '14px'
            }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              style={{
                width: '100%', padding: '13px 14px',
                border: '2px solid #e5e7eb', borderRadius: '10px',
                fontSize: '15px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block', marginBottom: '7px',
              color: '#333', fontWeight: '600', fontSize: '14px'
            }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              style={{
                width: '100%', padding: '13px 14px',
                border: '2px solid #e5e7eb', borderRadius: '10px',
                fontSize: '15px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', padding: '12px 14px', borderRadius: '10px',
              marginBottom: '18px', fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#9ca3af' : '#1e3a5f',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '16px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Set Password & Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}
