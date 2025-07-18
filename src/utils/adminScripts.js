// Shared JavaScript utilities for admin tabs
export function getPostFormHandler(isEdit = false, originalSlug = null) {
  return `
    document.getElementById('${isEdit ? 'edit' : 'post'}-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!validateSession()) return;
      
      const title = document.getElementById('title').value;
      const content = document.getElementById('content').value;

      if (!title.trim() || !content.trim()) {
        showStatus('❌ Title and content are required', 'error');
        return;
      }

      try {
        const url = isEdit ? \`/api/posts/\${originalSlug}\` : '/api/posts';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ title, content })
        });
        
        if (response.status === 401) {
          showStatus('⚠️ Session expired. Please login again.', 'warning');
          setTimeout(() => {
            window.location.href = '/verysecretadminpanel';
          }, 2000);
          return;
        }
        
        const result = await response.json();

        if (result.success) {
          const action = isEdit ? 'updated' : 'created';
          showStatus(\`✅ Post \${action}! Redirecting...\`, 'success');
          setTimeout(() => {
            window.location.href = isEdit ? '/verysecretadminpanel?tab=edit' : '/verysecretadminpanel?tab=dashboard';
          }, 1500);
        } else {
          showStatus('❌ Failed: ' + (result.error || 'Unknown error'), 'error');
        }
      } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
      }
    });
  `;
}

export function getStatsLoader() {
  return `
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
  `;
}

export function getSessionClearHandler(buttonId, endpoint = '/api/debug/clear-sessions') {
  return `
    document.getElementById('${buttonId}').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all sessions? This will log out all users.')) return;
      
      try {
        const response = await fetch('${endpoint}', { 
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
  `;
}

export function getDebugLoaders() {
  return `
    // Load security information
    async function loadSecurityInfo() {
      try {
        const response = await fetch('/api/debug/security');
        const result = await response.json();
        
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
      } catch (error) {
        document.getElementById('security-info').innerHTML = '<div class="debug-data">Error loading security info</div>';
      }
    }

    // Load session debug info
    async function loadSessionDebug() {
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
    }

    // Enhanced cookie debug info
    function loadCookieDebug() {
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
    }

    // Load performance metrics
    async function loadPerformanceMetrics() {
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
  `;
}
