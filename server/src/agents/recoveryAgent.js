export function recoverAction(error, attempt) {
  return { recovered: attempt < 1, message: attempt < 1 ? `Retrying after: ${error.message}` : `Escalated after retry: ${error.message}` };
}