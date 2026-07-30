type UserProgressRow = {
  id: string;
  question_limit?: number | null;
  questions_completed?: number | null;
  has_submitted?: boolean | null;
};

type ResponseProgressRow = {
  user_id?: string | null;
  question_id?: number | string | null;
};

export function getCompletedQuestionCountsByUser(responses: ResponseProgressRow[] = []) {
  const completedByUser = new Map<string, Set<number | string>>();

  responses.forEach((response) => {
    if (!response.user_id || response.question_id === null || response.question_id === undefined) return;
    if (!completedByUser.has(response.user_id)) completedByUser.set(response.user_id, new Set());
    completedByUser.get(response.user_id)?.add(response.question_id);
  });

  return completedByUser;
}

export function hydrateUsersWithQuestionProgress<T extends UserProgressRow>(
  users: T[] = [],
  responses: ResponseProgressRow[] = []
) {
  return users.map((user) => ({
    ...user,
    questions_completed: Number(user.questions_completed || 0),
    question_limit: Number(user.question_limit || 0),
    has_submitted: Boolean(user.has_submitted),
  }));
}