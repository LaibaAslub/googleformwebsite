'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../login.module.css';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.loginCard + ' animate-fade-in'}>
        <div className={styles.header}>
          <div className={styles.portalBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" />
            </svg>
            PORTAL
          </div>
          <h1 className={styles.title}>Forgot Password</h1>
          <p className={styles.subtitle}>
            Enter your email and a new password. An administrator must approve the change before you can sign in.
          </p>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {success ? (
          <div className={styles.successMsg}>
            Your password change request has been sent to the administrator.
            Once approved, you can sign in with your new password.
            <div style={{ marginTop: '1rem' }}>
              <Link href="/" style={{ color: 'var(--form-primary)', textDecoration: 'underline' }}>Back to Login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                name="newPassword"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#5f6368' }}>
              Remembered your password?{' '}
              <Link href="/" style={{ color: 'var(--form-primary)', textDecoration: 'none', fontWeight: '500' }}>
                Sign in here
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
