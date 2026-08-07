'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import styles from '../login.module.css';

const NO_LIMIT_PHRASE = 'has not yet set your question limit';

export default function SelectCategoryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noLimitSet, setNoLimitSet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const router = useRouter();

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setError('Please select a category to continue.');
      return;
    }

    setLoading(true);
    setError('');
    setNoLimitSet(false);

    try {
      const res = await fetch('/api/auth/select-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Special case: admin hasn't set question limit yet
        if (data.error && data.error.includes(NO_LIMIT_PHRASE)) {
          setNoLimitSet(true);
        } else {
          throw new Error(data.error || 'Something went wrong');
        }
        return;
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div className={styles.loginWrapper}>
      <motion.div
        className={styles.loginCard}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <motion.div className={styles.header} variants={itemVariants}>
          <div className={styles.portalBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" />
            </svg>
            PORTAL
          </div>
          <h1 className={styles.title}>Select Legal Category</h1>
          <p className={styles.subtitle}>
            Choose your area of expertise. Only questions from your selected
            category will be assigned to you.
          </p>
        </motion.div>

        {/* ── "No limit set" waiting banner ── */}
        {noLimitSet && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              color: '#fcd34d',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  display: 'inline-block',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  flexShrink: 0,
                }}
              />
              <strong style={{ fontSize: '0.95rem' }}>
                Awaiting Question Limit Configuration
              </strong>
            </div>
            <p style={{ fontSize: '0.88rem', margin: '0 0 6px 0', lineHeight: 1.5 }}>
              Your account is approved, but your administrator has not yet
              configured how many questions you will review. Please contact
              your administrator and ask them to set your question limit.
            </p>
            <p style={{ fontSize: '0.82rem', margin: 0, color: '#fbbf24', fontStyle: 'italic' }}>
              Once configured, return here and select your category to begin.
            </p>
          </motion.div>
        )}

        {/* ── Generic error ── */}
        {error && (
          <motion.div
            className={styles.errorMsg}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </motion.div>
        )}

        {/* ── Category selection form ── */}
        <form onSubmit={handleCategorySubmit}>
          <motion.div className={styles.formGroup} variants={itemVariants}>
            <div className={styles.categoryGrid}>
              {[
                { name: 'Civil', desc: 'Civil law related questions', icon: '⚖️' },
                { name: 'Criminal', desc: 'Criminal law related questions', icon: '🔒' },
                { name: 'Family', desc: 'Family law related questions', icon: '👨‍👩‍👧' },
              ].map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.name.toLowerCase());
                    setError('');
                    setNoLimitSet(false);
                  }}
                  className={`${styles.categoryBtn} ${
                    selectedCategory === cat.name.toLowerCase()
                      ? styles.categoryBtnActive
                      : ''
                  }`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span style={{ fontSize: '1.6rem' }}>{cat.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {cat.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.83rem',
                      color:
                        selectedCategory === cat.name.toLowerCase()
                          ? '#a5b4fc'
                          : '#64748b',
                    }}
                  >
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
            {loading ? 'Assigning questions…' : 'Continue →'}
          </motion.button>
        </form>

        {/* Sign out */}
        <motion.div
          variants={itemVariants}
          style={{ textAlign: 'center', marginTop: '1.5rem' }}
        >
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            Sign out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
