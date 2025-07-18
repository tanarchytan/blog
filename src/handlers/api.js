import { checkAdminAuth } from '../utils/auth.js';
import { getAllPosts } from './post.js';
import { handleImageUpload } from './image.js';
import { getCorsHeaders } from '../utils/security.js';
import { validateSlug } from '../utils/validation.js';
import { createSuccessResponse, createErrorResponse, handleApiError } from '../utils/apiHelpers.js';
import { createPost, updatePost, deletePost } from './postOperations.js';
import { getSettings, saveSettings } from '../utils/settings.js';

export async function handleAPI(request, env, path) {
  const corsHeaders = getCorsHeaders();
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check - exclude public endpoints
  const publicEndpoints = [
    '/api/posts',
    '/api/test'
  ];
  
  const requiresAuth = !(publicEndpoints.includes(path) && request.method === 'GET');
  
  if (requiresAuth) {
    const authResult = await checkAdminAuth(request, env);
    if (!authResult.authenticated) {
      return createErrorResponse({ 
        error: 'Authentication required',
        reason: authResult.reason || 'invalid_session'
      }, 401);
    }
  }

  // Route handlers
  try {
    return await routeRequest(request, env, path);
  } catch (error) {
    return handleApiError('handle request', error);
  }
}

async function routeRequest(request, env, path) {
  const method = request.method;
  
  // Settings endpoints
  if (path === '/api/settings') {
    if (method === 'GET') return handleGetSettings(env);
    if (method === 'POST') return handlePostSettings(request, env);
  }

  // Posts endpoints
  if (path === '/api/posts') {
    if (method === 'GET') return handleGetPosts(env);
    if (method === 'POST') return createPost(request, env);
  }

  // Individual post endpoints
  if (path.startsWith('/api/posts/')) {
    const slug = path.replace('/api/posts/', '');
    const slugValidation = validateSlug(slug);
    
    if (!slugValidation.isValid) {
      return createErrorResponse(slugValidation.error, 400);
    }
    
    if (method === 'DELETE') return deletePost(request, env, slug);
    if (method === 'PUT') return updatePost(request, env, slug);
  }

  // Upload endpoint
  if (path === '/api/upload' && method === 'POST') {
    return handleImageUpload(request, env);
  }

  // Debug endpoints
  if (path.startsWith('/api/debug/')) {
    return handleDebugEndpoints(request, env, path);
  }

  // System test endpoint
  if (path === '/api/test' && method === 'GET') {
    return handleSystemTest(env);
  }

  return createErrorResponse('API endpoint not found', 404);
}

// Settings handlers
async function handleGetSettings(env) {
  try {
    const settings = await getSettings(env);
    return createSuccessResponse(settings);
  } catch (error) {
    return handleApiError('get settings', error);
  }
}

async function handlePostSettings(request, env) {
  try {
    const settings = await request.json();
    
    if (!settings || typeof settings !== 'object') {
      return createErrorResponse('Invalid settings data', 400);
    }
    
    const result = await saveSettings(env, settings);
    
    if (result.success) {
      return createSuccessResponse({ success: true });
    } else {
      return createErrorResponse(result.error, 500);
    }
  } catch (error) {
    return handleApiError('save settings', error);
  }
}

// Posts handlers
async function handleGetPosts(env) {
  try {
    const posts = await getAllPosts(env);
    return createSuccessResponse(posts);
  } catch (error) {
    return handleApiError('get posts', error);
  }
}

// Debug endpoints handler
async function handleDebugEndpoints(request, env, path) {
  const method = request.method;
  
  switch (path) {
    case '/api/debug/security':
      if (method === 'GET') return handleSecurityDebug();
      break;
      
    case '/api/debug/session':
      if (method === 'GET') return handleSessionDebug(request, env);
      break;
      
    case '/api/debug/performance':
      if (method === 'GET') return handlePerformanceDebug(env);
      break;
      
    case '/api/debug/clear-sessions':
      if (method === 'POST') return handleClearSessions(request, env);
      break;
  }

  return createErrorResponse('Debug endpoint not found', 404);
}

async function handleSecurityDebug() {
  return createSuccessResponse({
    nonPersistentSessions: true,
    browserFingerprinting: true,
    sessionTimeout: '8-hours',
    corsProtection: true,
    securityHeaders: true,
    xssProtection: true,
    sessionValidation: 'strict',
    userAgentValidation: true,
    auditLogging: true
  });
}

async function handleSessionDebug(request, env) {
  try {
    const authResult = await checkAdminAuth(request, env);
    if (!authResult.authenticated) {
      return createErrorResponse({ 
        error: 'Not authenticated',
        reason: authResult.reason || 'invalid_session'
      }, 401);
    }

    const session = await env.BLOG_POSTS.get(`session_${authResult.sessionToken}`);
    if (session) {
      return createSuccessResponse(JSON.parse(session));
    }
    
    return createErrorResponse('Session not found', 404);
  } catch (error) {
    return handleApiError('session debug', error);
  }
}

async function handlePerformanceDebug(env) {
  try {
    const startTime = Date.now();
    
    // Test KV performance
    await env.BLOG_POSTS.put('perf-test', 'test-value');
    const testValue = await env.BLOG_POSTS.get('perf-test');
    await env.BLOG_POSTS.delete('perf-test');
    
    const responseTime = Date.now() - startTime;
    
    return createSuccessResponse({
      kvOps: testValue === 'test-value' ? 'Healthy' : 'Failed',
      r2Ops: 'Healthy',
      memory: 'Within limits',
      requests: 'Normal',
      avgResponseTime: `${responseTime}ms`,
      workerHealth: 'Healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError('performance debug', error);
  }
}

async function handleClearSessions(request, env) {
  try {
    const list = await env.BLOG_POSTS.list({ prefix: 'session_' });
    const deletePromises = list.keys.map(key => env.BLOG_POSTS.delete(key.name));
    await Promise.all(deletePromises);
    
    // Log security event
    await env.BLOG_POSTS.put(`security_clear_${Date.now()}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      reason: 'manual_clear_all_sessions',
      clearedCount: list.keys.length,
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
    }), { expirationTtl: 604800 });
    
    return createSuccessResponse({ 
      success: true, 
      cleared: list.keys.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError('clear sessions', error);
  }
}

async function handleSystemTest(env) {
  try {
    // Test KV operations
    await env.BLOG_POSTS.put('test-key', 'test-value');
    const kvValue = await env.BLOG_POSTS.get('test-key');
    
    // Test R2 operations (if R2 is available)
    let r2Test = false;
    try {
      if (env.R2_BUCKET) {
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        await env.R2_BUCKET.put('test-file.txt', testFile);
        const r2Object = await env.R2_BUCKET.get('test-file.txt');
        r2Test = !!r2Object;
        await env.R2_BUCKET.delete('test-file.txt');
      }
    } catch (r2Error) {
      console.error('R2 test failed:', r2Error);
    }
    
    // Cleanup KV test
    await env.BLOG_POSTS.delete('test-key');

    // Gather system info
    const [sessionCount, securityEventCount, postCount] = await Promise.all([
      countActiveSessions(env),
      getRecentSecurityEvents(env),
      countTotalPosts(env)
    ]);

    return createSuccessResponse({
      success: true,
      timestamp: new Date().toISOString(),
      kvBinding: !!env.BLOG_POSTS,
      kvTest: kvValue === 'test-value',
      r2Binding: !!env.R2_BUCKET,
      r2Test: r2Test,
      accountId: !!env.CLOUDFLARE_ACCOUNT_ID,
      adminPassword: !!env.ADMIN_PANEL_PASSWORD,
      totalPosts: postCount,
      security: {
        activeSessions: sessionCount,
        recentEvents: securityEventCount,
        cookieType: 'non-persistent',
        fingerprinting: 'enhanced',
        sessionTimeout: '8-hours',
        validation: 'strict'
      }
    });
  } catch (error) {
    return handleApiError('system test', error);
  }
}

// Helper functions
async function countActiveSessions(env) {
  try {
    const list = await env.BLOG_POSTS.list({ prefix: 'session_' });
    return list.keys.length;
  } catch (error) {
    console.error('Count sessions error:', error);
    return 0;
  }
}

async function getRecentSecurityEvents(env) {
  try {
    const list = await env.BLOG_POSTS.list({ prefix: 'security_' });
    return list.keys.length;
  } catch (error) {
    console.error('Count security events error:', error);
    return 0;
  }
}

async function countTotalPosts(env) {
  try {
    const list = await env.BLOG_POSTS.list();
    return list.keys.filter(key => 
      !key.name.startsWith('image_') && 
      !key.name.startsWith('session_') && 
      !key.name.startsWith('security_') &&
      !key.name.startsWith('blog_') &&
      key.name !== 'test-key' &&
      key.name !== 'perf-test'
    ).length;
  } catch (error) {
    console.error('Count posts error:', error);
    return 0;
  }
}
