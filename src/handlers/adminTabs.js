import { 
  showStatus, 
  validateSession, 
  apiRequest, 
  escapeHtml, 
  uploadImage, 
  setupPreview, 
  setupPostForm, 
  deletePost, 
  loadPosts, 
  loadStats, 
  loadDebugInfo 
} from '../utils/adminUtils.js';

import { 
  createPostFormTemplate, 
  createDashboardCards, 
  createDebugSections 
} from '../templates/adminTemplates.js';

export function getDashboardTab() {
  return `
    ${createDashboardCards()}
    <script>
      // Initialize dashboard functionality
      loadStats();
      
      document.getElementById('clear-sessions-btn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear all sessions? This will log out all users.')) return;
        
        try {
          const result = await apiRequest('/api/debug/clear-sessions', { method: 'POST' });
          showStatus(\`✅ Cleared \${result.cleared} sessions\`, 'success');
        } catch (error) {
          showStatus('❌ Error clearing sessions: ' + error.message, 'error');
        }
      });
    </script>
  `;
}

export function getCreateTab() {
  return `
    ${createPostFormTemplate(false)}
    <script>
      // Initialize create post functionality
      setupPreview('title', 'content');
      setupPostForm(false);
      
      document.getElementById('upload-image').addEventListener('click', () => {
        uploadImage('content');
      });
    </script>
  `;
}

export function getEditListTab() {
  return `
    <div class="posts-list">
      <h2>📝 Manage Posts</h2>
      <div id="posts-container" class="loading">Loading posts...</div>
    </div>

    <script>
      async function displayPosts() {
        const container = document.getElementById('posts-container');
        const posts = await loadPosts();

        if (posts.length === 0) {
          container.innerHTML = '<p>No posts found. <a href="/verysecretadminpanel?tab=create">Create your first post</a></p>';
          container.className = '';
          return;
        }

        container.innerHTML = posts.map(post => \`
          <div class="post-item">
            <h3>\${escapeHtml(post.title)}</h3>
            <div class="post-meta">
              Published: \${new Date(post.createdAt).toLocaleDateString()} | 
              Slug: \${post.slug}
              \${post.updatedAt ? ' | Updated: ' + new Date(post.updatedAt).toLocaleDateString() : ''}
            </div>
            <div class="post-actions">
              <a href="/verysecretadminpanel/edit/\${post.slug}" class="btn btn-primary">Edit</a>
              <a href="/post/\${post.slug}" class="btn btn-success" target="_blank">View</a>
              <button class="btn btn-danger" onclick="deletePost('\${post.slug}')">Delete</button>
            </div>
          </div>
        \`).join('');
        container.className = '';
      }

      // Listen for posts changes
      document.addEventListener('postsChanged', displayPosts);
      
      // Make deletePost available globally
      window.deletePost = deletePost;
      
      displayPosts();
    </script>
  `;
}

export function getEditPostTab(post) {
  return `
    ${createPostFormTemplate(true, post)}
    <script>
      const originalSlug = '${post.slug}';
      
      setupPreview('title', 'content');
      setupPostForm(true, originalSlug);
      
      document.getElementById('upload-image').addEventListener('click', () => {
        uploadImage('content');
      });
    </script>
  `;
}

export function getDebugTab() {
  return `
    ${createDebugSections()}
    <script>
      // System test functionality
      document.getElementById('test-btn').addEventListener('click', async () => {
        const resultsDiv = document.getElementById('test-results');
        resultsDiv.textContent = 'Testing...';

        try {
          const result = await apiRequest('/api/test');

          if (result.success) {
            resultsDiv.textContent = 
              \`✅ System OK!\\n\` +
              \`KV Binding: \${result.kvBinding ? '✅ OK' : '❌ MISSING'}\\n\` +
              \`KV Test: \${result.kvTest ? '✅ OK' : '❌ FAILED'}\\n\` +
              \`R2 Binding: \${result.r2Binding ? '✅ OK' : '❌ MISSING'}\\n\` +
              \`R2 Test: \${result.r2Test ? '✅ OK' : '❌ FAILED'}\\n\` +
              \`Account ID: \${result.accountId ? '✅ OK' : '❌ MISSING'}\\n\` +
              \`Admin Password: \${result.adminPassword ? '✅ OK' : '❌ MISSING'}\\n\` +
              \`Active Sessions: \${result.security.activeSessions}\\n\` +
              \`Security Events: \${result.security.recentEvents}\\n\` +
              \`Session Timeout: \${result.security.sessionTimeout}\\n\` +
              \`Fingerprinting: \${result.security.fingerprinting}\\n\` +
              \`Validation: \${result.security.validation}\`;
          } else {
            resultsDiv.textContent = \`❌ Test Failed: \${result.error}\`;
          }
        } catch (error) {
          resultsDiv.textContent = \`❌ Error: \${error.message}\`;
        }
      });

      // Clear sessions and refresh functionality
      document.getElementById('clear-sessions-debug').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear all sessions? This will log out all users including yourself.')) return;
        
        try {
          const result = await apiRequest('/api/debug/clear-sessions', { method: 'POST' });
          showStatus(\`✅ Cleared \${result.cleared} sessions. You will be logged out.\`, 'success');
          setTimeout(() => window.location.href = '/verysecretadminpanel', 3000);
        } catch (error) {
          showStatus('❌ Error clearing sessions: ' + error.message, 'error');
        }
      });

      document.getElementById('refresh-debug').addEventListener('click', () => {
        loadDebugInfo();
        showStatus('🔄 Debug information refreshed', 'info');
      });

      // Load debug info on page load
      loadDebugInfo();
    </script>
  `;
}

// Make utilities available globally for inline event handlers
if (typeof window !== 'undefined') {
  window.showStatus = showStatus;
  window.validateSession = validateSession;
  window.apiRequest = apiRequest;
  window.escapeHtml = escapeHtml;
  window.uploadImage = uploadImage;
  window.setupPreview = setupPreview;
  window.setupPostForm = setupPostForm;
  window.deletePost = deletePost;
  window.loadPosts = loadPosts;
  window.loadStats = loadStats;
  window.loadDebugInfo = loadDebugInfo;
}
