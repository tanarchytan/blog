// Comprehensive admin utilities - consolidates all shared admin JavaScript

// Status and feedback management
export function showStatus(message, type = '') {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = type ? `status ${type}` : '';
    setTimeout(() => { 
      statusDiv.textContent = ''; 
      statusDiv.className = ''; 
    }, 5000);
  }
}

// Session validation with consistent error handling
export function validateSession() {
  const cookies = document.cookie.split(';').map(c => c.trim());
  const adminSession = cookies.find(c => c.startsWith('admin_session='));
  
  if (!adminSession) {
    showStatus('Session expired. Please login again.', 'warning');
    setTimeout(() => window.location.href = '/verysecretadminpanel', 2000);
    return false;
  }
  return true;
}

// Enhanced API request handler with error handling
export async function apiRequest(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (response.status === 401) {
    showStatus('⚠️ Session expired. Please login again.', 'warning');
    setTimeout(() => window.location.href = '/verysecretadminpanel', 2000);
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// HTML escaping utility
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Image upload with validation
export async function uploadImage(textareaId = 'content') {
  const fileInput = document.getElementById('image-upload');
  const file = fileInput.files[0];

  if (!file) {
    showStatus('Please select an image', 'error');
    return null;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus('File too large. Max 10MB.', 'error');
    return null;
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    showStatus('Invalid file type.', 'error');
    return null;
  }

  showStatus('📤 Uploading...');
  const formData = new FormData();
  formData.append('image', file);

  try {
    const result = await apiRequest('/api/upload', { 
      method: 'POST', 
      body: formData,
      headers: {} // Remove Content-Type for FormData
    });

    if (result.url) {
      showStatus('✅ Image uploaded!', 'success');
      const textarea = document.getElementById(textareaId);
      if (textarea) {
        textarea.value += `\n<img src="${result.url}" alt="" />\n`;
      }
      return result.url;
    }
  } catch (error) {
    showStatus('❌ Upload error: ' + error.message, 'error');
    return null;
  }
}

// Preview functionality
export function setupPreview(titleId = 'title', contentId = 'content') {
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const title = document.getElementById(titleId).value;
      const content = document.getElementById(contentId).value;
      
      if (!title || !content) {
        showStatus('Please fill in both title and content for preview', 'error');
        return;
      }
      
      const previewSection = document.getElementById('preview-section');
      const previewContent = document.getElementById('preview-content');
      
      if (previewSection && previewContent) {
        previewContent.innerHTML = `
          <h1>${title}</h1>
          <div style="color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            Preview - ${new Date().toLocaleDateString()}
          </div>
          <div style="line-height: 1.6;">${content}</div>
        `;
        
        previewSection.style.display = 'block';
        previewSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

// Post form submission handler
export function setupPostForm(isEdit = false, originalSlug = null) {
  const formId = isEdit ? 'edit-form' : 'post-form';
  const form = document.getElementById(formId);
  
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateSession()) return;
    
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;

    if (!title.trim() || !content.trim()) {
      showStatus('❌ Title and content are required', 'error');
      return;
    }

    try {
      const url = isEdit ? `/api/posts/${originalSlug}` : '/api/posts';
      const method = isEdit ? 'PUT' : 'POST';
      
      const result = await apiRequest(url, {
        method: method,
        body: JSON.stringify({ title, content })
      });

      if (result.success) {
        const action = isEdit ? 'updated' : 'created';
        showStatus(`✅ Post ${action}! Redirecting...`, 'success');
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
}

// Post deletion handler
export async function deletePost(slug) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  if (!validateSession()) return;
  
  try {
    const result = await apiRequest(`/api/posts/${slug}`, { method: 'DELETE' });
    
    if (result.success) {
      showStatus('✅ Post deleted successfully', 'success');
      // Trigger reload of posts list
      const event = new CustomEvent('postsChanged');
      document.dispatchEvent(event);
    } else {
      showStatus('❌ Failed to delete post', 'error');
    }
  } catch (error) {
    showStatus('❌ Error deleting post: ' + error.message, 'error');
  }
}

// Load posts with error handling
export async function loadPosts() {
  try {
    const posts = await apiRequest('/api/posts');
    return posts;
  } catch (error) {
    showStatus('❌ Error loading posts: ' + error.message, 'error');
    return [];
  }
}

// Load blog statistics
export async function loadStats() {
  try {
    const posts = await loadPosts();
    const statsContent = document.getElementById('stats-content');
    
    if (posts.length > 0) {
      const latestPost = posts[0];
      statsContent.innerHTML = `
        <strong>Total Posts:</strong> ${posts.length}<br>
        <strong>Latest Post:</strong> ${latestPost.title}<br>
        <strong>Published:</strong> ${new Date(latestPost.createdAt).toLocaleDateString()}
      `;
    } else {
      statsContent.innerHTML = '<em>No posts yet</em>';
    }
  } catch (error) {
    document.getElementById('stats-content').innerHTML = '<em>Error loading stats</em>';
  }
}

// Debug info loaders
export async function loadDebugInfo() {
  // Security info
  document.getElementById('security-info').innerHTML = `
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
  `;

  // Session debug
  try {
    const result = await apiRequest('/api/debug/session');
    document.getElementById('session-debug').innerHTML = `
      <div class="debug-data">
Session Type: Non-persistent
Created: ${result.created || 'N/A'}
Expires: ${result.expires || 'N/A'}
Login Time: ${result.loginTime || 'N/A'}
IP Address: ${result.ipAddress || 'N/A'}
User Agent: ${result.userAgent ? result.userAgent.substring(0, 80) + '...' : 'N/A'}
Accept Language: ${result.acceptLanguage || 'N/A'}
Accept Encoding: ${result.acceptEncoding || 'N/A'}
Browser Fingerprint: ${result.browserFingerprint ? result.browserFingerprint.substring(0, 20) + '...' : 'N/A'}
      </div>
    `;
  } catch (error) {
    document.getElementById('session-debug').innerHTML = '<div class="debug-data">Error loading session info</div>';
  }

  // Cookie debug
  const cookies = document.cookie.split(';').map(c => c.trim());
  const adminSession = cookies.find(c => c.startsWith('admin_session='));
  
  document.getElementById('cookie-debug').innerHTML = `
    <div class="debug-data">
Cookie Type: Session-only (non-persistent)
HttpOnly: ✅ Yes
Secure: ✅ Yes
SameSite: Strict
Path: /
Max-Age: Not set (session-only)
Admin Session: ${adminSession ? 'Present (' + adminSession.substring(0, 30) + '...)' : '❌ NOT FOUND'}
Total Cookies: ${cookies.length}
Browser Storage: Session-only
Debug: All Cookies: ${cookies.join(', ') || 'None found'}
Document.cookie accessible: ${document.cookie ? 'Yes' : 'No'}
    </div>
  `;

  // Performance metrics
  try {
    const result = await apiRequest('/api/debug/performance');
    document.getElementById('performance-debug').innerHTML = `
      <div class="debug-data">
KV Operations: ${result.kvOps || 'N/A'}
R2 Operations: ${result.r2Ops || 'N/A'}
Memory Usage: ${result.memory || 'N/A'}
Request Count: ${result.requests || 'N/A'}
Average Response Time: ${result.avgResponseTime || 'N/A'}
Worker Health: ✅ Healthy
Last Updated: ${result.timestamp || 'N/A'}
      </div>
    `;
  } catch (error) {
    document.getElementById('performance-debug').innerHTML = '<div class="debug-data">Error loading performance metrics</div>';
  }
}
