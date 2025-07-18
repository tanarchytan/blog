import { checkAdminAuth, generateSessionToken, validateSessionData } from '../utils/auth.js';
import { getCookieSettings } from '../utils/domain.js';
import { getSecurityHeaders } from '../utils/security.js';
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
    return new Response(getLoginPage(request), {
      headers: getSecurityHeaders()
    });
  }
  
  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'dashboard';
  
  let content = '';
  switch (tab) {
    case 'dashboard': content = getDashboardTab(); break;
    case 'create': content = getCreateTab(); break;
    case 'edit': content = getEditListTab(); break;
    case 'debug': content = getDebugTab(); break;
    default: content = getDashboardTab();
  }
  
  return new Response(getAdminPage(request, tab, content), {
    headers: getSecurityHeaders()
  });
}

export async function handleAdminEditPost(request, env, path) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return Response.redirect('/verysecretadminpanel', 302);
  }
  
  const slug = path.replace('/verysecretadminpanel/edit/', '');
  const post = await env.BLOG_POSTS.get(slug);
  
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }
  
  const postData = JSON.parse(post);
  const content = getEditPostTab(postData);
  
  return new Response(getAdminPage(request, 'edit', content), {
    headers: getSecurityHeaders()
  });
}

export async function handleAdminLogin(request, env) {
  if (request.method === 'POST') {
    return handleLoginSubmission(request, env);
  }

  return new Response(getLoginPage(request), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

export async function handleAdminLogout(request, env) {
  const authResult = await checkAdminAuth(request, env);

  if (authResult.sessionToken) {
    await env.BLOG_POSTS.delete(`session_${authResult.sessionToken}`);
  }

  const cookieSettings = getCookieSettings(request);
  const cookieParts = [
    'admin_session=', 'HttpOnly',
    cookieSettings.secure ? 'Secure' : '',
    `SameSite=${cookieSettings.sameSite}`,
    'Max-Age=0', `Path=${cookieSettings.path}`
  ].filter(Boolean);

  if (cookieSettings.domain) {
    cookieParts.push(`Domain=${cookieSettings.domain}`);
  }

  return Response.redirect('/', 302, {
    'Set-Cookie': cookieParts.join('; ')
  });
}

async function handleLoginSubmission(request, env) {
  const formData = await request.formData();
  const password = formData.get('password');

  if (password === env.ADMIN_PANEL_PASSWORD) {
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('User-Agent') || '';
    
    if (!userAgent) {
      return new Response(getLoginPage(request, 'Browser verification failed'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    const sessionData = {
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      browserFingerprint: Array.from(new TextEncoder().encode(`${userAgent}|${request.headers.get('Accept-Language')}|${request.headers.get('Accept-Encoding')}`)).map(b => b.toString(16).padStart(2, '0')).join(''),
      userAgent,
      acceptLanguage: request.headers.get('Accept-Language') || '',
      acceptEncoding: request.headers.get('Accept-Encoding') || '',
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown',
      loginTime: new Date().toISOString()
    };

    if (!validateSessionData(sessionData)) {
      return new Response(getLoginPage(request, 'Session creation failed'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    await env.BLOG_POSTS.put(`session_${sessionToken}`, JSON.stringify(sessionData), { expirationTtl: 28800 });

    const cookieSettings = getCookieSettings(request);
    const cookieParts = [
      `admin_session=${sessionToken}`, 'HttpOnly',
      cookieSettings.secure ? 'Secure' : '',
      `SameSite=${cookieSettings.sameSite}`,
      `Path=${cookieSettings.path}`
    ].filter(Boolean);

    if (cookieSettings.domain) {
      cookieParts.push(`Domain=${cookieSettings.domain}`);
    }

    return Response.redirect('/verysecretadminpanel', 302, {
      'Set-Cookie': cookieParts.join('; ')
    });
  } else {
    return new Response(getLoginPage(request, 'Invalid password'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function getLoginPage(request, error = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Login</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
    .login-form { background: #f8f9fa; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .login-form h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
    .login-form input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
    .login-form button { width: 100%; background: #3498db; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .login-form button:hover { background: #2980b9; }
    .error { color: #e74c3c; margin-bottom: 15px; text-align: center; }
    .back-link { text-align: center; margin-top: 20px; }
    .back-link a { color: #3498db; text-decoration: none; }
  </style>
</head>
<body>
  <form class="login-form" method="POST" action="/verysecretadminpanel/login">
    <h1>🔐 Admin Login</h1>
    ${error ? `<div class="error">${error}</div>` : ''}
    <input type="password" name="password" placeholder="Password" required />
    <button type="submit">Login</button>
  </form>
  <div class="back-link"><a href="/">← Back to Blog</a></div>
</body>
</html>`;
}

function getAdminPage(request, activeTab, content) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'create', name: 'Create', icon: '📝' },
    { id: 'edit', name: 'Edit', icon: '✏️' },
    { id: 'debug', name: 'Debug', icon: '🔧' }
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Admin Panel</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    header h1 { color: #2c3e50; margin: 0; }
    header h1 a { color: inherit; text-decoration: none; }
    .logout-btn { background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px; text-decoration: none; }
    .tabs { display: flex; gap: 0; margin-bottom: 30px; border-bottom: 1px solid #ddd; }
    .tab { background: #f8f9fa; color: #6c757d; padding: 12px 20px; border: 1px solid #ddd; border-bottom: none; text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .tab:hover { background: #e9ecef; }
    .tab.active { background: white; color: #2c3e50; border-bottom: 2px solid #3498db; }
    .tab-content { background: white; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
    .admin-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .admin-form input, .admin-form textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
    .admin-form button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px; }
    .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; cursor: pointer; font-size: 14px; margin-right: 10px; margin-bottom: 10px; }
    .btn-primary { background: #3498db; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-warning { background: #ffc107; color: black; }
    .btn:hover { opacity: 0.9; }
    .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .status.warning { background: #fff3cd; color: #856404; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .dashboard-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; }
    .dashboard-card h3 { color: #2c3e50; margin-top: 0; }
    .dashboard-card p { color: #6c757d; margin-bottom: 15px; }
    .debug-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .debug-data { background: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; }
    .posts-list { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .post-item { background: white; padding: 15px; margin-bottom: 15px; border-radius: 4px; border: 1px solid #dee2e6; }
    .post-item h3 { margin-top: 0; color: #2c3e50; }
    .post-meta { color: #6c757d; font-size: 0.9em; margin-bottom: 10px; }
    .post-actions { display: flex; gap: 10px; }
    .loading { text-align: center; padding: 40px; color: #6c757d; }
    #preview-content { border: 1px solid #ddd; padding: 20px; background: white; border-radius: 4px; margin-top: 10px; }
  </style>
</head>
<body>
  <header>
    <h1><a href="/">Blog Admin</a></h1>
    <a href="/verysecretadminpanel/logout" class="logout-btn">Logout</a>
  </header>

  <div class="tabs">
    ${tabs.map(tab => `
      <a href="?tab=${tab.id}" class="tab ${activeTab === tab.id ? 'active' : ''}">
        <span>${tab.icon}</span> ${tab.name}
      </a>
    `).join('')}
  </div>

  <div class="tab-content">
    ${content}
  </div>

  <div id="status"></div>
  <script src="/static/admin-utils.js"></script>
</body>
</html>`;
}
