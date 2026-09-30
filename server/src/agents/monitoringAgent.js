export function summarizeExecution(status, eventCount) {
  return { status, eventCount, monitoredAt: new Date().toISOString() };
}