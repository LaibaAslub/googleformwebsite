'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from '../login.module.css';

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

  const containerVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.6, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <div className={styles.loginWrapper}>
      <motion.div 
        className={styles.loginCard}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className={styles.header} variants={itemVariants}>
          <div className={styles.portalBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" />
            </svg>
            PORTAL
          </div>
          <h1 className={styles.title}>Request Access</h1>
          <p className={styles.subtitle}>Fill in your details to submit a registration request.</p>
        </motion.div>

        {error && (
          <motion.div 
            className={styles.errorMsg} 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </motion.div>
        )}
        
        {success ? (
          <motion.div 
            className={styles.successMsg}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem', display: 'block', color: '#10b981' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {successMessage}
            <div style={{ marginTop: '2rem' }}>
              <Link href="/" className={styles.secondaryBtn}>
                Back to Login
              </Link>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit}>
            <motion.div className={styles.formGrid} variants={itemVariants}>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label}>Full Name</label>
                <input 
                  type="text" 
                  name="fullName"
                  className={styles.inputField}
                  placeholder="John Doe" 
                  value={formData.fullName}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label}>Designation</label>
                <input 
                  type="text" 
                  name="designation"
                  className={styles.inputField}
                  placeholder="Reviewer" 
                  value={formData.designation}
                  onChange={handleChange}
                  required 
                />
              </div>
            </motion.div>
            
            <motion.div className={styles.formGroup} variants={itemVariants} style={{ marginTop: '1.5rem' }}>
              <label className={styles.label}>Email</label>
              <input 
                type="email" 
                name="email"
                className={styles.inputField}
                placeholder="john@company.com" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
            </motion.div>
            
            <motion.div className={styles.formGrid} variants={itemVariants}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input 
                  type="password" 
                  name="password"
                  className={styles.inputField}
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Question Limit</label>
                <input 
                  type="number" 
                  name="questionLimit"
                  className={styles.inputField}
                  min="1"
                  value={formData.questionLimit}
                  onChange={handleChange}
                  required 
                />
              </div>
            </motion.div>

            <motion.div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} variants={itemVariants}>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <Link href="/" className={styles.secondaryBtn}>
                Login to Existing Account
              </Link>
            </motion.div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
