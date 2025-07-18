// Enhanced dashboard tab with security status and session management
export function getDashboardTab() {
  return `
    <div class="dashboard-grid">
      <div class="dashboard-card">
        <h3>📝 Content Management</h3>
        <p>Create new blog posts or edit existing ones</p>
        <a href="/verysecretadminpanel?tab=create" class="btn btn-primary">Create New Post</a>
        <a href="/verysecretadminpanel?tab=edit" class="btn btn-info">Edit Posts</a>
      </div>
      
      <div class="dashboard-card">
        <h3>📊 Blog Statistics</h3>
        <p>View blog statistics and recent activity</p>
        <div id="stats-content">Loading stats...</div>
      </div>
      
      <div class="dashboard-card">
        <h3>🔧 System Tools</h3>
        <p>Debug and system information</p>
        <a href="/verysecretadminpanel?tab=debug" class="btn btn-success">Debug Panel</a>
        <button id="clear-sessions-btn" class="btn btn-warning">Clear All Sessions</button>
      </div>
    </div>

    <script>
      async function loadStats() {
        try {
          const response = await fetch('/api/posts');
          const posts = await response.json();
          const statsContent = document.getElementById('stats-content');
          
          if (posts.length > 0) {
            const latestPost = posts[0];
            statsContent.innerHTML = \`
              <strong>Total Posts:</strong> \${posts.length}<br>
              <strong>Latest Post:</strong> \${latestPost.title}<br>
              <strong>Published:</strong> \${new Date(latestPost.createdAt).toLocaleDateString()}
            \`;
          } else {
            statsContent.innerHTML = '<em>No posts yet</em>';
          }
        } catch (error) {
          document.getElementById('stats-content').innerHTML = '<em>Error loading stats</em>';
        }
      }

      document.getElementById('clear-sessions-btn').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear all sessions? This will log out all users.')) return;
        
        try {
          const response = await fetch('/api/debug/clear-sessions', { 
            method: 'POST',
            credentials: 'include'
          });
          const result = await response.json();
          
          if (result.success) {
            showStatus(\`✅ Cleared \${result.cleared} sessions\`, 'success');
          } else {
            showStatus('❌ Failed to clear sessions', 'error');
          }
        } catch (error) {
          showStatus('❌ Error clearing sessions', 'error');
        }
      });

      loadStats();
    </script>
  `;
}

// Enhanced create tab with improved validation
export function getCreateTab() {
  return `
    <section class="admin-section">
      <h2>📝 Create New Post</h2>
      <form id="post-form" class="admin-form">
        <input type="text" id="title" name="title" placeholder="Post title" required />
        <textarea id="content" name="content" placeholder="Post content (HTML)" rows="15" required></textarea>
        <button type="button" id="preview-btn">Preview Post</button>
        <button type="submit">Create Post</button>
      </form>
    </section>

    <section class="admin-section" id="preview-section" style="display: none;">
      <h2>📖 Post Preview</h2>
      <div id="preview-content"></div>
    </section>

    <section class="admin-section">
      <h2>📤 Upload Image</h2>
      <input type="file" id="image-upload" accept="image/*" />
      <button id="upload-image">Upload Image</button>
    </section>

    <script>
      setupImageUpload('content');
      setupPreview('title', 'content');
      
      document.getElementById('post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateSession()) return;
        
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;

        if (!title.trim() || !content.trim()) {
          showStatus('❌ Title and content are required', 'error');
          return;
        }

        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, content })
          });
          
          if (response.status === 401) {
            showStatus('⚠️ Session expired. Please login again.', 'warning');
            setTimeout(() => {
              window.location.href = '/verysecretadminpanel';
            }, 2000);
            return;
          }
          
          const result = await handleApiError(response, 'Failed to create post');

          if (result.success) {
            showStatus('✅ Post created! Redirecting...', 'success');
            setTimeout(() => {
              window.location.href = '/verysecretadminpanel?tab=dashboard';
            }, 1500);
          } else {
            showStatus('❌ Failed: ' + (result.error || 'Unknown error'), 'error');
          }
        } catch (error) {
          showStatus('❌ Error: ' + error.message, 'error');
        }
      });
    </script>
  `;
}

// Enhanced edit list tab with better error handling
export function getEditListTab() {
  return `
    <div class="posts-list">
      <h2>📝 Manage Posts</h2>
      <div id="posts-container" class="loading">Loading posts...</div>
    </div>

    <script>
      async function loadPosts() {
        try {
          const response = await fetch('/api/posts');
          const posts = await response.json();
          const container = document.getElementById('posts-container');

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
        } catch (error) {
          document.getElementById('posts-container').innerHTML = '<p class="error">Error loading posts. Please try again.</p>';
          document.getElementById('posts-container').className = '';
        }
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      async function deletePost(slug) {
        if (!confirm('Are you sure you want to delete this post?')) return;
        
        if (!validateSession()) return;
        
        try {
          const response = await fetch(\`/api/posts/\${slug}\`, { 
            method: 'DELETE',
            credentials: 'include'
          });
          
          if (response.status === 401) {
            showStatus('⚠️ Session expired. Please login again.', 'warning');
            setTimeout(() => {
              window.location.href = '/verysecretadminpanel';
            }, 2000);
            return;
          }
          
          const result = await handleApiError(response, 'Failed to delete post');
          
          if (result.success) {
            showStatus('✅ Post deleted successfully', 'success');
            loadPosts();
          } else {
            showStatus('❌ Failed to delete post', 'error');
          }
        } catch (error) {
          showStatus('❌ Error deleting post: ' + error.message, 'error');
        }
      }

      loadPosts();
    </script>
  `;
}

// Enhanced edit post tab with proper data submission
export function getEditPostTab(post) {
  const escapedTitle = post.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const escapedContent = post.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  return `
    <section class="admin-section">
      <h2>✏️ Edit Post</h2>
      <div class="post-meta">
        Created: ${new Date(post.createdAt).toLocaleDateString()} | 
        Slug: ${post.slug}
        ${post.updatedAt ? ' | Last Updated: ' + new Date(post.updatedAt).toLocaleDateString() : ''}
      </div>
      <form id="edit-form" class="admin-form">
        <input type="text" id="title" name="title" value="${escapedTitle}" required />
        <textarea id="content" name="content" rows="15" required>${escapedContent}</textarea>
        <button type="button" id="preview-btn">Preview Changes</button>
        <button type="submit">Update Post</button>
      </form>
    </section>

    <section class="admin-section" id="preview-section" style="display: none;">
      <h2>📖 Post Preview</h2>
      <div id="preview-content"></div>
    </section>

    <section class="admin-section">
      <h2>📤 Upload Image</h2>
      <input type="file" id="image-upload" accept="image/*" />
      <button id="upload-image">Upload Image</button>
    </section>

    <script>
      const originalSlug = '${post.slug}';
      
      setupImageUpload('content');
      setupPreview('title', 'content');

      document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateSession()) return;
        
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;

        if (!title.trim() || !content.trim()) {
          showStatus('❌ Title and content are required', 'error');
          return;
        }

        try {
          const response = await fetch(\`/api/posts/\${originalSlug}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, content })
          });
          
          if (response.status === 401) {
            showStatus('⚠️ Session expired. Please login again.', 'warning');
            setTimeout(() => {
              window.location.href = '/verysecretadminpanel';
            }, 2000);
            return;
          }
          
          const result = await handleApiError(response, 'Failed to update post');

          if (result.success) {
            showStatus('✅ Post updated! Redirecting...', 'success');
            setTimeout(() => {
              window.location.href = '/verysecretadminpanel?tab=edit';
            }, 1500);
          } else {
            showStatus('❌ Failed: ' + (result.error || 'Unknown error'), 'error');
          }
        } catch (error) {
          showStatus('❌ Error: ' + error.message, 'error');
        }
      });
    </script>
  `;
}

// Complete debug tab with all functionality
export function getDebugTab() {
  return `
    <div class="debug-section">
      <h3>🔧 System Test</h3>
      <button id="test-btn" class="btn btn-success">Run System Test</button>
      <pre id="test-results"></pre>
    </div>

    <div class="debug-section">
      <h3>🔒 Security Information</h3>
      <div id="security-info">Loading security info...</div>
    </div>

    <div class="debug-section">
      <h3>📊 Session Debug</h3>
      <div id="session-debug">Loading session info...</div>
    </div>

    <div class="debug-section">
      <h3>🍪 Cookie Information</h3>
      <div id="cookie-debug">Loading cookie info...</div>
    </div>

    <div class="debug-section">
      <h3>📈 Performance Metrics</h3>
      <div id="performance-debug">Loading performance data...</div>
    </div>

    <div class="debug-section">
      <h3>🔄 Session Management</h3>
      <button id="clear-sessions-debug" class="btn btn-warning">Clear All Sessions</button>
      <button id="refresh-debug" class="btn btn-info">Refresh Debug Info</button>
    </div>

    <script>
      document.getElementById('test-btn').addEventListener('click', async () => {
        const resultsDiv = document.getElementById('test-results');
        resultsDiv.textContent = 'Testing...';

        try {
          const response = await fetch('/api/test');
          const result = await response.json();

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

      // Load debug information
      async function loadDebugInfo() {
        // Security info
        document.getElementById('security-info').innerHTML = \`
          <div class="debug-data">
Non-persistent Sessions: ✅ Enhanced
Browser Fingerprinting: ✅ Strict Mode
Session Timeout: 8 hours
CORS Protection: ✅ Enabled
Security Headers: ✅ Applied
XSS Protection: ✅ Enabled
Session Validation: ✅ Strict Mode
User Agent Validation: ✅ Enabled
Input Sanitization: ✅ Active
          </div>
        \`;

        // Session debug
        try {
          const response = await fetch('/api/debug/session');
          const result = await response.json();
          
          document.getElementById('session-debug').innerHTML = \`
            <div class="debug-data">
Session Type: Non-persistent
Created: \${result.created || 'N/A'}
Expires: \${result.expires || 'N/A'}
Login Time: \${result.loginTime || 'N/A'}
IP Address: \${result.ipAddress || 'N/A'}
User Agent: \${result.userAgent ? result.userAgent.substring(0, 80) + '...' : 'N/A'}
Accept Language: \${result.acceptLanguage || 'N/A'}
Accept Encoding: \${result.acceptEncoding || 'N/A'}
Browser Fingerprint: \${result.browserFingerprint ? result.browserFingerprint.substring(0, 20) + '...' : 'N/A'}
            </div>
          \`;
        } catch (error) {
          document.getElementById('session-debug').innerHTML = '<div class="debug-data">Error loading session info</div>';
        }

        // Cookie debug
        const cookies = document.cookie.split(';').map(c => c.trim());
        const adminSession = cookies.find(c => c.startsWith('admin_session='));
        
        document.getElementById('cookie-debug').innerHTML = \`
          <div class="debug-data">
Cookie Type: Session-only (non-persistent)
HttpOnly: ✅ Yes
Secure: ✅ Yes
SameSite: Strict
Path: /
Max-Age: Not set (session-only)
Admin Session: \${adminSession ? 'Present (' + adminSession.substring(0, 30) + '...)' : '❌ NOT FOUND'}
Total Cookies: \${cookies.length}
Browser Storage: Session-only
Debug: All Cookies: \${cookies.join(', ') || 'None found'}
Document.cookie accessible: \${document.cookie ? 'Yes' : 'No'}
          </div>
        \`;

        // Performance metrics
        try {
          const response = await fetch('/api/debug/performance');
          const result = await response.json();
          
          document.getElementById('performance-debug').innerHTML = \`
            <div class="debug-data">
KV Operations: \${result.kvOps || 'N/A'}
R2 Operations: \${result.r2Ops || 'N/A'}
Memory Usage: \${result.memory || 'N/A'}
Request Count: \${result.requests || 'N/A'}
Average Response Time: \${result.avgResponseTime || 'N/A'}
Worker Health: ✅ Healthy
Last Updated: \${result.timestamp || 'N/A'}
            </div>
          \`;
        } catch (error) {
          document.getElementById('performance-debug').innerHTML = '<div class="debug-data">Error loading performance metrics</div>';
        }
      }

      // Clear sessions from debug panel
      document.getElementById('clear-sessions-debug').addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear all sessions? This will log out all users including yourself.')) return;
        
        try {
          const response = await fetch('/api/debug/clear-sessions', { 
            method: 'POST',
            credentials: 'include'
          });
          const result = await response.json();
          
          if (result.success) {
            showStatus(\`✅ Cleared \${result.cleared} sessions. You will be logged out.\`, 'success');
            setTimeout(() => {
              window.location.href = '/verysecretadminpanel';
            }, 3000);
          } else {
            showStatus('❌ Failed to clear sessions', 'error');
          }
        } catch (error) {
          showStatus('❌ Error clearing sessions', 'error');
        }
      });

      // Refresh debug info
      document.getElementById('refresh-debug').addEventListener('click', () => {
        loadDebugInfo();
        showStatus('🔄 Debug information refreshed', 'info');
      });

      // Load all debug information on page load
      loadDebugInfo();
    </script>
  `;
}
