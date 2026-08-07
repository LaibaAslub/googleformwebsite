'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './review.module.css';

export default function ReviewPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressInfo, setProgressInfo] = useState<any>(null);
  const [requestCount, setRequestCount] = useState(15);
  const [requesting, setRequesting] = useState(false);
  const [approvalCheckDots, setApprovalCheckDots] = useState('.');
  const router = useRouter();

  const [responses, setResponses] = useState<Record<number, any>>({});
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const newAnswerRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      const res = await fetch('/api/review/questions', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/');
        return;
      }
      const data = await res.json();

      // If the server says user needs to pick a category (new session), redirect immediately
      if (data.needsCategory) {
        router.push('/select-category');
        return;
      }

      console.log('[review page decision]', {
        status: data.progress?.status,
        expiry_date: data.progress?.expiry_date,
        question_limit: data.progress?.questionLimit,
        questions_completed: data.progress?.questionsCompleted,
        has_submitted: data.progress?.hasSubmitted,
        assignedQuestions: Array.isArray(data.questions) ? data.questions.length : 0,
        completed: Boolean(data.completed),
        destination: data.completed ? 'thank-you' : ((data.questions || []).length > 0 ? 'questions' : 'no-questions-assigned'),
      });
      if (data.questions) {
        setQuestions(data.questions);
      }
      if (data.savedProgress) {
        const initialResponses: Record<number, any> = {};
        data.savedProgress.forEach((p: any) => {
          initialResponses[p.question_id] = {
            rating: p.rating || 0,
            comment: p.user_comment || '',
            newAnswer: p.new_answer || ''
          };
        });
        setResponses(initialResponses);
      }
      if (data.progress) {
        setProgressInfo(data.progress);
      }
      if (data.completed) {
        setIsCompleted(true);
      }
      setLoading(false);
    }
    fetchQuestions();
  }, [router]);

  // Animated dots for the "checking approval" UI
  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setApprovalCheckDots(d => d.length >= 3 ? '.' : d + '.');
    }, 600);
    return () => clearInterval(dotsTimer);
  }, []);

  // Poll the server every 8 seconds while a request is pending
  // When admin approves, the API returns needsCategory:true and we redirect
  const checkApprovalStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/review/questions', { cache: 'no-store' });
      if (res.status === 401) return; // session still valid, just wait
      const data = await res.json();
      if (data.needsCategory) {
        // Admin approved — clear poll and send to category selection
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        router.push('/select-category');
      }
    } catch {
      // Network blip — ignore and retry on next tick
    }
  }, [router]);

  useEffect(() => {
    const hasPending = progressInfo?.hasPendingRequest;
    if (!hasPending) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }
    // Start polling every 8 seconds
    pollIntervalRef.current = setInterval(checkApprovalStatus, 8000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [progressInfo?.hasPendingRequest, checkApprovalStatus]);

  const currentQ = questions[currentIndex];
  const currentResponse = currentQ ? (responses[currentQ.id] || { rating: 0, comment: '', newAnswer: '' }) : null;

  useEffect(() => {
    const resize = (el: HTMLTextAreaElement | null) => {
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    };
    resize(commentRef.current);
    resize(newAnswerRef.current);
  }, [currentResponse?.comment, currentResponse?.newAnswer]);

  const triggerAutoSave = (qId: number, dataToSave: any, category?: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await fetch('/api/review/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: qId,
          category: category || null,
          rating: dataToSave.rating,
          comment: dataToSave.comment,
          newAnswer: dataToSave.newAnswer
        })
      });
    }, 1000);
  };

  const handleRating = (rating: number) => {
    if (!currentQ) return;
    const updated = { ...currentResponse, rating };
    setResponses({ ...responses, [currentQ.id]: updated });
    triggerAutoSave(currentQ.id, updated, currentQ.category);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentQ) return;
    const updated = { ...currentResponse, [e.target.name]: e.target.value };
    setResponses({ ...responses, [currentQ.id]: updated });
    triggerAutoSave(currentQ.id, updated, currentQ.category);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleClear = () => {
    if (!currentQ) return;
    const cleared = { rating: 0, comment: '', newAnswer: '' };
    setResponses({ ...responses, [currentQ.id]: cleared });
    triggerAutoSave(currentQ.id, cleared, currentQ.category);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = questions.map(q => ({
      question_id: q.id,
      question_text: q.question_text,
      original_answer: q.existing_answer,
      reference: q.reference,
      category: q.category || null,
      user_comment: responses[q.id]?.comment || '',
      rating: responses[q.id]?.rating || null,
      new_answer: responses[q.id]?.newAnswer || ''
    }));

    const res = await fetch('/api/review/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: payload })
    });

    if (res.ok) {
      setIsCompleted(true);
      setProgressInfo((prev: any) => ({ ...prev, hasSubmitted: true, hasPendingRequest: false }));
    } else {
      alert('Failed to submit responses. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className={styles.reviewWrapper}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {/* <img src="/banner.png" alt="University Banner" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} /> */}
          </div>
          <div className={styles.mainHeader}>Hallucination Feedback</div>
          <div className={`${styles.card} ${styles.progressCard}`}>
            <div style={{ height: '14px', width: '150px', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '12px', animation: 'pulse 2s infinite' }}></div>
            <div style={{ height: '28px', width: '300px', backgroundColor: '#e5e7eb', borderRadius: '8px', marginBottom: '24px', animation: 'pulse 2s infinite' }}></div>
            <div style={{ height: '8px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', animation: 'pulse 2s infinite' }}></div>
          </div>
          <div className={styles.card}>
            <div style={{ height: '24px', width: '80%', backgroundColor: '#e5e7eb', borderRadius: '6px', marginBottom: '24px', animation: 'pulse 2s infinite' }}></div>
            <div style={{ height: '16px', width: '40%', backgroundColor: '#e5e7eb', borderRadius: '4px', marginBottom: '12px', animation: 'pulse 2s infinite' }}></div>
            <div style={{ height: '100px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const handleRequestQuestions = async () => {
    setRequesting(true);
    try {
      const res = await fetch('/api/review/request-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedCount: requestCount })
      });
      const data = await res.json();
      if (res.ok) {
        setProgressInfo({ ...progressInfo, hasPendingRequest: true });
      } else {
        alert(data.error || 'Failed to request questions');
      }
    } catch (e) {
      alert('Failed to request questions');
    }
    setRequesting(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  if (isCompleted) {
    const isExpired = progressInfo?.expiry_date && new Date(progressInfo.expiry_date) < new Date();

    return (
      <div className={styles.reviewWrapper}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {/* <img src="/banner.png" alt="University Banner" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} /> */}
          </div>
          <div className={styles.mainHeader}>Hallucination Feedback</div>
          <div className={`${styles.card} ${styles.progressCard}`}>
            <h1 className={styles.progressTitle}>Thank you!</h1>
            <p style={{ marginBottom: '24px' }}>You have completed all your assigned questions. Your responses have been saved securely.</p>
            
            {progressInfo?.hasPendingRequest ? (
              <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '20px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  {/* Pulsing dot */}
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    display: 'inline-block',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }} />
                  <strong style={{ fontSize: '1rem' }}>Awaiting Admin Approval</strong>
                </div>
                <p style={{ fontSize: '0.9rem', margin: '0 0 10px 0' }}>
                  Your request for additional questions is pending. This page will automatically redirect you to category selection as soon as it is approved.
                </p>
                <p style={{ fontSize: '0.82rem', color: '#92400e', margin: 0, fontStyle: 'italic' }}>
                  Checking for approval{approvalCheckDots}
                </p>
              </div>
            ) : isExpired ? (
              <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <strong>Account Expired</strong>
                <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Your account has expired. You cannot request more questions at this time.</p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#111827' }}>Request More Questions</h3>
                <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '16px' }}>
                  If you would like to continue evaluating, you can request a new set of questions.
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <select 
                    value={requestCount} 
                    onChange={(e) => setRequestCount(Number(e.target.value))}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  >
                    <option value={5}>5 questions</option>
                    <option value={10}>10 questions</option>
                    <option value={15}>15 questions</option>
                    <option value={20}>20 questions</option>
                  </select>
                  <button 
                    onClick={handleRequestQuestions} 
                    disabled={requesting}
                    className={styles.btn}
                  >
                    {requesting ? 'Requesting...' : 'Request Now'}
                  </button>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={handleLogout} 
                className={styles.btnLogout}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={styles.reviewWrapper}>
        <div className={styles.container}>
          {/* Banner */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {/* <img src="/banner.png" alt="University Banner" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} /> */}
          </div>
          <div className={styles.mainHeader}>Hallucination Feedback</div>
          <div className={`${styles.card} ${styles.progressCard}`}>
            <h1 className={styles.progressTitle}>No Questions Assigned</h1>
            <p>There are no questions assigned to your account at this time. Please contact the administrator to assign questions.</p>
            <div style={{ marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleLogout} className={styles.btnLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = ((currentIndex) / questions.length) * 100;
  // Validation: rating and newAnswer are required
  const isCurrentValid = currentResponse.rating > 0 && currentResponse.newAnswer.trim().length > 0;

  return (
    <div className={styles.reviewWrapper}>
      <div className={styles.container}>
        
        {/* Banner */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {/* <img src="/banner.png" alt="University Banner" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} /> */}
        </div>

        {/* Main Header */}
        <div className={styles.mainHeader}>
          Hallucination Feedback
        </div>

        {/* Progress Header Card */}
        <div className={`${styles.card} ${styles.progressCard}`}>
          <div className={styles.progressLabel}>Question {currentIndex + 1} of {questions.length}</div>
          <h2 className={styles.progressTitle}>Review System Information</h2>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>

        {/* Question Card */}
        <div className={`${styles.card} animate-fade-in`} key={currentQ.id}>
          <h2 className={styles.questionTitle}>{currentQ.question_text}</h2>
          
          <div className={styles.referenceLabel}>Current System Answer (Reference)</div>
          <div className={styles.referenceBox} style={{ marginBottom: currentQ.reference ? '12px' : '24px' }}>
            {currentQ.existing_answer}
          </div>

          {currentQ.reference && (
            <>
              <div className={styles.referenceLabel}>Reference Source</div>
              <div className={styles.referenceBox} style={{ fontSize: '0.95rem', fontStyle: 'italic', backgroundColor: '#f3f4f6' }}>
                {currentQ.reference}
              </div>
            </>
          )}

          <div className={styles.inputLabel}>Rate this answer *</div>
          <div className={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`${styles.star} ${currentResponse.rating >= star ? styles.active : ''}`}
                onClick={() => handleRating(star)}
              >
                {currentResponse.rating >= star ? '★' : '☆'}
              </button>
            ))}
          </div>

          <div className={styles.inputLabel}>Suggest a New / Improved Answer *</div>
          <textarea 
            ref={newAnswerRef}
            name="newAnswer"
            className={styles.textArea} 
            placeholder="Your answer"
            value={currentResponse.newAnswer}
            onChange={handleChange}
            rows={1}
            style={{ overflow: 'hidden', resize: 'none', minHeight: '40px' }}
          />

          <div className={styles.inputLabel}>Your Comment (Optional)</div>
          <textarea 
            ref={commentRef}
            name="comment"
            className={styles.textArea} 
            placeholder="Your answer"
            value={currentResponse.comment}
            onChange={handleChange}
            rows={1}
            style={{ overflow: 'hidden', resize: 'none', minHeight: '40px' }}
          />
        </div>

        {/* Bottom Controls */}
        <div className={styles.bottomControls}>
          {/* Left: Back button + anonymous note */}
          <div className={styles.leftControls}>
            {currentIndex > 0 ? (
              <button className={`${styles.btn} ${styles.btnBack}`} onClick={handleBack} disabled={submitting}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                Back
              </button>
            ) : <div style={{ width: '72px' }}></div>}

            <div className={styles.bottomNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
              Your responses are anonymous
            </div>
          </div>

          {/* Centre: primary action — Next / Submit */}
          <div className={styles.centreControls}>
            <button className={styles.btn} onClick={handleNext} disabled={!isCurrentValid || submitting}>
              {submitting ? 'Submitting...' : currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
              {!submitting && currentIndex < questions.length - 1 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/></svg>
              )}
            </button>
          </div>

          {/* Right: secondary actions — Clear form + Logout */}
          <div className={styles.rightControls}>
            <button className={styles.clearForm} onClick={handleClear}>Clear form</button>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
