import { handleAPI } from './handlers/api.js';
import { handleImageServing } from './handlers/image.js';
import { handlePost } from './handlers/post.js';
import { 
  handleAdminPanel, 
  handleAdminLogin, 
  handleAdminLogout,
  handleAdminCreate,
  handleAdminEdit,
  handleAdminEditPost
} from './handlers/admin.js';
import { getBlogHomePage } from './handlers/post.js';
import { getBasicSecurityHeaders } from './utils/security.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const hostname = url.hostname;

    // HTTP to HTTPS redirect (universal)
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    // www to non-www redirect (universal)
    if (hostname.startsWith('www.')) {
      url.hostname = hostname.replace('www.', '');
      return Response.redirect(url.toString(), 301);
    }

    // Route handling
    if (path.startsWith('/api/')) {
      return handleAPI(request, env, path);
    }

    if (path.startsWith('/images/')) {
      return handleImageServing(request, env, path);
    }

    if (path.startsWith('/post/')) {
      return handlePost(request, env, path);
    }

    if (path === '/verysecretadminpanel') {
      return handleAdminPanel(request, env);
    }

    if (path === '/verysecretadminpanel/create') {
      return handleAdminCreate(request, env);
    }

    if (path === '/verysecretadminpanel/edit') {
      return handleAdminEdit(request, env);
    }

    if (path.startsWith('/verysecretadminpanel/edit/')) {
      return handleAdminEditPost(request, env, path);
    }

    if (path === '/admin/login') {
      return handleAdminLogin(request, env);
    }

    if (path === '/admin/logout') {
      return handleAdminLogout(request, env);
    }

    if (path === '/' || path === '') {
      return new Response(getBlogHomePage(), {
        headers: getBasicSecurityHeaders()
      });
    }

    return new Response('Page not found', { status: 404 });
  }
};
