'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
          <h1 className={styles.title}>Sign in to your account</h1>
          <p className={styles.subtitle}>Welcome back. Please enter your credentials.</p>
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
        
        <form onSubmit={handleSubmit}>
          <motion.div className={styles.formGroup} variants={itemVariants}>
            <label className={styles.label}>Email</label>
            <input 
              type="email" 
              name="email"
              className={styles.inputField}
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </motion.div>
          
          <motion.div className={styles.formGroup} variants={itemVariants}>
            <label className={styles.label}>Password</label>
            <input 
              type="password" 
              name="password"
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
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </motion.button>
          
          <motion.div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }} variants={itemVariants}>
            <Link href="/forgot-password" className={styles.link} style={{ display: 'block', marginBottom: '1rem' }}>
              Forgot password?
            </Link>
            Don't have an account?{' '}
            <Link href="/signup" className={styles.link}>
              Sign up here
            </Link>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
