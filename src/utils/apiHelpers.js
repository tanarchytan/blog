import { getCorsHeaders } from './security.js';

export function createSuccessResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() }
  });
}

export function createErrorResponse(error, status = 500) {
  const errorData = typeof error === 'string' ? { error } : error;
  
  return new Response(JSON.stringify(errorData), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders() }
  });
}

export function createValidationErrorResponse(errors) {
  return createErrorResponse({ 
    error: 'Validation failed', 
    details: errors 
  }, 400);
}

export async function handleApiError(operation, error) {
  console.error(`API Error in ${operation}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  return createErrorResponse({
    error: `Failed to ${operation}`,
    details: error.message
  });
}

export function createAuthErrorResponse(reason = 'invalid_session') {
  return createErrorResponse({ 
    error: 'Authentication required',
    reason: reason
  }, 401);
}

export function createNotFoundResponse(message = 'Resource not found') {
  return createErrorResponse(message, 404);
}

export function createConflictResponse(message, conflictData = null) {
  const errorData = { error: message };
  if (conflictData) {
    errorData.conflict = conflictData;
  }
  
  return createErrorResponse(errorData, 409);
}
