import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

type TargetUser = {
  id: string;
  full_name: string;
  email: string;
  designation?: string | null;
  status?: string | null;
  expiry_date?: string | null;
  questions_completed?: number | null;
  question_limit?: number | null;
  has_submitted?: boolean | null;
};

async function getLifetimeCompletedQuestions(userId: string) {
  const { data } = await supabase
    .from('responses')
    .select('question_id')
    .eq('user_id', userId);

  return new Set((data || []).map(r => r.question_id).filter(Boolean)).size;
}
async function syncUserQuestions(userId: string, totalQuestionLimit: number, completedQuestions: number) {
  const targetAssignedCount = Math.max(totalQuestionLimit - completedQuestions, 0);

  const { data: assigned } = await supabase
    .from('questions')
    .select('id, status')
    .eq('assigned_to', userId);

  const currentlyAssigned = (assigned || []).filter(q => q.status === 'assigned');
  const assignedCount = currentlyAssigned.length;

  if (assignedCount < targetAssignedCount) {
    const diff = targetAssignedCount - assignedCount;
    const { data: available } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'available');

    const shuffled = (available || []).sort(() => 0.5 - Math.random());
    const toAssign = shuffled.slice(0, diff).map(q => q.id);

    if (toAssign.length > 0) {
      await supabase
        .from('questions')
        .update({
          status: 'assigned',
          assigned_to: userId,
          assigned_at: new Date().toISOString(),
        })
        .in('id', toAssign);
    }
  } else if (assignedCount > targetAssignedCount) {
    const diff = assignedCount - targetAssignedCount;
    const toUnassign = currentlyAssigned.slice(0, diff).map(q => q.id);

    if (toUnassign.length > 0) {
      await supabase
        .from('questions')
        .update({
          status: 'available',
          assigned_to: null,
          assigned_at: null,
        })
        .in('id', toUnassign);
    }
  }
}

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (payload?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, action, expiryDate, questionLimit, newPassword } = await req.json();

    let targetUser: TargetUser | null = null;
    if (userId) {
      const { data } = await supabase
        .from('users')
        .select('id,full_name, email, designation, status, expiry_date, questions_completed, question_limit, has_submitted')
        .eq('id', userId)
        .maybeSingle();
      targetUser = data;
    }

    const requestedLimit = Number(questionLimit);
    const hasRequestedLimit = questionLimit !== undefined && questionLimit !== null && !Number.isNaN(requestedLimit) && requestedLimit > 0;
    const lifetimeCompleted = targetUser ? await getLifetimeCompletedQuestions(targetUser.id) : 0;
    const completedQuestions = lifetimeCompleted;
    const storedQuestionLimit = Math.max(Number(targetUser?.question_limit || 0), completedQuestions);
    const isRenewedPendingApproval = Boolean((action === 'approve' || action === 'reactivate') && targetUser?.status === 'pending' && completedQuestions > 0);
    let effectiveQuestionLimit = hasRequestedLimit ? requestedLimit : storedQuestionLimit;

    if ((action === 'approve' || action === 'reactivate') && hasRequestedLimit) {
      effectiveQuestionLimit = isRenewedPendingApproval && requestedLimit <= completedQuestions
        ? completedQuestions + requestedLimit
        : Math.max(requestedLimit, completedQuestions);
    }

    let updateData: any = {};

    if (action === 'approve' || action === 'reactivate') {
      updateData = { status: 'approved' };
      if (expiryDate) updateData.expiry_date = expiryDate;
      if (effectiveQuestionLimit > 0) updateData.question_limit = effectiveQuestionLimit;
      updateData.questions_completed = completedQuestions;
      updateData.has_submitted = effectiveQuestionLimit > 0 && completedQuestions >= effectiveQuestionLimit;
    } else if (action === 'reject') {
      updateData = { status: 'rejected' };
    } else if (action === 'suspend') {
      updateData = { status: 'suspended' };
    } else if (action === 'change_expiry') {
      updateData = { expiry_date: expiryDate || null };
    } else if (action === 'change_limit') {
      if (!hasRequestedLimit) {
        return NextResponse.json({ error: 'Question limit required' }, { status: 400 });
      }
      updateData = { question_limit: Math.max(requestedLimit, completedQuestions) };
    } else if (action === 'reset_password') {
      if (!newPassword) return NextResponse.json({ error: 'New password required' }, { status: 400 });
      const salt = await bcrypt.genSalt(10);
      updateData = { password_hash: await bcrypt.hash(newPassword, salt) };
    }

    if (action === 'delete') {
      let logDetails = 'Deleted user';
      if (targetUser) {
        logDetails = `Deleted user - ${targetUser.full_name} (${targetUser.email})`;
        if (targetUser.designation) logDetails += `, ${targetUser.designation}`;
      }

      await supabase.from('admin_logs').insert([{
        action_type: action,
        target_user_id: null,
        details: logDetails,
      }]);

      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    } else if (action === 'reset_submission') {
      const { error: userError } = await supabase
        .from('users')
        .update({
          has_submitted: false,
          questions_completed: 0,
        })
        .eq('id', userId);

      if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

      const { error: qError } = await supabase
        .from('questions')
        .update({ status: 'assigned' })
        .eq('assigned_to', userId);

      if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });

      const { error: rError } = await supabase
        .from('responses')
        .delete()
        .eq('user_id', userId);

      if (rError) return NextResponse.json({ error: rError.message }, { status: 500 });

      await supabase.from('review_progress').delete().eq('user_id', userId);
    } else {
      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

      if (action === 'approve' || action === 'reactivate' || action === 'change_limit') {
        const targetLimit = action === 'change_limit'
          ? Math.max(requestedLimit, completedQuestions)
          : Number(effectiveQuestionLimit || targetUser?.question_limit || 10);
        await syncUserQuestions(userId, targetLimit, completedQuestions);
      }
    }

    let logDetails = `Admin performed "${action}"`;
    if (targetUser) {
      logDetails = `${action} - ${targetUser.full_name} (${targetUser.email})`;
      if (targetUser.designation) logDetails += `, ${targetUser.designation}`;
    }

    if (action === 'change_limit' && hasRequestedLimit) {
      logDetails += `. New cumulative question limit: ${Math.max(requestedLimit, completedQuestions)}`;
    }
    if ((action === 'approve' || action === 'change_expiry' || action === 'reactivate') && expiryDate) {
      logDetails += `. Expiry set to ${new Date(expiryDate).toLocaleDateString()}`;
    }
    if ((action === 'approve' || action === 'reactivate') && effectiveQuestionLimit) {
      logDetails += `. Cumulative question limit: ${effectiveQuestionLimit}`;
      if (isRenewedPendingApproval && hasRequestedLimit && requestedLimit <= completedQuestions) {
        logDetails += `. Newly assigned questions: ${requestedLimit}`;
      }
    }

    await supabase.from('admin_logs').insert([{
      action_type: action,
      target_user_id: userId || null,
      details: logDetails,
    }]);

    if (action === 'approve') {
      await supabase.from('notifications').insert([{
        type: 'user_approved',
        message: `Approved user: ${targetUser?.full_name || userId}`,
      }]);
    } else if (action === 'reject') {
      await supabase.from('notifications').insert([{
        type: 'user_rejected',
        message: `Rejected user: ${targetUser?.full_name || userId}`,
      }]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}