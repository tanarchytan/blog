import { checkAdminAuth, generateSessionToken, validateSessionData } from '../utils/auth.js';
import { getSecurityHeaders } from '../utils/security.js';
import { getCookieSettings } from '../utils/domain.js';
import { createAdminTemplate, createAdminLoginTemplate } from '../templates/admin.js';
import { 
  getDashboardTab, 
  getCreateTab, 
  getEditListTab, 
  getEditPostTab,
  getDebugTab
} from './adminTabs.js';

export async function handleAdminPanel(request, env) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return new Response(createAdminLoginTemplate(request), {
      headers: getSecurityHeaders()
    });
  }
  
  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'dashboard';
  
  let content = '';
  switch (tab) {
    case 'dashboard':
      content = getDashboardTab();
      break;
    case 'create':
      content = getCreateTab();
      break;
    case 'edit':
      content = getEditListTab();
      break;
    case 'debug':
      content = getDebugTab();
      break;
    default:
      content = getDashboardTab();
  }
  
  return new Response(createAdminTemplate(request, { 
    title: 'Admin Panel', 
    content, 
    activeTab: tab 
  }), {
    headers: getSecurityHeaders()
  });
}

export async function handleAdminCreate(request, env) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/verysecretadminpanel' }
    });
  }
  
  return new Response(createAdminTemplate(request, { 
    title: 'Create Post', 
    content: getCreateTab(), 
    activeTab: 'create' 
  }), {
    headers: getSecurityHeaders()
  });
}

export async function handleAdminEdit(request, env) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/verysecretadminpanel' }
    });
  }
  
  return new Response(createAdminTemplate(request, { 
    title: 'Edit Posts', 
    content: getEditListTab(), 
    activeTab: 'edit' 
  }), {
    headers: getSecurityHeaders()
  });
}

export async function handleAdminEditPost(request, env, path) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/verysecretadminpanel' }
    });
  }
  
  const slug = path.replace('/verysecretadminpanel/edit/', '');
  const post = await env.BLOG_POSTS.get(slug);
  
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }
  
  const postData = JSON.parse(post);
  return new Response(createAdminTemplate(request, { 
    title: `Edit: ${postData.title}`, 
    content: getEditPostTab(postData), 
    activeTab: 'edit' 
  }), {
    headers: getSecurityHeaders()
  });
}

export async function handleAdminLogin(request, env) {
  if (request.method === 'POST') {
    return handleLoginSubmission(request, env);
  }

  return new Response(createAdminLoginTemplate(request), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function handleAdminLogout(request, env) {
  const authResult = await checkAdminAuth(request, env);

  if (authResult.sessionToken) {
    // Log security event
    await env.BLOG_POSTS.put(`security_logout_${Date.now()}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionToken: authResult.sessionToken,
      reason: 'manual_logout',
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
    }), { expirationTtl: 604800 });

    // Delete session
    await env.BLOG_POSTS.delete(`session_${authResult.sessionToken}`);
  }

  // Generate domain-appropriate cookie clearing
  const cookieSettings = getCookieSettings(request);
  const cookieParts = [
    'admin_session=',
    'HttpOnly',
    cookieSettings.secure ? 'Secure' : '',
    `SameSite=${cookieSettings.sameSite}`,
    'Max-Age=0',
    `Path=${cookieSettings.path}`
  ].filter(Boolean);

  if (cookieSettings.domain) {
    cookieParts.push(`Domain=${cookieSettings.domain}`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': cookieParts.join('; ')
    }
  });
}

async function handleLoginSubmission(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (password === env.ADMIN_PANEL_PASSWORD) {
    const sessionToken = generateSessionToken();
    
    // Enhanced browser fingerprint generation with validation
    const userAgent = request.headers.get('User-Agent') || '';
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const acceptEncoding = request.headers.get('Accept-Encoding') || '';
    
    // Validate required headers
    if (!userAgent) {
      return new Response(createAdminLoginTemplate(request, 'Browser verification failed. Please use a standard browser.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    const browserFingerprint = Array.from(
      new TextEncoder().encode(`${userAgent}|${acceptLanguage}|${acceptEncoding}`)
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store complete session data with all required fields
    const sessionData = {
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      browserFingerprint: browserFingerprint,
      userAgent: userAgent,
      acceptLanguage: acceptLanguage,
      acceptEncoding: acceptEncoding,
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown',
      loginTime: new Date().toISOString()
    };

    // Validate session data before storing
    if (!validateSessionData(sessionData)) {
      return new Response(createAdminLoginTemplate(request, 'Session creation failed. Please try again.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    await env.BLOG_POSTS.put(`session_${sessionToken}`, JSON.stringify(sessionData), { 
      expirationTtl: 28800 // 8 hours
    });

    // Log successful login
    await env.BLOG_POSTS.put(`security_login_${Date.now()}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      sessionToken: sessionToken,
      reason: 'successful_login',
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
    }), { expirationTtl: 604800 });

    // Generate domain-appropriate cookie
    const cookieSettings = getCookieSettings(request);
    const cookieParts = [
      `admin_session=${sessionToken}`,
      'HttpOnly',
      cookieSettings.secure ? 'Secure' : '',
      `SameSite=${cookieSettings.sameSite}`,
      `Path=${cookieSettings.path}`
    ].filter(Boolean);

    if (cookieSettings.domain) {
      cookieParts.push(`Domain=${cookieSettings.domain}`);
    }

    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/verysecretadminpanel',
        'Set-Cookie': cookieParts.join('; ')
      }
    });
  } else {
    // Log failed login attempt
    await env.BLOG_POSTS.put(`security_failed_${Date.now()}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      reason: 'invalid_password',
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown',
      userAgent: request.headers.get('User-Agent') || 'unknown'
    }), { expirationTtl: 604800 });
    
    return new Response(createAdminLoginTemplate(request, 'Invalid password'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
