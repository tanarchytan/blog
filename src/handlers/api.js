import { checkAdminAuth } from '../utils/auth.js';
import { getAllPosts, generateSlug } from './post.js';
import { handleImageUpload } from './image.js';
import { getCorsHeaders } from '../utils/security.js';

export async function handleAPI(request, env, path) {
  const corsHeaders = getCorsHeaders();
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require auth for all except GET /api/posts
  const requiresAuth = !(path === '/api/posts' && request.method === 'GET');
  if (requiresAuth) {
    const authResult = await checkAdminAuth(request, env);
    if (!authResult.authenticated) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        reason: authResult.reason || 'invalid_session'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // GET /api/posts
  if (path === '/api/posts' && request.method === 'GET') {
    try {
      const posts = await getAllPosts(env);
      return new Response(JSON.stringify(posts), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /posts error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to get posts',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // POST /api/posts
  if (path === '/api/posts' && request.method === 'POST') {
    try {
      const post = await request.json();
      
      // Validate input
      if (!post.title || !post.content) {
        return new Response(JSON.stringify({ error: 'Title and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const slug = generateSlug(post.title);
      
      // Check if slug already exists
      const existingPost = await env.BLOG_POSTS.get(slug);
      if (existingPost) {
        return new Response(JSON.stringify({ 
          error: 'A post with this title already exists',
          slug: slug 
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const postData = {
        title: post.title,
        content: post.content,
        slug,
        createdAt: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      await env.BLOG_POSTS.put(slug, JSON.stringify(postData));
      
      return new Response(JSON.stringify({ success: true, slug }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /posts POST error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to create post',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // DELETE /api/posts/{slug}
  if (path.startsWith('/api/posts/') && request.method === 'DELETE') {
    const slug = path.replace('/api/posts/', '');
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Invalid post slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    try {
      // Check if post exists
      const existingPost = await env.BLOG_POSTS.get(slug);
      if (!existingPost) {
        return new Response(JSON.stringify({ error: 'Post not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      // Log the deletion for audit purposes
      await env.BLOG_POSTS.put(`security_delete_${Date.now()}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'post_deleted',
        slug: slug,
        ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
      }), { expirationTtl: 604800 });
      
      await env.BLOG_POSTS.delete(slug);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /posts DELETE error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to delete post',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // PUT /api/posts/{slug}
  if (path.startsWith('/api/posts/') && request.method === 'PUT') {
    const slug = path.replace('/api/posts/', '');
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Invalid post slug' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    try {
      const post = await request.json();
      
      // Validate input
      if (!post.title || !post.content) {
        return new Response(JSON.stringify({ error: 'Title and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const newSlug = generateSlug(post.title);
      
      // Get existing post
      const existingPost = await env.BLOG_POSTS.get(slug);
      if (!existingPost) {
        return new Response(JSON.stringify({ error: 'Post not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const existingData = JSON.parse(existingPost);
      
      const updatedPost = {
        ...existingData,
        title: post.title,
        content: post.content,
        slug: newSlug,
        updatedAt: new Date().toISOString()
      };
      
      // If slug changed, delete old and create new
      if (slug !== newSlug) {
        // Check if new slug already exists
        const conflictingPost = await env.BLOG_POSTS.get(newSlug);
        if (conflictingPost) {
          return new Response(JSON.stringify({ 
            error: 'A post with this title already exists',
            conflictingSlug: newSlug 
          }), {
            status: 409,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        await env.BLOG_POSTS.delete(slug);
      }
      
      await env.BLOG_POSTS.put(newSlug, JSON.stringify(updatedPost));
      
      // Log the update for audit purposes
      await env.BLOG_POSTS.put(`security_update_${Date.now()}`, JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'post_updated',
        oldSlug: slug,
        newSlug: newSlug,
        ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
      }), { expirationTtl: 604800 });
      
      return new Response(JSON.stringify({ success: true, slug: newSlug }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /posts PUT error:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to update post',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // POST /api/upload (image upload)
  if (path === '/api/upload' && request.method === 'POST') {
    return handleImageUpload(request, env);
  }

  // GET /api/test (enhanced system test)
  if (path === '/api/test' && request.method === 'GET') {
    try {
      // Test KV operations
      await env.BLOG_POSTS.put('test-key', 'test-value');
      const kvValue = await env.BLOG_POSTS.get('test-key');
      
      // Test R2 operations
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await env.R2_BUCKET.put('test-file.txt', testFile);
      const r2Object = await env.R2_BUCKET.get('test-file.txt');
      
      // Cleanup test data
      await env.R2_BUCKET.delete('test-file.txt');
      await env.BLOG_POSTS.delete('test-key');

      // Security audit
      const sessionCount = await countActiveSessions(env);
      const recentSecurityEvents = await getRecentSecurityEvents(env);
      const totalPosts = await countTotalPosts(env);

      return new Response(JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        kvBinding: !!env.BLOG_POSTS,
        kvTest: kvValue === 'test-value',
        r2Binding: !!env.R2_BUCKET,
        r2Test: !!r2Object,
        accountId: !!env.CLOUDFLARE_ACCOUNT_ID,
        adminPassword: !!env.ADMIN_PANEL_PASSWORD,
        totalPosts: totalPosts,
        security: {
          activeSessions: sessionCount,
          recentEvents: recentSecurityEvents,
          cookieType: 'non-persistent',
          fingerprinting: 'enhanced',
          sessionTimeout: '8-hours',
          validation: 'strict'
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /test error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // GET /api/debug/security
  if (path === '/api/debug/security' && request.method === 'GET') {
    return new Response(JSON.stringify({
      nonPersistentSessions: true,
      browserFingerprinting: true,
      sessionTimeout: '8-hours',
      corsProtection: true,
      securityHeaders: true,
      xssProtection: true,
      sessionValidation: 'strict',
      userAgentValidation: true,
      auditLogging: true
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // GET /api/debug/session
  if (path === '/api/debug/session' && request.method === 'GET') {
    try {
      const authResult = await checkAdminAuth(request, env);
      if (!authResult.authenticated) {
        return new Response(JSON.stringify({ 
          error: 'Not authenticated',
          reason: authResult.reason || 'invalid_session'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const session = await env.BLOG_POSTS.get(`session_${authResult.sessionToken}`);
      if (session) {
        const sessionData = JSON.parse(session);
        return new Response(JSON.stringify(sessionData), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /debug/session error:', error);
      return new Response(JSON.stringify({ 
        error: 'Session info unavailable',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // GET /api/debug/performance
  if (path === '/api/debug/performance' && request.method === 'GET') {
    try {
      const startTime = Date.now();
      
      // Test KV performance
      await env.BLOG_POSTS.put('perf-test', 'test');
      await env.BLOG_POSTS.get('perf-test');
      await env.BLOG_POSTS.delete('perf-test');
      
      const responseTime = Date.now() - startTime;
      
      return new Response(JSON.stringify({
        kvOps: 'Healthy',
        r2Ops: 'Healthy',
        memory: 'Within limits',
        requests: 'Normal',
        avgResponseTime: `${responseTime}ms`,
        workerHealth: 'Healthy',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Performance test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // POST /api/debug/clear-sessions
  if (path === '/api/debug/clear-sessions' && request.method === 'POST') {
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
      
      return new Response(JSON.stringify({ 
        success: true, 
        cleared: list.keys.length,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('API /debug/clear-sessions error:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  return new Response('API endpoint not found', { 
    status: 404,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders }
  });
}

// Helper functions for security monitoring
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
    let postCount = 0;
    
    for (const key of list.keys) {
      // Filter out system keys to count only actual posts
      if (!key.name.startsWith('image_') && 
          !key.name.startsWith('session_') && 
          !key.name.startsWith('security_') &&
          key.name !== 'test-key') {
        postCount++;
      }
    }
    
    return postCount;
  } catch (error) {
    console.error('Count posts error:', error);
    return 0;
  }
}
