import { createHtmlTemplate } from './base.js';
import { getBlogTitle } from '../utils/domain.js';

export function createPostTemplate(request, postData) {
  const content = `
    <a href="/" class="back-link">← Back to ${getBlogTitle(request)}</a>
    <article class="post">
      <h1>${escapeHtml(postData.title)}</h1>
      <div class="post-meta">
        Published: ${new Date(postData.createdAt).toLocaleDateString()}
        ${postData.updatedAt ? ` | Updated: ${new Date(postData.updatedAt).toLocaleDateString()}` : ''}
      </div>
      <div class="post-content">${postData.content}</div>
    </article>
  `;

  const styles = `
    .post { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .post h1 { color: #2c3e50; margin-bottom: 10px; }
    .post-meta { color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .post-content { line-height: 1.7; }
    .post-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
    .post-content h2, .post-content h3 { color: #2c3e50; margin-top: 30px; }
    .post-content p { margin-bottom: 15px; }
    .post-content code { background: #f1f2f6; padding: 2px 4px; border-radius: 3px; }
    .post-content pre { background: #f1f2f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
  `;

  return createHtmlTemplate(request, {
    title: postData.title,
    content,
    additionalStyles: styles
  });
}

export function createHomeTemplate(request) {
  const content = `
    <h1>${getBlogTitle(request)}</h1>
    <div id="posts" class="loading">Loading posts...</div>
    ${getHomePageScript()}
  `;

  const styles = `
    h1 { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
    article { border: 1px solid #ddd; border-radius: 8px; padding: 25px; margin: 30px 0; background: #f9f9f9; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    article:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.15); transition: box-shadow 0.2s ease; }
    h2 { margin-bottom: 10px; font-size: 1.5em; }
    h2 a { color: inherit; text-decoration: none; }
    h2 a:hover { color: #3498db; }
    .post-meta { color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    .post-content { margin-bottom: 15px; line-height: 1.7; }
    .post-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
    .read-more { color: #3498db; text-decoration: none; font-weight: 500; border: 1px solid #3498db; padding: 8px 16px; border-radius: 4px; display: inline-block; transition: all 0.2s ease; }
    .read-more:hover { background: #3498db; color: white; }
    .no-posts { text-align: center; padding: 40px 0; font-style: italic; color: #7f8c8d; }
  `;

  return createHtmlTemplate(request, {
    content,
    additionalStyles: styles
  });
}

export function createErrorTemplate(request, { title, message, backText }) {
  const blogTitle = getBlogTitle(request);
  
  const content = `
    <div style="text-align: center; margin-top: 100px;">
      <h1 class="error">${title}</h1>
      <p>${message}</p>
      <a href="/">← ${backText || `Back to ${blogTitle}`}</a>
    </div>
  `;

  return createHtmlTemplate(request, {
    title,
    content
  });
}

function getHomePageScript() {
  return `
    <script>
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      async function loadPosts() {
        try {
          const response = await fetch('/api/posts');
          
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
          }
          
          const posts = await response.json();
          const container = document.getElementById('posts');

          if (posts.length === 0) {
            container.innerHTML = '<div class="no-posts">No posts yet. Check back soon!</div>';
            return;
          }

          container.innerHTML = posts.map(post => {
            const contentPreview = post.content.length > 500 
              ? post.content.substring(0, 500) + '...' 
              : post.content;
            
            return \`
              <article>
                <h2><a href="/post/\${post.slug}">\${escapeHtml(post.title)}</a></h2>
                <div class="post-meta">
                  Published: \${new Date(post.createdAt).toLocaleDateString()}
                  \${post.updatedAt ? ' | Updated: ' + new Date(post.updatedAt).toLocaleDateString() : ''}
                </div>
                <div class="post-content">\${contentPreview}</div>
                \${post.content.length > 500 ? '<a class="read-more" href="/post/' + post.slug + '">Continue reading →</a>' : ''}
              </article>\`;
          }).join('');
          
          container.className = '';
        } catch (error) {
          console.error('Load posts error:', error);
          const container = document.getElementById('posts');
          container.innerHTML = \`
            <div class="error">
              <strong>Error loading posts</strong><br>
              \${error.message}<br>
              <small>Please check the console for details.</small>
            </div>
          \`;
        }
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPosts);
      } else {
        loadPosts();
      }
    </script>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
