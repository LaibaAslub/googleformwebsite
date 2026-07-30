import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { listPendingPasswordRequests } from '@/lib/password-requests';
import ProgressClient from './ProgressClient';
import { hydrateUsersWithQuestionProgress } from '@/lib/question-progress';

export const dynamic = 'force-dynamic';

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayLabel(isoDate: string) {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthLabel(year: number, monthIndex: number) {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default async function ProgressPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) redirect('/admin/login');

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/admin/login');

  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .neq('status', 'pending')
    .order('created_at', { ascending: false });

  const activeUsers = allUsers?.filter(u => u.status === 'approved') || [];

  const { data: responses } = await supabase
    .from('responses')
    .select('user_id, question_id, rating, submitted_at');

  const { data: questions } = await supabase
    .from('questions')
    .select('id, status');

  let passwordRequests: any[] = [];
  try {
    passwordRequests = await listPendingPasswordRequests();
  } catch {
    passwordRequests = [];
  }

  const safeResponses = responses || [];
  const safeQuestions = questions || [];
  const usersWithQuestionProgress = hydrateUsersWithQuestionProgress(allUsers || [], safeResponses);

  // Per-user accuracy from real ratings (1–5 → percent)
  const ratingByUser: Record<string, { sum: number; count: number }> = {};
  safeResponses.forEach(r => {
    if (!r.user_id || !r.rating) return;
    if (!ratingByUser[r.user_id]) ratingByUser[r.user_id] = { sum: 0, count: 0 };
    ratingByUser[r.user_id].sum += r.rating;
    ratingByUser[r.user_id].count += 1;
  });

  const usersWithAccuracy = usersWithQuestionProgress.map(u => {
    const stats = ratingByUser[u.id];
    const accuracy = stats && stats.count > 0
      ? Number(((stats.sum / stats.count / 5) * 100).toFixed(1))
      : 0;
    return { ...u, accuracy };
  });

  // Average Accuracy (rating 1–5 → percent)
  let totalRating = 0;
  safeResponses.forEach(r => { totalRating += (r.rating || 0); });
  const avgAccuracy = safeResponses.length > 0 ? (totalRating / safeResponses.length / 5) * 100 : 0;

  // User assignment progress is per reviewer and may exceed the number of question-bank records.
  let totalUserCompletions = 0;
  let totalUserQuestionLimit = 0;
  usersWithQuestionProgress.forEach(u => {
    totalUserCompletions += (u.questions_completed || 0);
    totalUserQuestionLimit += (u.question_limit || 0);
  });

  const questionIds = new Set(safeQuestions.map(q => String(q.id)));
  const completedQuestionIds = new Set(
    safeResponses
      .map(r => r.question_id)
      .filter((id) => id !== null && id !== undefined && questionIds.has(String(id)))
      .map((id) => String(id))
  );
  const questionBankTotal = safeQuestions.length;
  const questionBankCompleted = Math.min(completedQuestionIds.size, questionBankTotal);
  const questionBankRemaining = Math.max(questionBankTotal - questionBankCompleted, 0);

  // Completion Goal based on unique questions completed vs total questions in the question bank
  const completionGoal = questionBankTotal > 0
    ? Math.min(100, (questionBankCompleted / questionBankTotal) * 100)
    : 0;

  // Weekly trends — last 7 days
  const weeklyMap: Record<string, number> = {};
  const weeklyKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    weeklyKeys.push(key);
    weeklyMap[key] = 0;
  }

  // Monthly trends — last 6 calendar months
  const monthlyMap: Record<string, number> = {};
  const monthlyKeys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyKeys.push(key);
    monthlyMap[key] = 0;
  }

  safeResponses.forEach(r => {
    if (!r.submitted_at) return;
    const submitted = new Date(r.submitted_at);
    const dayKey = toDateKey(submitted);
    if (weeklyMap[dayKey] !== undefined) weeklyMap[dayKey] += 1;

    const monthKey = `${submitted.getFullYear()}-${String(submitted.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap[monthKey] !== undefined) monthlyMap[monthKey] += 1;
  });

  const weeklyChartData = weeklyKeys.map(key => ({
    name: formatDayLabel(key),
    fullDate: key,
    value: weeklyMap[key],
  }));

  const monthlyChartData = monthlyKeys.map(key => {
    const [year, month] = key.split('-').map(Number);
    return {
      name: formatMonthLabel(year, month - 1),
      fullDate: key,
      value: monthlyMap[key],
    };
  });

  return (
    <div className="animateFadeIn">
      <div className="pageHeader">
        <div>
          <h1>User Progress</h1>
        </div>
      </div>

      <ProgressClient
        users={usersWithAccuracy}
        passwordRequests={passwordRequests || []}
        metrics={{
          activeReviewers: activeUsers.length,
          avgAccuracy,
          completionGoal,
          totalSubmittedResponses: safeResponses.length,
          totalUserCompletions,
          totalUserQuestionLimit,
          questionBankCompleted,
          questionBankTotal,
          questionBankRemaining,
          hasTrendData: safeResponses.length > 0,
          weeklyChartData,
          monthlyChartData,
        }}
      />
    </div>
  );
}
