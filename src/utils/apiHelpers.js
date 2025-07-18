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
