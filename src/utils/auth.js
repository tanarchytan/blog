import { parseCookies } from './cookies.js';

// Enhanced fingerprint generation with validation
function generateBrowserFingerprint(request) {
  const userAgent = request.headers.get('User-Agent') || '';
  const acceptLanguage = request.headers.get('Accept-Language') || '';
  const acceptEncoding = request.headers.get('Accept-Encoding') || '';
  
  // Ensure we have minimum required headers
  if (!userAgent) {
    return null; // Force authentication failure if no user agent
  }
  
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return Array.from(new TextEncoder().encode(fingerprint))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Enhanced session validation with strict security checks
export async function checkAdminAuth(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return { authenticated: false };

  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies.admin_session;

  if (!sessionToken) return { authenticated: false };

  try {
    const session = await env.BLOG_POSTS.get(`session_${sessionToken}`);
    if (!session) return { authenticated: false };

    const sessionData = JSON.parse(session);
    
    // Check expiration
    if (new Date() > new Date(sessionData.expires)) {
      await env.BLOG_POSTS.delete(`session_${sessionToken}`);
      return { authenticated: false };
    }

    // Enhanced browser fingerprint validation
    const currentFingerprint = generateBrowserFingerprint(request);
    const currentUserAgent = request.headers.get('User-Agent') || '';
    
    // Strict validation - require both fingerprint and user agent match
    if (!sessionData.browserFingerprint || !sessionData.userAgent) {
      await env.BLOG_POSTS.delete(`session_${sessionToken}`);
      
      // Log security event for incomplete session data
      await env.BLOG_POSTS.put(`security_invalid_${Date.now()}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionToken: sessionToken,
        reason: 'incomplete_session_data',
        ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
      }), { expirationTtl: 604800 });
      
      return { authenticated: false, reason: 'incomplete_session_data' };
    }

    if (sessionData.browserFingerprint !== currentFingerprint) {
      await env.BLOG_POSTS.delete(`session_${sessionToken}`);
      
      // Log security event for fingerprint mismatch
      await env.BLOG_POSTS.put(`security_hijack_${Date.now()}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionToken: sessionToken,
        reason: 'fingerprint_mismatch',
        ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown',
        originalFingerprint: sessionData.browserFingerprint,
        currentFingerprint: currentFingerprint
      }), { expirationTtl: 604800 });
      
      return { authenticated: false, reason: 'fingerprint_mismatch' };
    }

    if (sessionData.userAgent !== currentUserAgent) {
      await env.BLOG_POSTS.delete(`session_${sessionToken}`);
      
      // Log security event for user agent mismatch
      await env.BLOG_POSTS.put(`security_hijack_${Date.now()}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionToken: sessionToken,
        reason: 'user_agent_mismatch',
        ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown',
        originalUserAgent: sessionData.userAgent,
        currentUserAgent: currentUserAgent
      }), { expirationTtl: 604800 });
      
      return { authenticated: false, reason: 'user_agent_mismatch' };
    }

    return { authenticated: true, sessionToken };
  } catch (error) {
    return { authenticated: false };
  }
}

export function generateSessionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility function to validate session data completeness
export function validateSessionData(sessionData) {
  const requiredFields = ['browserFingerprint', 'userAgent', 'created', 'expires'];
  return requiredFields.every(field => sessionData[field]);
}

// Utility function to check if session is expired
export function isSessionExpired(sessionData) {
  return new Date() > new Date(sessionData.expires);
}
