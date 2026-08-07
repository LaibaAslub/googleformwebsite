'use client';

import { useState, useEffect } from 'react';
import {
  MessageCircleQuestion, Search, RefreshCw,
  CheckCircle2, XCircle, User, BookOpen,
  Clock, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';

type QuestionRequest = {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  requested_count: number;
  current_limit: number;
  questions_completed: number;
  status: string;
  created_at: string;
};

const PAGE_SIZE = 8;

function StatusBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: '#fef9c3', color: '#854d0e',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.02em',
    }}>
      <Clock size={11} /> Pending
    </span>
  );
}

export default function QuestionRequestsClient() {
  const [requests, setRequests] = useState<QuestionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [selected, setSelected] = useState<QuestionRequest | null>(null);
  const [approvedCount, setApprovedCount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/question-requests');
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const openModal = (req: QuestionRequest) => {
    setSelected(req);
    setApprovedCount(String(req.requested_count));
  };

  const closeModal = () => { setSelected(null); setApprovedCount(''); };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'approve') {
      const n = parseInt(approvedCount, 10);
      if (isNaN(n) || n <= 0) { showToast('error', 'Please enter a valid question count.'); return; }
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/question-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selected.id,
          action,
          approvedCount: action === 'approve' ? parseInt(approvedCount, 10) : undefined,
        }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== selected.id));
        closeModal();
        showToast('success', action === 'approve'
          ? `Approved ${approvedCount} questions for ${selected.user_email}.`
          : `Request from ${selected.user_email} rejected.`);
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Action failed.');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    }
    setActionLoading(false);
  };

  const filtered = requests.filter(r =>
    r.user_email.toLowerCase().includes(search.toLowerCase()) ||
    r.user_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '10px',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          padding: '12px 18px', borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          fontSize: '0.875rem', fontWeight: 500,
          animation: 'slideDown 0.2s ease',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="animatePageIn">
        {/* Page header */}
        <div className="pageHeader">
          <div>
            <h1 className="pageTitle">Question Requests</h1>
            <p className="pageSubtitle">Review and manage requests from active users who need additional questions.</p>
          </div>
          <button className="btn btnOutline" onClick={() => { fetchRequests(); setPage(1); }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: '#ede9fe', padding: '14px', borderRadius: '50%', color: '#7c3aed' }}>
              <MessageCircleQuestion size={28} />
            </div>
            <div>
              <div className="kpiLabel">Pending Requests</div>
              <div className="kpiValue">{requests.length}</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: '#dcfce7', padding: '14px', borderRadius: '50%', color: '#16a34a' }}>
              <BookOpen size={28} />
            </div>
            <div>
              <div className="kpiLabel">Total Questions Requested</div>
              <div className="kpiValue">{requests.reduce((s, r) => s + r.requested_count, 0)}</div>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: '#fef3c7', padding: '14px', borderRadius: '50%', color: '#d97706' }}>
              <User size={28} />
            </div>
            <div>
              <div className="kpiLabel">Unique Requesters</div>
              <div className="kpiValue">{new Set(requests.map(r => r.user_id)).size}</div>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="card">
          <div className="filtersBar">
            <div className="searchBox">
              <Search className="searchIcon" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {filtered.length} request{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="emptyState">
              <div className="spinner" />
              <p>Loading requests…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="emptyState">
              <MessageCircleQuestion size={48} style={{ color: '#d1d5db', marginBottom: '12px' }} />
              <h3 style={{ color: '#374151', marginBottom: '6px' }}>No Pending Requests</h3>
              <p style={{ color: '#9ca3af' }}>There are currently no users requesting additional questions.</p>
            </div>
          ) : (
            <>
              <div className="tableContainer">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Current Limit</th>
                      <th>Requested</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(req => (
                      <tr key={req.id}>
                        {/* User column */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>
                              {initials(req.user_name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>
                                {req.user_name}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '1px' }}>
                                {req.user_email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current limit column */}
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{req.current_limit}</span>
                            <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
                              ({req.questions_completed} done)
                            </span>
                          </div>
                        </td>

                        {/* Requested column */}
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '4px 12px',
                            backgroundColor: '#ede9fe', color: '#6d28d9',
                            borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                          }}>
                            +{req.requested_count} Qs
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ fontSize: '0.83rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {new Date(req.created_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>

                        {/* Status */}
                        <td><StatusBadge label="pending" /></td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => openModal(req)}
                              style={{
                                background: '#4338ca', color: '#fff',
                                border: 'none', padding: '6px 14px',
                                borderRadius: '6px', fontSize: '0.8rem',
                                fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '5px',
                              }}
                            >
                              <CheckCircle2 size={13} /> Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination">
                <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                  Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="pageBtn"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className="pageBtn"
                      onClick={() => setPage(p)}
                      style={{
                        backgroundColor: p === page ? '#4338ca' : '',
                        color: p === page ? '#fff' : '',
                        fontWeight: p === page ? 700 : 400,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="pageBtn"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review / Approval Modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}>
          <div className="card animateSlideUp" style={{ width: '480px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                  Review Question Request
                </h2>
                <p style={{ fontSize: '0.83rem', color: '#6b7280' }}>
                  Adjust the question count and approve or reject this request.
                </p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                <XCircle size={20} />
              </button>
            </div>

            {/* User info */}
            <div style={{
              backgroundColor: '#f9fafb', borderRadius: '10px',
              padding: '16px', marginBottom: '20px',
              display: 'grid', gap: '8px', fontSize: '0.875rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#7c3aed,#4338ca)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {initials(selected.user_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{selected.user_name}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>{selected.user_email}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.73rem', color: '#6b7280', marginBottom: '2px' }}>CURRENT LIMIT</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{selected.current_limit}</div>
                </div>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.73rem', color: '#6b7280', marginBottom: '2px' }}>COMPLETED</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{selected.questions_completed}</div>
                </div>
              </div>
              <div style={{ backgroundColor: '#ede9fe', borderRadius: '8px', padding: '10px 14px', border: '1px solid #ddd6fe' }}>
                <div style={{ fontSize: '0.73rem', color: '#7c3aed', marginBottom: '2px', fontWeight: 600 }}>USER REQUESTED</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#5b21b6' }}>+{selected.requested_count} questions</div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Requested on: {new Date(selected.created_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>

            {/* Editable approved count */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Questions to Approve
              </label>
              {/* Quick presets */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {[5, 10, 15, 20, 25, 30].map(n => (
                  <button
                    key={n}
                    onClick={() => setApprovedCount(String(n))}
                    style={{
                      padding: '5px 14px', borderRadius: '6px', fontSize: '0.82rem',
                      fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      borderColor: approvedCount === String(n) ? '#4338ca' : '#d1d5db',
                      backgroundColor: approvedCount === String(n) ? '#eef2ff' : '#fff',
                      color: approvedCount === String(n) ? '#4338ca' : '#374151',
                      transition: 'all 0.12s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={approvedCount}
                onChange={e => setApprovedCount(e.target.value)}
                placeholder="Custom number…"
                style={{
                  width: '100%', border: '1px solid #d1d5db',
                  borderRadius: '8px', padding: '10px 14px',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {approvedCount && !isNaN(parseInt(approvedCount, 10)) && parseInt(approvedCount, 10) > 0 && (
                <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#6b7280' }}>
                  New question limit will be{' '}
                  <strong style={{ color: '#4338ca' }}>
                    {selected.current_limit + parseInt(approvedCount, 10)}
                  </strong>{' '}
                  (current {selected.current_limit} + {approvedCount} new).
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="outlineBtn"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#fef2f2', color: '#b91c1c',
                  border: '1px solid #fca5a5', padding: '8px 18px',
                  borderRadius: '7px', fontWeight: 600, cursor: 'pointer',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <XCircle size={15} />
                {actionLoading ? 'Processing…' : 'Reject'}
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={actionLoading || !approvedCount || parseInt(approvedCount, 10) <= 0}
                style={{
                  backgroundColor: (actionLoading || !approvedCount || parseInt(approvedCount, 10) <= 0) ? '#9ca3af' : '#4338ca',
                  color: '#fff', border: 'none', padding: '8px 20px',
                  borderRadius: '7px', fontWeight: 600,
                  cursor: (actionLoading || !approvedCount || parseInt(approvedCount, 10) <= 0) ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'background 0.15s',
                }}
              >
                <CheckCircle2 size={15} />
                {actionLoading ? 'Approving…' : `Approve ${approvedCount || '?'} Questions`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
