'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from '../../login.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (res.ok) {
        router.push('/admin');
      } else {
        setError('Invalid admin credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
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
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
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
          <div className={styles.portalBadge} style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H7V7.1L12 5V11.99Z" />
            </svg>
            ADMIN PORTAL
          </div>
          <h1 className={styles.title}>Admin Authentication</h1>
          <p className={styles.subtitle}>Enter your secure credentials to access the dashboard.</p>
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
        
        <form onSubmit={handleLogin}>
          <motion.div className={styles.formGroup} variants={itemVariants}>
            <label className={styles.label}>Admin Email</label>
            <input 
              type="email" 
              className={styles.inputField}
              placeholder="admin@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </motion.div>
          
          <motion.div className={styles.formGroup} variants={itemVariants}>
            <label className={styles.label}>Password</label>
            <input 
              type="password" 
              className={styles.inputField}
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </motion.div>

          <motion.button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={loading}
            variants={itemVariants}
            style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 4px 14px rgba(180, 83, 9, 0.4)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
