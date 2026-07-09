import { randomUUID } from 'node:crypto'

function safeErrorType(error: unknown): string {
  const type = error instanceof Error ? error.name : typeof error
  return /^[A-Za-z0-9_. -]{1,80}$/.test(type) ? type : 'Error'
}

export function logInternalError(context: string, error: unknown): string {
  const eventId = `err_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  console.error(context, { eventId, type: safeErrorType(error) })
  return eventId
}

export function internalErrorBody(eventId: string) {
  return { error: 'internal_server_error', eventId }
}
