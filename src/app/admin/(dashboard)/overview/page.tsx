import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import OverviewClient from './OverviewClient';

export default async function OverviewPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) redirect('/admin/login');
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/admin/login');

  const [
    { data: users },
    { data: questions },
    { data: responses }
  ] = await Promise.all([
    supabase.from('users').select('status, created_at, expiry_date'),
    supabase.from('questions').select('category'),
    supabase.from('responses').select('rating')
  ]);

  const safeUsers = users || [];
  const safeQuestions = questions || [];
  const safeResponses = responses || [];
  const now = new Date();

  // KPIs
  const totalUsers = safeUsers.length;
  const pendingUsers = safeUsers.filter(u => u.status === 'pending').length;
  const approvedUsers = safeUsers.filter(u => {
    if (u.status !== 'approved') return false;
    if (!u.expiry_date) return true;
    return new Date(u.expiry_date) >= now;
  }).length;
  const totalQuestions = safeQuestions.length;
  const totalResponsesCount = safeResponses.length;

  let totalRating = 0;
  safeResponses.forEach(r => { totalRating += (r.rating || 0); });
  const avgRating = totalResponsesCount > 0 ? (totalRating / totalResponsesCount).toFixed(1) : '0.0';

  // 1. Users by Status (include Expired derived from expiry_date)
  const statusOrder = ['pending', 'approved', 'rejected', 'suspended', 'expired'] as const;
  const statusMap: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    expired: 0,
  };

  safeUsers.forEach(u => {
    const isExpired =
      u.status === 'approved' &&
      u.expiry_date &&
      new Date(u.expiry_date) < now;

    if (isExpired) {
      statusMap.expired++;
    } else if (statusMap[u.status] !== undefined) {
      statusMap[u.status]++;
    } else {
      statusMap[u.status] = 1;
    }
  });

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
    expired: 'Expired',
  };

  const usersByStatusData = statusOrder.map(k => ({
    name: statusLabels[k],
    value: statusMap[k],
    status: k,
  }));

  // 2. Question Distribution by Category (sorted by count, highest first)
  const catMap: Record<string, number> = {};
  safeQuestions.forEach(q => {
    const cat = (q.category || 'Uncategorized').trim() || 'Uncategorized';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const questionTotal = safeQuestions.length;
  const questionCategoryData = Object.keys(catMap)
    .map(k => {
      const value = catMap[k];
      const percent = questionTotal > 0
        ? Math.round((value / questionTotal) * 1000) / 10
        : 0;
      return {
        name: k,
        value,
        percent,
        label: `${value} (${percent}%)`,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Helper for dates (last 7 days)
  const getDaysArray = (days: number) => {
    const arr: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split('T')[0]);
    }
    return arr;
  };

  const formatDayLabel = (isoDate: string) => {
    const d = new Date(isoDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const last7Days = getDaysArray(7);

  // 3. Daily Registrations
  const regMap: Record<string, number> = {};
  last7Days.forEach(d => { regMap[d] = 0; });
  safeUsers.forEach(u => {
    const d = u.created_at?.split('T')[0];
    if (d && regMap[d] !== undefined) regMap[d]++;
  });
  const dailyRegData = last7Days.map(k => ({
    name: formatDayLabel(k),
    fullDate: k,
    value: regMap[k],
  }));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Admin Console</h1>
        <p style={{ color: '#4b5563' }}>Welcome back! Here&apos;s a live snapshot of your platform.</p>
      </div>

      <OverviewClient
        kpis={{ totalUsers, pendingUsers, approvedUsers, totalQuestions, totalResponsesCount, avgRating }}
        charts={{ usersByStatusData, questionCategoryData, dailyRegData }}
      />
    </div>
  );
}
