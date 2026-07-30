'use client';

import { useMemo, useState } from 'react';
import {
  MessageSquare, CheckCircle2, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, LabelList
} from 'recharts';
import { AnimatedCounter, ChartWhenVisible, CHART_ANIMATION } from '../animation';
import '../../admin.css';

type PendingUser = {
  id: string;
  full_name: string;
  email: string;
  designation?: string | null;
  question_limit?: number | null;
  questions_completed?: number | null;
  expiry_date?: string | null;
  created_at: string;
  status: string;
};

type Stats = {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
};

function formatExpiry(value?: string | null) {
  if (!value) return 'Not set';
  const d = new Date(value);
  const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${formattedDate}, ${formattedTime}`;
}

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
}

export default function PendingClient({
  users = [],
  stats,
}: {
  users?: PendingUser[];
  stats?: Stats;
}) {
  const safeStats: Stats = {
    pendingCount: stats?.pendingCount ?? users.length,
    approvedCount: stats?.approvedCount ?? 0,
    rejectedCount: stats?.rejectedCount ?? 0,
  };

  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [expiryInput, setExpiryInput] = useState('');
  const [limitInput, setLimitInput] = useState('15');
  const [busy, setBusy] = useState(false);

  const statusChartData = useMemo(() => ([
    { name: 'Pending', value: safeStats.pendingCount, color: '#eab308' },
    { name: 'Approved', value: safeStats.approvedCount, color: '#16a34a' },
    { name: 'Rejected', value: safeStats.rejectedCount, color: '#ef4444' },
  ]), [safeStats.pendingCount, safeStats.approvedCount, safeStats.rejectedCount]);

  const openDetails = (user: PendingUser) => {
    const completed = Number(user.questions_completed || 0);
    const totalLimit = Number(user.question_limit || 0);
    const additionalQuestions = Math.max(totalLimit - completed, 1);
    setSelectedUser(user);
    setExpiryInput(toDateInputValue(user.expiry_date));
    setLimitInput(String(additionalQuestions || 15));
  };

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setBusy(true);
    const payload: Record<string, unknown> = { userId, action };

    if (action === 'approve') {
      if (expiryInput) {
        const d = new Date(expiryInput);
        payload.expiryDate = d.toISOString();
      } else {
        payload.expiryDate = null;
      }

      const parsedLimit = parseInt(limitInput, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit > 0) {
        payload.questionLimit = parsedLimit;
      }
    }

    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setBusy(false);

    if (res.ok) {
      setSelectedUser(null);
      window.location.reload();
    } else {
      const data = await res.json();
      alert(`Action failed: ${data.error}`);
    }
  };

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Access Requests</h1>
          <p>Review and manage pending question-limit expansion requests.</p>
        </div>
      </div>

      <div className="grid">
        {/* Keep first card exactly as it is */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ backgroundColor: '#eef2ff', padding: '16px', borderRadius: '50%', color: '#4338ca' }}>
            <MessageSquare size={32} />
          </div>
          <div>
            <div className="kpiLabel">Total Pending</div>
            <div className="kpiValue"><AnimatedCounter value={users.length} /></div>
          </div>
        </div>

        {/* Approval Statistics */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '16px', borderRadius: '50%', color: '#16a34a' }}>
            <CheckCircle2 size={32} />
          </div>
          <div>
            <div className="kpiLabel">Approval Statistics</div>
            <div className="kpiValue"><AnimatedCounter value={safeStats.approvedCount} /></div>
            <p className="kpiDescription">Total approved access requests</p>
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ backgroundColor: '#fee2e2', padding: '16px', borderRadius: '50%', color: '#dc2626' }}>
            <XCircle size={32} />
          </div>
          <div>
            <div className="kpiLabel">Rejected Requests</div>
            <div className="kpiValue"><AnimatedCounter value={safeStats.rejectedCount} /></div>
            <p className="kpiDescription">Total rejected access requests</p>
          </div>
        </div>
      </div>

      <div className="tableContainer">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Email</th>
              <th>New Questions</th>
              <th>Expiry Date & Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>No pending requests.</td>
              </tr>
            )}
            {users.map(user => {
              const initials = user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
              return (
                <tr key={user.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                      {initials}
                    </div>
                    <strong>{user.full_name}</strong>
                  </td>
                  <td>{user.designation || '—'}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badgePurple">{Math.max(Number(user.question_limit || 0) - Number(user.questions_completed || 0), 0) || user.question_limit || 15} Qs</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: user.expiry_date ? '#374151' : '#9ca3af' }}>
                      {formatExpiry(user.expiry_date)}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openDetails(user)}
                      style={{ color: '#4338ca', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="pagination">
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            SHOWING 1-{users.length} OF {users.length} REQUESTS
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="pageBtn">&lt;</button>
            <button className="pageBtn">&gt;</button>
          </div>
        </div>
      </div>

      {/* Status Overview Chart */}
      <div className="card chartCard" style={{ marginTop: '24px' }}>
        <div className="chartHeader">
          <h2 className="chartTitle">Request Status Overview</h2>
          <p className="chartSubtitle">Pending, approved, and rejected access requests from the database.</p>
        </div>
        <div className="chartBody" style={{ height: '300px' }}>
          <ChartWhenVisible>
            {(ready) =>
              ready ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} barSize={48} margin={{ top: 24, right: 16, left: 8, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dy={8}
                      label={{ value: 'Request Status', position: 'insideBottom', offset: -18, fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      allowDecimals={false}
                      domain={[0, 'auto']}
                      label={{ value: 'Number of Requests', angle: -90, position: 'insideLeft', offset: 8, fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [value, 'Requests']}
                    />
                    <Legend verticalAlign="top" height={28} iconType="square" formatter={() => 'Access Requests'} />
                    <Bar
                      dataKey="value"
                      name="Requests"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive
                      animationDuration={CHART_ANIMATION.duration}
                      animationBegin={CHART_ANIMATION.begin}
                    >
                      {statusChartData.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <LabelList dataKey="value" position="top" fill="#111827" fontSize={12} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null
            }
          </ChartWhenVisible>
        </div>
        <div className="chartLegendManual">
          {statusChartData.map(entry => (
            <span key={entry.name} className="chartLegendItem">
              <span className="chartLegendDot" style={{ backgroundColor: entry.color }} />
              {entry.name}: {entry.value}
            </span>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} data-no-scroll-reveal>
          <div className="card animateSlideUp" style={{ width: '440px', maxWidth: '92%' }}>
            <h2 style={{ marginBottom: '16px' }}>Request Details</h2>
            <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#4b5563', display: 'grid', gap: '8px' }}>
              <p style={{ margin: 0 }}><strong>Name:</strong> {selectedUser.full_name}</p>
              <p style={{ margin: 0 }}><strong>Email:</strong> {selectedUser.email}</p>
              <p style={{ margin: 0 }}><strong>Designation:</strong> {selectedUser.designation || '—'}</p>
              <p style={{ margin: 0 }}><strong>Current Progress:</strong> {selectedUser.questions_completed || 0} / {selectedUser.question_limit || 0}</p>
              <p style={{ margin: 0 }}><strong>New Questions Requested:</strong> {Math.max(Number(selectedUser.question_limit || 0) - Number(selectedUser.questions_completed || 0), 0) || selectedUser.question_limit || 15}</p>
              <p style={{ margin: 0 }}><strong>Requested At:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
              <p style={{ margin: 0 }}><strong>Current Expiry:</strong> {formatExpiry(selectedUser.expiry_date)}</p>
            </div>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                Questions to Add
                <input
                  type="number"
                  min={1}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                Expiry Date & Time
                <input
                  type="datetime-local"
                  value={expiryInput}
                  onChange={(e) => setExpiryInput(e.target.value)}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.8rem' }}>
                  Controls how long the user&apos;s email/password access remains valid. Leave blank for no expiry.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                className="outlineBtn"
                onClick={() => setSelectedUser(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedUser.id, 'reject')}
                disabled={busy}
                style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
              >
                Reject
              </button>
              <button
                onClick={() => handleAction(selectedUser.id, 'approve')}
                disabled={busy}
                style={{ backgroundColor: '#4338ca', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
              >
                Approve User
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
