'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import styles from '../login.module.css';

export default function SelectCategoryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const router = useRouter();

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/select-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory })
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

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
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
          <h1 className={styles.title}>Select Legal Category</h1>
          <p className={styles.subtitle}>Please choose your area of expertise to continue.</p>
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

        <form onSubmit={handleCategorySubmit}>
          <motion.div className={styles.formGroup} variants={itemVariants}>
            <div className={styles.categoryGrid}>
              {[
                { name: 'Civil', desc: 'Civil law related questions' },
                { name: 'Criminal', desc: 'Criminal law related questions' },
                { name: 'Family', desc: 'Family law related questions' }
              ].map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name.toLowerCase())}
                  className={`${styles.categoryBtn} ${selectedCategory === cat.name.toLowerCase() ? styles.categoryBtnActive : ''}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ fontWeight: 600, fontSize: '1.2rem' }}>{cat.name}</span>
                  <span style={{ fontSize: '0.85rem', color: selectedCategory === cat.name.toLowerCase() ? '#818cf8' : '#94a3b8' }}>
                    {cat.desc}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={loading || !selectedCategory}
            variants={itemVariants}
          >
            {loading ? 'Saving...' : 'Continue'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
