import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import PendingClient from './PendingClient';
import { hydrateUsersWithQuestionProgress } from '@/lib/question-progress';

export default async function PendingPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) redirect('/admin/login');

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/admin/login');

  const [
    { data: pendingUsers },
    { data: statusRows },
    { data: responses },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, designation, question_limit, questions_completed, expiry_date, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('status'),
    supabase
      .from('responses')
      .select('user_id, question_id'),
  ]);

  const safeStatusRows = statusRows || [];
  const pendingUsersSafe = hydrateUsersWithQuestionProgress(pendingUsers || [], responses || []);
  const pendingCount = safeStatusRows.filter(u => u.status === 'pending').length || pendingUsersSafe.length;
  const approvedCount = safeStatusRows.filter(u => u.status === 'approved').length;
  const rejectedCount = safeStatusRows.filter(u => u.status === 'rejected').length;

  const stats = {
    pendingCount: Number(pendingCount) || 0,
    approvedCount: Number(approvedCount) || 0,
    rejectedCount: Number(rejectedCount) || 0,
  };

  return (
    <div className="animateFadeIn">
      <PendingClient
        users={pendingUsersSafe}
        stats={stats}
      />
    </div>
  );
}
