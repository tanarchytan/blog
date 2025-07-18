import { createTemplate } from '../utils/shared.js';

const FORM_TEMPLATE = (title, isEdit, post = null) => `
  <section class="admin-section">
    <h2>${title}</h2>
    ${isEdit ? `<div class="post-meta">Created: ${new Date(post.createdAt).toLocaleDateString()} | Slug: ${post.slug}</div>` : ''}
    <form id="post-form" class="admin-form">
      <input type="text" id="title" placeholder="Post title" value="${isEdit ? post.title.replace(/"/g, '&quot;') : ''}" required />
      <textarea id="content" placeholder="Post content (HTML)" rows="15" required>${isEdit ? post.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</textarea>
      <button type="button" id="preview-btn">Preview</button>
      <button type="submit">${isEdit ? 'Update' : 'Create'} Post</button>
    </form>
  </section>
  <section class="admin-section" id="preview-section" style="display: none;"><h2>📖 Preview</h2><div id="preview-content"></div></section>
  <section class="admin-section"><h2>📤 Upload Image</h2><input type="file" id="image-upload" accept="image/*" /><button id="upload-image">Upload</button></section>
  <script>
    setupImageUpload('content'); setupPreview('title', 'content');
    document.getElementById('post-form').addEventListener('submit', async (e) => {
      e.preventDefault(); if (!validateSession()) return;
      const title = document.getElementById('title').value, content = document.getElementById('content').value;
      if (!title.trim() || !content.trim()) return showStatus('❌ Title and content required', 'error');
      
      try {
        const result = await apiRequest('${isEdit ? `/api/posts/\${post.slug}` : '/api/posts'}', {
          method: '${isEdit ? 'PUT' : 'POST'}', body: JSON.stringify({ title, content })
        });
        showStatus('✅ Post ${isEdit ? 'updated' : 'created'}! Redirecting...', 'success');
        setTimeout(() => location.href = '/verysecretadminpanel?tab=${isEdit ? 'edit' : 'dashboard'}', 1500);
      } catch (error) { showStatus('❌ Error: ' + error.message, 'error'); }
    });
  </script>
`;

export const getDashboardTab = () => `
  <div class="dashboard-grid">
    <div class="dashboard-card"><h3>📝 Content</h3><p>Manage posts</p><a href="?tab=create" class="btn btn-primary">Create</a><a href="?tab=edit" class="btn btn-info">Edit</a></div>
    <div class="dashboard-card"><h3>📊 Stats</h3><p>Blog statistics</p><div id="stats-content">Loading...</div></div>
    <div class="dashboard-card"><h3>🔧 Tools</h3><p>System tools</p><a href="?tab=debug" class="btn btn-success">Debug</a><button id="clear-sessions-btn" class="btn btn-warning">Clear Sessions</button></div>
  </div>
  <script>
    fetch('/api/posts').then(r=>r.json()).then(posts=>{
      document.getElementById('stats-content').innerHTML = posts.length ? \`<strong>Posts:</strong> \${posts.length}<br><strong>Latest:</strong> \${posts[0].title}\` : '<em>No posts</em>';
    }).catch(()=>document.getElementById('stats-content').innerHTML='<em>Error</em>');
    
    document.getElementById('clear-sessions-btn').addEventListener('click', async () => {
      if (!confirm('Clear all sessions?')) return;
      try {
        const result = await apiRequest('/api/debug/clear-sessions', {method: 'POST'});
        showStatus(\`✅ Cleared \${result.cleared} sessions\`, 'success');
      } catch (error) { showStatus('❌ Error: ' + error.message, 'error'); }
    });
  </script>
`;

export const getCreateTab = () => FORM_TEMPLATE('📝 Create Post', false);
export const getEditPostTab = (post) => FORM_TEMPLATE('✏️ Edit Post', true, post);

export const getEditListTab = () => `
  <div class="posts-list"><h2>📝 Manage Posts</h2><div id="posts-container" class="loading">Loading...</div></div>
  <script>
    async function loadPosts() {
      try {
        const posts = await apiRequest('/api/posts');
        const container = document.getElementById('posts-container');
        container.innerHTML = posts.length ? posts.map(post => \`
          <div class="post-item">
            <h3>\${escapeHtml(post.title)}</h3>
            <div class="post-meta">Published: \${new Date(post.createdAt).toLocaleDateString()} | \${post.slug}</div>
            <div class="post-actions">
              <a href="/verysecretadminpanel/edit/\${post.slug}" class="btn btn-primary">Edit</a>
              <a href="/post/\${post.slug}" class="btn btn-success" target="_blank">View</a>
              <button class="btn btn-danger" onclick="deletePost('\${post.slug}')">Delete</button>
            </div>
          </div>
        \`).join('') : '<p>No posts. <a href="?tab=create">Create first post</a></p>';
        container.className = '';
      } catch (error) { document.getElementById('posts-container').innerHTML = '<p class="error">Error loading posts</p>'; }
    }
    
    async function deletePost(slug) {
      if (!confirm('Delete this post?') || !validateSession()) return;
      try {
        await apiRequest(\`/api/posts/\${slug}\`, {method: 'DELETE'});
        showStatus('✅ Post deleted', 'success'); loadPosts();
      } catch (error) { showStatus('❌ Error: ' + error.message, 'error'); }
    }
    loadPosts();
  </script>
`;

export const getDebugTab = () => `
  <div class="debug-section"><h3>🔧 System Test</h3><button id="test-btn" class="btn btn-success">Run Test</button><pre id="test-results"></pre></div>
  <div class="debug-section"><h3>🔒 Security</h3><div id="security-info">Non-persistent Sessions: ✅<br>Browser Fingerprinting: ✅<br>Session Timeout: 8h</div></div>
  <div class="debug-section"><h3>📊 Session</h3><div id="session-debug">Loading...</div></div>
  <div class="debug-section"><h3>🍪 Cookies</h3><div id="cookie-debug">Loading...</div></div>
  <div class="debug-section"><h3>🔄 Management</h3><button id="clear-debug" class="btn btn-warning">Clear Sessions</button><button id="refresh-debug" class="btn btn-info">Refresh</button></div>
  <script>
    document.getElementById('test-btn').addEventListener('click', async () => {
      const resultsDiv = document.getElementById('test-results');
      resultsDiv.textContent = 'Testing...';
      try {
        const result = await apiRequest('/api/test');
        resultsDiv.textContent = result.success ? 
          \`✅ System OK\\nKV: \${result.kvBinding?'✅':'❌'}\\nR2: \${result.r2Binding?'✅':'❌'}\\nSessions: \${result.security.activeSessions}\` :
          \`❌ Test Failed: \${result.error}\`;
      } catch (error) { resultsDiv.textContent = \`❌ Error: \${error.message}\`; }
    });
    
    async function loadDebugInfo() {
      try {
        const session = await apiRequest('/api/debug/session');
        document.getElementById('session-debug').innerHTML = \`Created: \${session.created}\\nExpires: \${session.expires}\\nIP: \${session.ipAddress}\`;
      } catch (error) { document.getElementById('session-debug').innerHTML = 'Session info unavailable'; }
      
      const cookies = document.cookie.split(';').map(c => c.trim());
      const adminSession = cookies.find(c => c.startsWith('admin_session='));
      document.getElementById('cookie-debug').innerHTML = \`Session Cookie: \${adminSession ? 'Present' : '❌ NOT FOUND'}\\nTotal: \${cookies.length}\`;
    }
    
    document.getElementById('clear-debug').addEventListener('click', async () => {
      if (!confirm('Clear all sessions? You will be logged out.')) return;
      try {
        const result = await apiRequest('/api/debug/clear-sessions', {method: 'POST'});
        showStatus(\`✅ Cleared \${result.cleared} sessions\`, 'success');
        setTimeout(() => location.href = '/verysecretadminpanel', 3000);
      } catch (error) { showStatus('❌ Error: ' + error.message, 'error'); }
    });
    
    document.getElementById('refresh-debug').addEventListener('click', () => {
      loadDebugInfo(); showStatus('🔄 Refreshed', 'info');
    });
    
    loadDebugInfo();
  </script>
`;
