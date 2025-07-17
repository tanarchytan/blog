// Complete Cloudflare Workers Blog - Security-First, Minimalist Design
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle API routes
    if (path.startsWith('/api/')) {
      return handleAPI(request, env, path);
    }
    
    // Handle image serving routes
    if (path.startsWith('/images/')) {
      return handleImageServing(request, env, path);
    }
    
    // Handle individual post routes
    if (path.startsWith('/post/')) {
      return handlePost(request, env, path);
    }
    
    // Handle hidden admin panel
    if (path === '/verysecretadminpanel') {
      return handleAdminPanel(request, env);
    }
    
    // Handle admin login
    if (path === '/admin/login') {
      return handleAdminLogin(request, env);
    }
    
    // Handle admin logout
    if (path === '/admin/logout') {
      return handleAdminLogout(request, env);
    }
    
    // Handle root route - blog homepage
    if (path === '/' || path === '') {
      return new Response(getBlogHomePage(), {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      });
    }
    
    return new Response('Page not found', { status: 404 });
  }
};

// Handle admin panel with authentication
async function handleAdminPanel(request, env) {
  const authResult = await checkAdminAuth(request, env);
  if (!authResult.authenticated) {
    return new Response(getAdminLoginPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  return new Response(getAdminPage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Handle admin login
async function handleAdminLogin(request, env) {
  if (request.method === 'POST') {
    const formData = await request.formData();
    const password = formData.get('password');
    
    if (password === env.ADMIN_PANEL_PASSWORD) {
      const sessionToken = generateSessionToken();
      
      await env.BLOG_POSTS.put(`session_${sessionToken}`, JSON.stringify({
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }), { expirationTtl: 86400 });
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/verysecretadminpanel',
          'Set-Cookie': `admin_session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
        }
      });
    } else {
      return new Response(getAdminLoginPage('Invalid password'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }
  
  return new Response(getAdminLoginPage(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Handle admin logout
async function handleAdminLogout(request, env) {
  const authResult = await checkAdminAuth(request, env);
  
  if (authResult.sessionToken) {
    await env.BLOG_POSTS.delete(`session_${authResult.sessionToken}`);
  }
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': 'admin_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    }
  });
}

// Check admin authentication
async function checkAdminAuth(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return { authenticated: false };
  
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies.admin_session;
  
  if (!sessionToken) return { authenticated: false };
  
  try {
    const session = await env.BLOG_POSTS.get(`session_${sessionToken}`);
    if (!session) return { authenticated: false };
    
    const sessionData = JSON.parse(session);
    if (new Date() > new Date(sessionData.expires)) {
      await env.BLOG_POSTS.delete(`session_${sessionToken}`);
      return { authenticated: false };
    }
    
    return { authenticated: true, sessionToken };
  } catch (error) {
    return { authenticated: false };
  }
}

// Parse cookies helper
function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = value;
    }
  });
  return cookies;
}

// Generate secure session token
function generateSessionToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Handle all API endpoints
async function handleAPI(request, env, path) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Check authentication for protected endpoints
  const requiresAuth = path !== '/api/posts' || request.method !== 'GET';
  
  if (requiresAuth) {
    const authResult = await checkAdminAuth(request, env);
    if (!authResult.authenticated) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
  
  // Get all blog posts (public)
  if (path === '/api/posts' && request.method === 'GET') {
    try {
      const posts = await getAllPosts(env);
      return new Response(JSON.stringify(posts), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to get posts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
  
  // Create new blog post
  if (path === '/api/posts' && request.method === 'POST') {
    try {
      const post = await request.json();
      const slug = generateSlug(post.title);
      const postData = {
        title: post.title,
        content: post.content,
        slug: slug,
        createdAt: new Date().toISOString(),
        id: Date.now().toString()
      };
      
      await env.BLOG_POSTS.put(slug, JSON.stringify(postData));
      
      return new Response(JSON.stringify({ success: true, slug }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to create post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
  
  // Handle image upload to R2
  if (path === '/api/upload' && request.method === 'POST') {
    return handleImageUpload(request, env);
  }
  
  // System test endpoint
  if (path === '/api/test' && request.method === 'GET') {
    try {
      await env.BLOG_POSTS.put('test-key', 'test-value');
      const kvValue = await env.BLOG_POSTS.get('test-key');
      
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await env.R2_BUCKET.put('test-file.txt', testFile);
      const r2Object = await env.R2_BUCKET.get('test-file.txt');
      
      await env.R2_BUCKET.delete('test-file.txt');
      await env.BLOG_POSTS.delete('test-key');
      
      return new Response(JSON.stringify({
        success: true,
        kvBinding: !!env.BLOG_POSTS,
        kvTest: kvValue === 'test-value',
        r2Binding: !!env.R2_BUCKET,
        r2Test: !!r2Object,
        accountId: !!env.CLOUDFLARE_ACCOUNT_ID,
        imagesToken: !!env.CLOUDFLARE_IMAGES_TOKEN,
        adminPassword: !!env.ADMIN_PANEL_PASSWORD
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
  
  return new Response('API endpoint not found', { status: 404 });
}

// Secure image upload to R2 bucket
async function handleImageUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security validation
    if (!isValidImageFile(file)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type or size',
        details: 'Only JPEG, PNG, WebP, and GIF files under 10MB are allowed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 bucket not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filename = generateSecureFilename(file.name);
    
    await env.R2_BUCKET.put(filename, file, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000'
      },
      customMetadata: {
        'uploaded-at': new Date().toISOString(),
        'original-name': file.name,
        'content-type': file.type
      }
    });
    
    await trackImageUpload(env, filename, file.name);
    
    const imageUrl = `/images/${filename}`;
    
    return new Response(JSON.stringify({ 
      url: imageUrl,
      imageId: filename
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Upload failed', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Secure image serving with transformations
async function handleImageServing(request, env, path) {
  try {
    const url = new URL(request.url);
    const filename = path.replace('/images/', '');
    
    // Security validation
    if (!isValidImageRequest(filename)) {
      return new Response('Invalid image request', { status: 400 });
    }
    
    const object = await env.R2_BUCKET.get(filename);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }
    
    // Extract transformation parameters
    const width = url.searchParams.get('width');
    const height = url.searchParams.get('height');
    const quality = url.searchParams.get('quality');
    const format = url.searchParams.get('format');
    
    const contentType = object.httpMetadata?.contentType || 
                       object.customMetadata?.['content-type'] || 
                       getContentTypeFromFilename(filename) || 
                       'image/jpeg';
    
    // If no transformations requested, serve original
    if (!width && !height && !quality && !format) {
      return new Response(object.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
          'ETag': object.etag || 'unknown',
          'Last-Modified': object.uploaded ? object.uploaded.toUTCString() : new Date().toUTCString()
        }
      });
    }
    
    // Use Cloudflare Images Free for transformations
    const transformParams = [];
    if (width) transformParams.push(`width=${width}`);
    if (height) transformParams.push(`height=${height}`);
    if (quality) transformParams.push(`quality=${quality}`);
    if (format) transformParams.push(`format=${format}`);
    
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'CF-Image-Transform': transformParams.join(','),
        'ETag': object.etag || 'unknown'
      }
    });
    
  } catch (error) {
    return new Response('Error serving image', { status: 500 });
  }
}

// Security validation functions
function isValidImageFile(file) {
  if (file.size > 10 * 1024 * 1024) return false;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type);
}

function isValidImageRequest(filename) {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
  if (filename.length > 255) return false;
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

function generateSecureFilename(originalName) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  return `${timestamp}-${randomId}${extension}`;
}

function getContentTypeFromFilename(filename) {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return contentTypes[extension] || 'image/jpeg';
}

async function trackImageUpload(env, filename, originalName) {
  try {
    const uploadData = {
      filename: filename,
      originalName: originalName,
      uploadedAt: new Date().toISOString(),
      storageType: 'r2'
    };
    await env.BLOG_POSTS.put(`image_${filename}`, JSON.stringify(uploadData));
  } catch (error) {
    console.error('Error tracking image upload:', error);
  }
}

// Get all blog posts from KV storage
async function getAllPosts(env) {
  const posts = [];
  
  try {
    if (!env.BLOG_POSTS) {
      throw new Error('KV namespace BLOG_POSTS not found');
    }
    
    const list = await env.BLOG_POSTS.list();
    
    for (const key of list.keys) {
      if (key.name.startsWith('image_') || key.name.startsWith('session_') || key.name === 'test-key') continue;
      
      const postData = await env.BLOG_POSTS.get(key.name);
      if (postData) {
        posts.push(JSON.parse(postData));
      }
    }
    
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('getAllPosts error:', error);
    return [];
  }
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Handle individual blog post pages
async function handlePost(request, env, path) {
  const slug = path.replace('/post/', '');
  
  try {
    const post = await env.BLOG_POSTS.get(slug);
    
    if (!post) {
      return new Response('Post not found', { status: 404 });
    }
    
    const postData = JSON.parse(post);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${postData.title} - My Blog</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .post { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .post h1 { color: #2c3e50; margin-bottom: 10px; }
        .post-meta { color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px; }
        .post-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
        a { color: #3498db; text-decoration: none; }
        a:hover { color: #2980b9; }
    </style>
</head>
<body>
    <nav><a href="/">← Back to Blog</a></nav>
    <article class="post">
        <h1>${postData.title}</h1>
        <div class="post-meta">Published: ${new Date(postData.createdAt).toLocaleDateString()}</div>
        <div class="post-content">${postData.content}</div>
    </article>
</body>
</html>`;
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    return new Response('Error loading post', { status: 500 });
  }
}

// Generate blog homepage with post previews
function getBlogHomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Blog</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
            color: #333;
        }
        h1 { 
            color: #2c3e50; 
            border-bottom: 2px solid #eee; 
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        article { 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            padding: 25px; 
            margin: 30px 0; 
            background: #f9f9f9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        article:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            transition: box-shadow 0.2s ease;
        }
        h2 { 
            color: #2c3e50; 
            margin-bottom: 10px;
            font-size: 1.5em;
        }
        h2 a { 
            color: inherit; 
            text-decoration: none; 
        }
        h2 a:hover { 
            color: #3498db; 
        }
        .post-meta { 
            color: #7f8c8d; 
            font-size: 0.9em;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .post-content {
            margin-bottom: 15px;
            line-height: 1.7;
        }
        .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 10px 0;
        }
        .post-content p {
            margin-bottom: 15px;
        }
        .read-more {
            color: #3498db;
            text-decoration: none;
            font-weight: 500;
            border: 1px solid #3498db;
            padding: 8px 16px;
            border-radius: 4px;
            display: inline-block;
            transition: all 0.2s ease;
        }
        .read-more:hover {
            background: #3498db;
            color: white;
        }
        .loading {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 40px 0;
        }
        .error {
            color: #e74c3c;
            text-align: center;
            padding: 40px 0;
        }
        .no-posts {
            text-align: center;
            color: #7f8c8d;
            padding: 40px 0;
            font-style: italic;
        }
    </style>
</head>
<body>
    <h1>My Blog</h1>
    <div id="posts" class="loading">Loading posts...</div>
    
    <script>
        async function loadPosts() {
            try {
                const response = await fetch('/api/posts');
                const posts = await response.json();
                const container = document.getElementById('posts');
                
                if (!response.ok) {
                    throw new Error('Failed to load posts');
                }
                
                if (posts.length === 0) {
                    container.innerHTML = '<div class="no-posts">No posts yet. Check back soon!</div>';
                    container.className = '';
                    return;
                }
                
                container.innerHTML = posts.map(post => {
                    // Truncate content for preview but show more than before
                    const contentPreview = post.content.length > 500 
                        ? post.content.substring(0, 500) + '...'
                        : post.content;
                    
                    return '<article>' +
                        '<h2><a href="/post/' + post.slug + '">' + post.title + '</a></h2>' +
                        '<div class="post-meta">Published: ' + new Date(post.createdAt).toLocaleDateString() + '</div>' +
                        '<div class="post-content">' + contentPreview + '</div>' +
                        (post.content.length > 500 ? '<a href="/post/' + post.slug + '" class="read-more">Continue reading →</a>' : '') +
                    '</article>';
                }).join('');
                container.className = '';
                
            } catch (error) {
                console.error('Error loading posts:', error);
                document.getElementById('posts').innerHTML = '<div class="error">Error loading posts. Please try again later.</div>';
                document.getElementById('posts').className = '';
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadPosts);
        } else {
            loadPosts();
        }
    </script>
</body>
</html>`;
}


// Generate admin login page
function getAdminLoginPage(error = null) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    <div class="login-form">
        <h1>🔐 Admin Login</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form method="POST" action="/admin/login">
            <input type="password" name="password" placeholder="Admin Password" required>
            <button type="submit">Login</button>
        </form>
        <div class="back-link">
            <a href="/">← Back to Blog</a>
        </div>
    </div>
</body>
</html>`;
}

// Generate minimalist admin panel
function getAdminPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        header h1 { color: #2c3e50; margin: 0; }
        .logout-btn { background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; }
        .admin-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .admin-form input, .admin-form textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
        .admin-form button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px; }
        .admin-form button:hover { background: #2980b9; }
        .admin-form button:disabled { background: #bdc3c7; cursor: not-allowed; }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status.success { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
        .test-section { background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .test-button { background: #28a745; color: white; }
    </style>
</head>
<body>
    <header>
        <h1><a href="/" style="color: inherit; text-decoration: none;">My Blog</a> - Admin</h1>
        <a href="/admin/logout" class="logout-btn">Logout</a>
    </header>
    
    <div class="test-section">
        <h3>🧪 System Status</h3>
        <button class="test-button" onclick="testSystem()">Test System</button>
        <div id="test-results"></div>
    </div>
    
    <div class="admin-section">
        <h3>📝 Create New Post</h3>
        <form class="admin-form" id="post-form">
            <input type="text" id="title" placeholder="Post Title" required>
            <textarea id="content" placeholder="Post Content (HTML supported)" rows="10" required></textarea>
            <input type="file" id="image-upload" accept="image/*">
            <button type="button" id="upload-image">Upload Image</button>
            <button type="submit" id="publish-btn">Create Post</button>
        </form>
    </div>
    
    <div id="status"></div>
    
    <script>
        async function testSystem() {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<p>Testing...</p>';
            
            try {
                const response = await fetch('/api/test');
                const result = await response.json();
                
                if (result.success) {
                    resultsDiv.innerHTML = \`
                        <div class="status success">
                            <strong>✅ System OK!</strong><br>
                            KV: \${result.kvBinding ? 'OK' : 'MISSING'} | 
                            R2: \${result.r2Binding ? 'OK' : 'MISSING'} | 
                            Account: \${result.accountId ? 'OK' : 'MISSING'} | 
                            Token: \${result.imagesToken ? 'OK' : 'MISSING'} | 
                            Admin: \${result.adminPassword ? 'OK' : 'MISSING'}
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML = \`<div class="status error">❌ Test Failed: \${result.error}</div>\`;
                }
            } catch (error) {
                resultsDiv.innerHTML = \`<div class="status error">❌ Error: \${error.message}</div>\`;
            }
        }
        
        function showStatus(message, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
            setTimeout(() => statusDiv.innerHTML = '', 5000);
        }
        
        document.getElementById('upload-image').addEventListener('click', async () => {
            const fileInput = document.getElementById('image-upload');
            const file = fileInput.files[0];
            
            if (!file) {
                showStatus('Please select an image', 'error');
                return;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                showStatus('File too large. Max 10MB.', 'error');
                return;
            }
            
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showStatus('Invalid file type.', 'error');
                return;
            }
            
            showStatus('📤 Uploading...', '');
            
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.url) {
                    const textarea = document.getElementById('content');
                    textarea.value += \`<img src="\${result.url}" alt="Uploaded image">\\n\`;
                    showStatus('✅ Image uploaded!', 'success');
                } else {
                    showStatus('❌ Upload failed: ' + (result.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                showStatus('❌ Upload error: ' + error.message, 'error');
            }
        });
        
        document.getElementById('post-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;
            
            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus('✅ Post created!', 'success');
                    document.getElementById('post-form').reset();
                } else {
                    showStatus('❌ Failed: ' + (result.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                showStatus('❌ Error: ' + error.message, 'error');
            }
        });
    </script>
</body>
</html>`;
}
