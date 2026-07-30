'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend, LabelList
} from 'recharts';
import { Users, CheckCircle2, ClipboardCheck, Star } from 'lucide-react';
import { AnimatedCounter, ChartWhenVisible, CHART_ANIMATION } from '../animation';
import '../../admin.css';

type TrendPoint = { name: string; fullDate: string; value: number };
type PasswordRequestRow = {
  id: number;
  user_id: string;
  user_email: string;
  requested_password: string;
  status: string;
  created_at: string;
  source?: 'table' | 'log';
};

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; color?: string; payload?: TrendPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const point = item.payload;

  return (
    <div className="chartTooltip">
      <div className="chartTooltipTitle">{point?.name || 'Period'}</div>
      <div className="chartTooltipRow">
        <span className="chartTooltipSwatch" style={{ backgroundColor: item.color || '#4338ca' }} />
        <span>Submitted Reviews</span>
        <strong>{item.value ?? 0}</strong>
      </div>
    </div>
  );
}

function QuestionStatsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { name: string; color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const point = item.payload;

  return (
    <div className="chartTooltip">
      <div className="chartTooltipTitle">{point?.name || 'Question Metric'}</div>
      <div className="chartTooltipRow">
        <span className="chartTooltipSwatch" style={{ backgroundColor: point?.color || '#4338ca' }} />
        <span>Questions</span>
        <strong>{item.value ?? 0}</strong>
      </div>
    </div>
  );
}

export default function ProgressClient({
  users,
  metrics,
  passwordRequests = [],
}: {
  users: any[];
  metrics: any;
  passwordRequests?: PasswordRequestRow[];
}) {
  const [trendView, setTrendView] = useState<'weekly' | 'monthly'>('weekly');
  const [pwdBusy, setPwdBusy] = useState<number | null>(null);
  const [pwdRequests, setPwdRequests] = useState<PasswordRequestRow[]>(passwordRequests);

  useEffect(() => {
    setPwdRequests(passwordRequests);
  }, [passwordRequests]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#all-reviewers') {
      const el = document.getElementById('all-reviewers');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch('/api/admin/password-requests', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.requests)) {
          setPwdRequests(data.requests);
        }
      } catch {
        // keep current list on transient errors
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const chartData: TrendPoint[] =
    trendView === 'weekly'
      ? (metrics.weeklyChartData || [])
      : (metrics.monthlyChartData || []);

  const hasTrendData = Boolean(metrics.hasTrendData);
  const questionBankCompleted = Number(metrics.questionBankCompleted || 0);
  const questionBankTotal = Number(metrics.questionBankTotal || 0);
  const questionBankRemaining = Math.max(Number(metrics.questionBankRemaining || 0), 0);
  const questionStatsData = questionBankTotal > 0
    ? [
        { name: 'Total Questions', value: questionBankTotal, color: '#4338ca' },
        { name: 'Completed Questions', value: questionBankCompleted, color: '#16a34a' },
        { name: 'Remaining Questions', value: questionBankRemaining, color: '#f59e0b' },
      ]
    : [];

  const handlePasswordRequest = async (req: PasswordRequestRow, action: 'approve' | 'reject') => {
    setPwdBusy(req.id);
    try {
      const res = await fetch('/api/admin/password-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action, source: req.source }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to process request');
        return;
      }
      if (Array.isArray(data.requests)) {
        setPwdRequests(data.requests);
      } else {
        setPwdRequests((prev) => prev.filter((r) => r.id !== req.id));
      }
    } catch {
      alert('Failed to process request');
    } finally {
      setPwdBusy(null);
    }
  };

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Users size={20} color="#4338ca" />
          </div>
          <div className="kpiLabel">Active Reviewers</div>
          <div className="kpiValue"><AnimatedCounter value={metrics.activeReviewers} /></div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <CheckCircle2 size={20} color="#4338ca" />
          </div>
          <div className="kpiLabel">Avg. Answer Rating</div>
          <div className="kpiValue"><AnimatedCounter value={metrics.avgAccuracy} decimals={1} suffix="%" /></div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <ClipboardCheck size={20} color="#4338ca" />
          </div>
          <div className="kpiLabel">Submitted Reviews</div>
          <div className="kpiValue"><AnimatedCounter value={metrics.totalSubmittedResponses || 0} /></div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Star size={20} color="#4338ca" />
          </div>
          <div className="kpiLabel">Completion Goal</div>
          <div className="kpiValue"><AnimatedCounter value={metrics.completionGoal} decimals={1} suffix="%" /></div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Completion Trends</h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                {trendView === 'weekly'
                  ? 'Submitted reviews over the last 7 days'
                  : 'Submitted reviews over the last 6 months'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="outlineBtn"
                onClick={() => setTrendView('monthly')}
                style={{
                  padding: '4px 12px',
                  background: trendView === 'monthly' ? '#4338ca' : '#fff',
                  color: trendView === 'monthly' ? '#fff' : '#374151',
                  borderColor: trendView === 'monthly' ? '#4338ca' : '#d1d5db',
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                className="outlineBtn"
                onClick={() => setTrendView('weekly')}
                style={{
                  padding: '4px 12px',
                  background: trendView === 'weekly' ? '#4338ca' : '#fff',
                  color: trendView === 'weekly' ? '#fff' : '#374151',
                  borderColor: trendView === 'weekly' ? '#4338ca' : '#d1d5db',
                }}
              >
                Weekly
              </button>
            </div>
          </div>

          {!hasTrendData ? (
            <div className="chartEmptyState">No completion data available yet.</div>
          ) : (
            <div style={{ height: '280px' }}>
              <ChartWhenVisible>
                {(ready) =>
                  ready ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 24, right: 16, left: 8, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          dy={8}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          allowDecimals={false}
                          domain={[0, (dataMax: number) => Math.max(4, dataMax + 1)]}
                          width={36}
                        />
                        <Tooltip content={<TrendTooltip />} />
                        <Legend verticalAlign="top" height={28} iconType="plainline" />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Submitted Reviews"
                          stroke="#4338ca"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#4338ca', strokeWidth: 0 }}
                          activeDot={{ r: 7 }}
                          isAnimationActive
                          animationDuration={CHART_ANIMATION.duration}
                          animationBegin={CHART_ANIMATION.begin}
                        >
                          <LabelList dataKey="value" position="top" fill="#111827" fontSize={11} fontWeight={600} offset={10} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  ) : null
                }
              </ChartWhenVisible>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>System Health</h2>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '20px' }}>
            Question statistics from the Question Bank and submitted responses.
          </p>
          {questionStatsData.length === 0 ? (
            <div className="chartEmptyState">No questions available yet.</div>
          ) : (
            <>
              <div style={{ height: '260px', position: 'relative' }}>
                <ChartWhenVisible>
                  {(ready) =>
                    ready ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={questionStatsData} margin={{ top: 24, right: 8, left: 0, bottom: 48 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            angle={-24}
                            textAnchor="end"
                            height={58}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            allowDecimals={false}
                            domain={[0, (dataMax: number) => Math.max(4, dataMax + 1)]}
                            width={34}
                          />
                          <Tooltip content={<QuestionStatsTooltip />} />
                          <Legend verticalAlign="top" height={24} />
                          <Bar
                            dataKey="value"
                            name="Questions"
                            radius={[6, 6, 0, 0]}
                            isAnimationActive
                            animationDuration={CHART_ANIMATION.duration}
                            animationBegin={CHART_ANIMATION.begin}
                          >
                            {questionStatsData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                            <LabelList dataKey="value" position="top" fill="#111827" fontSize={11} fontWeight={700} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null
                  }
                </ChartWhenVisible>
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                {questionStatsData.map((item) => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span aria-hidden="true" style={{ width: '9px', height: '9px', borderRadius: '999px', backgroundColor: item.color, flex: '0 0 auto' }} />
                      {item.name}
                    </span>
                    <span style={{ color: '#111827', fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="tableContainer" id="all-reviewers">
        <div className="tableHeaderRow">
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Top Performing Reviewers</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Real-time leaderboard based on accuracy and volume</p>
          </div>
          <Link
            href="/admin/progress#all-reviewers"
            style={{ background: 'transparent', color: '#4338ca', border: 'none', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
            onClick={(e) => {
              const el = document.getElementById('all-reviewers');
              if (el && window.location.pathname.startsWith('/admin/progress')) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            View All Users
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th>Active Status</th>
              <th>Progress (Weekly Goal)</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => {
              const initials = user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
              const pct = user.question_limit > 0 ? (user.questions_completed / user.question_limit) * 100 : 0;

              return (
                <tr key={user.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                      {initials}
                    </div>
                    <div>
                      <strong>{user.full_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.designation}</div>
                    </div>
                  </td>
                  <td>
                    {user.status === 'approved' ? (
                      <span className="badge badgeYellow" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>● Active</span>
                    ) : (
                      <span className="badge badgeGray">● {user.status}</span>
                    )}
                  </td>
                  <td style={{ width: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flexGrow: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: '#4338ca', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{Math.round(pct)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Password Change Requests */}
      <div className="tableContainer" id="password-requests" style={{ marginTop: '24px' }}>
        <div className="tableHeaderRow">
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Password Change Requests</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Review user-submitted password changes. Approval updates login credentials.
            </p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>User Email</th>
              <th>Requested New Password</th>
              <th>Request Date/Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pwdRequests.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#6b7280', padding: '1.5rem' }}>
                  No pending password change requests.
                </td>
              </tr>
            )}
            {pwdRequests.map((req) => (
              <tr key={`${req.source || 'table'}-${req.id}`}>
                <td style={{ fontWeight: 500 }}>{req.user_email}</td>
                <td>
                  <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                    {req.requested_password}
                  </code>
                </td>
                <td style={{ color: '#6b7280', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {new Date(req.created_at).toLocaleString()}
                </td>
                <td>
                  <span className="badge badgeYellow" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                    Pending
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={pwdBusy === req.id}
                      onClick={() => handlePasswordRequest(req, 'approve')}
                      style={{ backgroundColor: '#4338ca', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      {pwdBusy === req.id ? '...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={pwdBusy === req.id}
                      onClick={() => handlePasswordRequest(req, 'reject')}
                      style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
