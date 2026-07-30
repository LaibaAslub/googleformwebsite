'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (data.redirect) {
        window.location.href = data.redirect;
      }
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
          <h1 className={styles.title}>Sign in to your account</h1>
          <p className={styles.subtitle}>Welcome back. Please enter your credentials.</p>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        
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
            <label className={styles.label}>Password</label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#5f6368' }}>
            <Link href="/forgot-password" style={{ color: 'var(--form-primary)', textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
              Forgot password?
            </Link>
            Don't have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--form-primary)', textDecoration: 'none', fontWeight: '500' }}>
              Sign up here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
