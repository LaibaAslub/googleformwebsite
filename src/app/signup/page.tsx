'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../login.module.css'; // Reuse existing styles

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    email: '',
    password: '',
    questionLimit: 15
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
      setSuccessMessage(data.message || 'Your request has been submitted successfully. Please wait for the administrator to approve it before logging in.');
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
          <h1 className={styles.title}>Request Access</h1>
          <p className={styles.subtitle}>Fill in your details to submit a registration request.</p>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        
        {success ? (
          <div className={styles.successMsg}>
            {successMessage}
            <div style={{ marginTop: '1rem' }}>
              <Link href="/" style={{ color: 'var(--form-primary)', textDecoration: 'underline' }}>Back to Login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input 
                type="text" 
                name="fullName"
                placeholder="John Doe" 
                value={formData.fullName}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Designation / Role</label>
              <input 
                type="text" 
                name="designation"
                placeholder="Reviewer" 
                value={formData.designation}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input 
                type="email" 
                name="email"
                placeholder="john@company.com" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input 
                type="password" 
                name="password"
                placeholder="••••••••" 
                value={formData.password}
                onChange={handleChange}
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Requested Question Limit</label>
              <input 
                type="number" 
                name="questionLimit"
                min="1"
                value={formData.questionLimit}
                onChange={handleChange}
                required 
              />
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <Link href="/" style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem',
                textAlign: 'center',
                backgroundColor: 'transparent',
                color: 'var(--form-primary)',
                border: '1px solid var(--form-primary)',
                borderRadius: '8px',
                fontWeight: '500',
                textDecoration: 'none',
                marginTop: '0.5rem'
              }}>
                Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
