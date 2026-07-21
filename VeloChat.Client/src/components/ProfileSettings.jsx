import React, { useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole, Save, UserRound, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.title || fallback;
};

const ProfileSettings = ({ open, onClose }) => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ username: '', email: '', fullName: '', profilePictureUrl: '' });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setProfile({
      username: user.username || '',
      email: user.email || '',
      fullName: user.fullName || '',
      profilePictureUrl: user.profilePictureUrl || '',
    });
    setStatus({ type: '', message: '' });
  }, [open, user]);

  if (!open) return null;

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await api.put('/api/auth/me', profile);
      updateUser(response.data);
      setStatus({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Unable to update profile.') });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setStatus({ type: '', message: '' });
    if (passwords.newPassword !== passwords.confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/auth/change-password', {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setStatus({ type: 'success', message: 'Password changed successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: getErrorMessage(error, 'Unable to change password.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
        <header className="settings-header">
          <div>
            <span className="eyebrow">Account</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={20} /></button>
        </header>

        <div className="settings-tabs">
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => { setTab('profile'); setStatus({ type: '', message: '' }); }}>
            <UserRound size={17} /> Profile
          </button>
          <button className={tab === 'security' ? 'active' : ''} onClick={() => { setTab('security'); setStatus({ type: '', message: '' }); }}>
            <LockKeyhole size={17} /> Password
          </button>
        </div>

        {status.message && (
          <div className={`form-status ${status.type}`}>
            {status.type === 'success' && <CheckCircle2 size={17} />}
            {status.message}
          </div>
        )}

        {tab === 'profile' ? (
          <form className="settings-form" onSubmit={saveProfile}>
            <div className="profile-preview">
              {profile.profilePictureUrl ? <img src={profile.profilePictureUrl} alt="Profile" /> : <span>{profile.username.slice(0, 2).toUpperCase()}</span>}
              <div><strong>{profile.fullName || profile.username}</strong><small>@{profile.username}</small></div>
            </div>
            <div className="form-grid">
              <label>Username<input className="glass-input" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} required /></label>
              <label>Email<input className="glass-input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required /></label>
              <label>Full name<input className="glass-input" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} /></label>
              <label>Profile picture URL<input className="glass-input" type="url" value={profile.profilePictureUrl} onChange={(e) => setProfile({ ...profile, profilePictureUrl: e.target.value })} placeholder="https://..." /></label>
            </div>
            <button className="btn-premium settings-submit" disabled={saving}><Save size={17} />{saving ? 'Saving...' : 'Save changes'}</button>
          </form>
        ) : (
          <form className="settings-form" onSubmit={changePassword}>
            <p className="settings-copy">Enter your current password first. Your password will only change after it has been verified.</p>
            <label>Old password<input className="glass-input" type="password" value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} required autoComplete="current-password" /></label>
            <label>New password<input className="glass-input" type="password" minLength="6" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} required autoComplete="new-password" /></label>
            <label>Confirm new password<input className="glass-input" type="password" minLength="6" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} required autoComplete="new-password" /></label>
            <button className="btn-premium settings-submit" disabled={saving}><LockKeyhole size={17} />{saving ? 'Updating...' : 'Change password'}</button>
          </form>
        )}
      </section>
    </div>
  );
};

export default ProfileSettings;
