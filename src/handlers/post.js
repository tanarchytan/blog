import { getBasicSecurityHeaders } from '../utils/security.js';
import { getBlogTitle, getBlogDescription } from '../utils/domain.js';

export async function getAllPosts(env) {
  try {
    if (!env.BLOG_POSTS) throw new Error('KV namespace not found');
    const list = await env.BLOG_POSTS.list();
    const posts = [];
    
    for (const key of list.keys) {
      // Enhanced filtering to exclude all system keys including settings
      if (key.name.startsWith('image_') || 
          key.name.startsWith('session_') || 
          key.name.startsWith('security_') ||
          key.name.startsWith('blog_') ||  // Exclude blog settings
          key.name === 'test-key' ||
          key.name === 'perf-test') continue;
      
      try {
        const postData = await env.BLOG_POSTS.get(key.name);
        if (postData) {
          const post = JSON.parse(postData);
          if (post.title && post.content && post.slug) posts.push(post);
        }
      } catch (parseError) { 
        console.error(`Parse error ${key.name}:`, parseError); 
      }
    }
    
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('getAllPosts error:', error);
    return [];
  }
}

export const generateSlug = (title) => title ? title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') : '';

export async function handlePost(request, env, path) {
  const slug = path.replace('/post/', '');
  
  if (!slug || slug.includes('..')) {
    const blogTitle = await getBlogTitle(request, env);
    return new Response(getErrorPage(blogTitle, 'Invalid URL'), { 
      status: 400, 
      headers: getBasicSecurityHeaders() 
    });
  }

  try {
    const post = await env.BLOG_POSTS.get(slug);
    if (!post) {
      const blogTitle = await getBlogTitle(request, env);
      return new Response(getErrorPage(blogTitle, 'Post Not Found'), { 
        status: 404, 
        headers: getBasicSecurityHeaders() 
      });
    }
    
    const postData = JSON.parse(post);
    if (!postData.title || !postData.content) throw new Error('Invalid post');
    
    const blogTitle = await getBlogTitle(request, env);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(postData.title)} - ${blogTitle}</title>
  <meta name="description" content="${escapeHtml(postData.content.substring(0, 160))}...">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6}
    .back-link{color:#3498db;text-decoration:none;margin-bottom:20px;display:inline-block}
    .back-link:hover{color:#2980b9}
    .post{border:1px solid #ddd;border-radius:8px;padding:20px;margin:20px 0}
    .post h1{color:#2c3e50;margin-bottom:10px}
    .post-meta{color:#7f8c8d;font-size:0.9em;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px}
    .post-content{line-height:1.7}
    .post-content img{max-width:100%;height:auto;border-radius:4px;margin:10px 0}
    .post-content h2,.post-content h3{color:#2c3e50;margin-top:30px}
    .post-content p{margin-bottom:15px}
    .post-content code{background:#f1f2f6;padding:2px 4px;border-radius:3px}
    .post-content pre{background:#f1f2f6;padding:15px;border-radius:5px;overflow-x:auto}
  </style>
</head>
<body>
  <a href="/" class="back-link">← Back to ${blogTitle}</a>
  <article class="post">
    <h1>${escapeHtml(postData.title)}</h1>
    <div class="post-meta">
      Published: ${new Date(postData.createdAt).toLocaleDateString()}
      ${postData.updatedAt ? ` | Updated: ${new Date(postData.updatedAt).toLocaleDateString()}` : ''}
    </div>
    <div class="post-content">${postData.content}</div>
  </article>
</body>
</html>`;
    
    return new Response(html, { headers: getBasicSecurityHeaders() });
  } catch (error) {
    console.error('handlePost error:', error);
    const blogTitle = await getBlogTitle(request, env);
    return new Response(getErrorPage(blogTitle, 'Error loading post'), { 
      status: 500, 
      headers: getBasicSecurityHeaders() 
    });
  }
}

export async function getBlogHomePage(request, env) {
  const blogTitle = await getBlogTitle(request, env);
  const blogDescription = await getBlogDescription(request, env);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blogTitle}</title>
  <meta name="description" content="${blogDescription}">
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#333}
    h1{color:#2c3e50;border-bottom:2px solid #eee;padding-bottom:20px;margin-bottom:30px}
    article{border:1px solid #ddd;border-radius:8px;padding:25px;margin:30px 0;background:#f9f9f9;box-shadow:0 2px 4px rgba(0,0,0,0.1)}
    article:hover{box-shadow:0 4px 8px rgba(0,0,0,0.15);transition:box-shadow 0.2s ease}
    h2{color:#2c3e50;margin-bottom:10px;font-size:1.5em}
    h2 a{color:inherit;text-decoration:none}
    h2 a:hover{color:#3498db}
    .post-meta{color:#7f8c8d;font-size:0.9em;margin-bottom:15px;border-bottom:1px solid #eee;padding-bottom:10px}
    .post-content{margin-bottom:15px;line-height:1.7}
    .post-content img{max-width:100%;height:auto;border-radius:4px;margin:10px 0}
    .read-more{color:#3498db;text-decoration:none;font-weight:500;border:1px solid #3498db;padding:8px 16px;border-radius:4px;display:inline-block;transition:all 0.2s ease}
    .read-more:hover{background:#3498db;color:white}
    .loading,.error,.no-posts{text-align:center;padding:40px 0;font-style:italic;color:#7f8c8d}
    .error{color:#e74c3c}
  </style>
</head>
<body>
  <h1>${blogTitle}</h1>
  <div id="posts" class="loading">Loading posts...</div>
  <script>
    function escapeHtml(text){const div=document.createElement('div');div.textContent=text;return div.innerHTML}
    async function loadPosts(){
      try{
        const response=await fetch('/api/posts');
        if(!response.ok)throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        const posts=await response.json();
        const container=document.getElementById('posts');
        if(posts.length===0){
          container.innerHTML='<div class="no-posts">No posts yet. Check back soon!</div>';
          return;
        }
        container.innerHTML=posts.map(post=>{
          const contentPreview=post.content.length>500?post.content.substring(0,500)+'...':post.content;
          return \`<article><h2><a href="/post/\${post.slug}">\${escapeHtml(post.title)}</a></h2><div class="post-meta">Published: \${new Date(post.createdAt).toLocaleDateString()}\${post.updatedAt?' | Updated: '+new Date(post.updatedAt).toLocaleDateString():''}</div><div class="post-content">\${contentPreview}</div>\${post.content.length>500?'<a class="read-more" href="/post/'+post.slug+'">Continue reading →</a>':''}</article>\`;
        }).join('');
        container.className='';
      }catch(error){
        console.error('Load posts error:',error);
        document.getElementById('posts').innerHTML=\`<div class="error"><strong>Error loading posts</strong><br>\${error.message}<br><small>Please check the console for details.</small></div>\`;
      }
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',loadPosts)}else{loadPosts()}
  </script>
</body>
</html>`;
}

const escapeHtml = (text) => text ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

const getErrorPage = (blogTitle, title) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} - ${blogTitle}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:100px auto;padding:20px;text-align:center}.error{color:#e74c3c}</style></head><body><h1 class="error">${title}</h1><p>The requested content is not available.</p><a href="/">← Back to ${blogTitle}</a></body></html>`;
