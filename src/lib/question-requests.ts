import { supabase } from '@/lib/supabase';

export type QuestionRequest = {
  id: number;
  user_id: string;
  user_email: string;
  requested_count: number;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at: string;
};

const LOG_PENDING = 'question_request';
const LOG_APPROVED = 'question_request_approved';
const LOG_REJECTED = 'question_request_rejected';

function parseLogDetails(details: string | null): any {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return null;
  }
  return null;
}

export async function listPendingQuestionRequests(): Promise<QuestionRequest[]> {
  const { data, error } = await supabase
    .from('admin_logs')
    .select('id, target_user_id, details, created_at, action_type')
    .eq('action_type', LOG_PENDING)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || [])
    .map((row) => {
      const details = parseLogDetails(row.details);
      if (details?.kind === 'question_request' && details?.status === 'pending') {
        return {
          id: row.id,
          user_id: row.target_user_id,
          user_email: details.user_email,
          requested_count: Number(details.requested_count || 0),
          status: 'pending' as const,
          created_at: row.created_at,
        };
      }
      return null;
    })
    .filter(Boolean) as QuestionRequest[];
}

export async function getPendingRequestForUser(userId: string): Promise<QuestionRequest | null> {
  const { data, error } = await supabase
    .from('admin_logs')
    .select('id, target_user_id, details, created_at, action_type')
    .eq('action_type', LOG_PENDING)
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  for (const row of data || []) {
    const details = parseLogDetails(row.details);
    if (details?.kind === 'question_request' && details?.status === 'pending') {
      return {
        id: row.id,
        user_id: row.target_user_id,
        user_email: details.user_email,
        requested_count: Number(details.requested_count || 0),
        status: 'pending' as const,
        created_at: row.created_at,
      };
    }
  }

  return null;
}

export async function createQuestionRequest(input: {
  userId: string;
  email: string;
  requestedCount: number;
}): Promise<QuestionRequest> {
  const { userId, email, requestedCount } = input;
  
  // Clear any existing pending requests for this user
  const existingReqs = await supabase
    .from('admin_logs')
    .select('id, details')
    .eq('action_type', LOG_PENDING)
    .eq('target_user_id', userId);
    
  if (existingReqs.data) {
    for (const log of existingReqs.data) {
      const details = parseLogDetails(log.details);
      if (details?.kind === 'question_request' && details?.status === 'pending') {
        await supabase.from('admin_logs').delete().eq('id', log.id);
      }
    }
  }

  const details = JSON.stringify({
    kind: 'question_request',
    user_email: email,
    requested_count: requestedCount,
    status: 'pending',
  });

  const { data: logRow, error: logError } = await supabase
    .from('admin_logs')
    .insert([{
      action_type: LOG_PENDING,
      target_user_id: userId,
      details,
    }])
    .select('id, target_user_id, details, created_at')
    .maybeSingle();

  if (logError || !logRow) {
    throw new Error(logError?.message || 'Failed to save question request');
  }

  await supabase.from('notifications').insert([{
    type: 'system_alert',
    message: `New questions request from ${email} (${requestedCount} questions)`,
    is_read: false,
  }]);

  return {
    id: logRow.id,
    user_id: logRow.target_user_id,
    user_email: email,
    requested_count: requestedCount,
    status: 'pending',
    created_at: logRow.created_at,
  };
}

export async function resolveQuestionRequest(input: {
  requestId: number;
  action: 'approve' | 'reject';
  approvedCount?: number;
}): Promise<{ success: true }> {
  const { requestId, action, approvedCount } = input;
  
  const { data: logRow, error: logError } = await supabase
    .from('admin_logs')
    .select('id, target_user_id, details, created_at')
    .eq('id', requestId)
    .eq('action_type', LOG_PENDING)
    .maybeSingle();

  if (logError || !logRow) throw new Error('Request not found');

  const details = parseLogDetails(logRow.details);
  if (!details || details.status !== 'pending') throw new Error('Request already processed or invalid');

  if (action === 'approve') {
    const countToAdd = approvedCount !== undefined ? approvedCount : Number(details.requested_count);
    
    // Get current user limit
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('question_limit, questions_completed')
      .eq('id', logRow.target_user_id)
      .single();
      
    if (userError || !user) throw new Error('User not found');
    
    const currentLimit = Number(user.question_limit || 0);
    const newLimit = currentLimit + countToAdd;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        question_limit: newLimit,
        has_submitted: false
      })
      .eq('id', logRow.target_user_id);

    if (updateError) throw new Error(updateError.message);
  }

  // Update the log to approved/rejected
  const { error: updateError } = await supabase
    .from('admin_logs')
    .update({
      action_type: action === 'approve' ? LOG_APPROVED : LOG_REJECTED,
      details: JSON.stringify({
        kind: 'question_request',
        user_email: details.user_email,
        requested_count: details.requested_count,
        approved_count: action === 'approve' ? approvedCount : 0,
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      }),
    })
    .eq('id', requestId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from('admin_logs').insert([{
    action_type: action === 'approve' ? LOG_APPROVED : LOG_REJECTED,
    target_user_id: logRow.target_user_id,
    details: `${action === 'approve' ? 'Approved' : 'Rejected'} request for ${details.user_email}`,
  }]);

  await supabase.from('notifications').insert([{
    type: action === 'approve' ? 'user_approved' : 'user_rejected',
    message: `Question request ${action === 'approve' ? 'approved' : 'rejected'} for ${details.user_email}`,
    is_read: false,
  }]);

  return { success: true };
}
