import { checkAdminAuth, generateSessionToken, validateSessionData } from '../utils/auth.js';
import { getCookieSettings, getBlogTitle } from '../utils/domain.js';
import { createTemplate } from '../utils/shared.js';
import { getDashboardTab, getCreateTab, getEditListTab, getEditPostTab, getDebugTab } from './adminTabs.js';

export async function handleAdminPanel(request, env) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return new Response(getLoginPage(request), { headers: { 'Content-Type': 'text/html' } });
  }
  
  const tab = new URL(request.url).searchParams.get('tab') || 'dashboard';
  const content = getTabContent(tab);
  const title = `Admin Panel - ${getBlogTitle(request)}`;
  
  return new Response(createTemplate(title, getAdminLayout(tab, content)), {
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function handleAdminEditPost(request, env, path) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return Response.redirect('/verysecretadminpanel', 302);
  }
  
  const slug = path.replace('/verysecretadminpanel/edit/', '');
  const post = await env.BLOG_POSTS.get(slug);
  if (!post) return new Response('Post not found', { status: 404 });
  
  const postData = JSON.parse(post);
  const content = getEditPostTab(postData);
  return new Response(createTemplate(`Edit: ${postData.title}`, getAdminLayout('edit', content)), {
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function handleAdminLogin(request, env) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const password = formData.get('password');

    if (password === env.ADMIN_PANEL_PASSWORD) {
      const sessionToken = generateSessionToken();
      const userAgent = request.headers.get('User-Agent') || '';
      
      if (!userAgent) {
        return new Response(getLoginPage(request, 'Browser verification failed'), { headers: { 'Content-Type': 'text/html' } });
      }
      
      const sessionData = {
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        browserFingerprint: Array.from(new TextEncoder().encode(`${userAgent}|${request.headers.get('Accept-Language')}|${request.headers.get('Accept-Encoding')}`)).map(b => b.toString(16).padStart(2, '0')).join(''),
        userAgent, ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown', loginTime: new Date().toISOString()
      };

      if (!validateSessionData(sessionData)) {
        return new Response(getLoginPage(request, 'Session creation failed'), { headers: { 'Content-Type': 'text/html' } });
      }

      await env.BLOG_POSTS.put(`session_${sessionToken}`, JSON.stringify(sessionData), { expirationTtl: 28800 });
      
      const cookieSettings = getCookieSettings(request);
      const cookieParts = [`admin_session=${sessionToken}`, 'HttpOnly', cookieSettings.secure ? 'Secure' : '', `SameSite=${cookieSettings.sameSite}`, `Path=${cookieSettings.path}`].filter(Boolean);
      
      return Response.redirect('/verysecretadminpanel', 302, { 'Set-Cookie': cookieParts.join('; ') });
    } else {
      return new Response(getLoginPage(request, 'Invalid password'), { headers: { 'Content-Type': 'text/html' } });
    }
  }

  return new Response(getLoginPage(request), { headers: { 'Content-Type': 'text/html' } });
}

export async function handleAdminLogout(request, env) {
  const authResult = await checkAdminAuth(request, env);
  if (authResult.sessionToken) {
    await env.BLOG_POSTS.delete(`session_${authResult.sessionToken}`);
  }
  
  const cookieSettings = getCookieSettings(request);
  const cookieParts = ['admin_session=', 'HttpOnly', cookieSettings.secure ? 'Secure' : '', `SameSite=${cookieSettings.sameSite}`, 'Max-Age=0', `Path=${cookieSettings.path}`].filter(Boolean);
  
  return Response.redirect('/', 302, { 'Set-Cookie': cookieParts.join('; ') });
}

function getTabContent(tab) {
  switch (tab) {
    case 'create': return getCreateTab();
    case 'edit': return getEditListTab();
    case 'debug': return getDebugTab();
    default: return getDashboardTab();
  }
}

function getAdminLayout(activeTab, content) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'create', name: 'Create', icon: '📝' },
    { id: 'edit', name: 'Edit', icon: '✏️' },
    { id: 'debug', name: 'Debug', icon: '🔧' }
  ];

  return `
    <header style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
      <h1 style="color: #2c3e50; margin: 0;"><a href="/" style="color: inherit; text-decoration: none;">Blog Admin</a></h1>
      <a href="/admin/logout" style="background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px; text-decoration: none;">Logout</a>
    </header>
    <div style="display: flex; gap: 0; margin-bottom: 30px; border-bottom: 1px solid #ddd;">
      ${tabs.map(tab => `<a href="?tab=${tab.id}" style="background: ${activeTab === tab.id ? 'white' : '#f8f9fa'}; color: ${activeTab === tab.id ? '#2c3e50' : '#6c757d'}; padding: 12px 20px; border: 1px solid #ddd; border-bottom: ${activeTab === tab.id ? '2px solid #3498db' : 'none'}; text-decoration: none; display: flex; align-items: center; gap: 8px;"><span>${tab.icon}</span> ${tab.name}</a>`).join('')}
    </div>
    <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">${content}</div>
  `;
}

function getLoginPage(request, error = null) {
  const blogTitle = getBlogTitle(request);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Admin Login - ${blogTitle}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:400px;margin:100px auto;padding:20px}.login-form{background:#f8f9fa;padding:30px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.login-form h1{color:#2c3e50;text-align:center;margin-bottom:30px}.login-form input{width:100%;padding:12px;margin-bottom:15px;border:1px solid #ddd;border-radius:4px;font-size:16px;box-sizing:border-box}.login-form button{width:100%;background:#3498db;color:white;padding:12px;border:none;border-radius:4px;cursor:pointer;font-size:16px}.login-form button:hover{background:#2980b9}.error{color:#e74c3c;margin-bottom:15px;text-align:center}.back-link{text-align:center;margin-top:20px}.back-link a{color:#3498db;text-decoration:none}</style></head><body><form class="login-form" method="POST" action="/admin/login"><h1>🔐 Admin Login</h1>${error ? `<div class="error">${error}</div>` : ''}<input type="password" name="password" placeholder="Password" required /><button type="submit">Login</button></form><div class="back-link"><a href="/">← Back to ${blogTitle}</a></div></body></html>`;
}
