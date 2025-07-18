import { getBlogTitle } from '../utils/domain.js';

export function createAdminTemplate(request, { title, content, activeTab = '' }) {
  const blogTitle = getBlogTitle(request);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title} - ${blogTitle}</title>
  <style>
    ${getAdminStyles()}
  </style>
</head>
<body>
  ${getAdminHeader(blogTitle)}
  ${getAdminTabs(activeTab)}
  <div class="tab-content">
    ${content}
  </div>
  <div id="status"></div>
  <script>
    ${getSharedAdminUtils()}
  </script>
</body>
</html>`;
}

export function createAdminLoginTemplate(request, error = null) {
  const blogTitle = getBlogTitle(request);
  
  const content = `
    <form class="login-form" method="POST" action="/admin/login">
      <h1>🔐 Admin Login</h1>
      ${error ? `<div class="error">${error}</div>` : ''}
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
    <div class="back-link"><a href="/">← Back to ${blogTitle}</a></div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Login - ${blogTitle}</title>
  <style>
    ${getLoginStyles()}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

function getAdminHeader(blogTitle) {
  return `
    <header>
      <h1><a href="/">${blogTitle} - Admin Panel</a></h1>
      <a href="/admin/logout" class="logout-btn">Logout</a>
    </header>
  `;
}

function getAdminTabs(activeTab) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'create', name: 'Create', icon: '📝' },
    { id: 'edit', name: 'Edit', icon: '✏️' },
    { id: 'debug', name: 'Debug', icon: '🔧' }
  ];

  return `
    <div class="tabs">
      ${tabs.map(tab => `
        <a href="/verysecretadminpanel?tab=${tab.id}" class="tab ${activeTab === tab.id ? 'active' : ''}">
          <span>${tab.icon}</span> ${tab.name}
        </a>
      `).join('')}
    </div>
  `;
}

function getAdminStyles() {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    header h1 { color: #2c3e50; margin: 0; }
    header h1 a { color: inherit; text-decoration: none; }
    header h1 a:hover { color: #3498db; }
    .logout-btn { background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; }
    
    .tabs { display: flex; gap: 0; margin-bottom: 30px; border-bottom: 1px solid #ddd; }
    .tab { background: #f8f9fa; color: #6c757d; padding: 12px 20px; border: 1px solid #ddd; border-bottom: none; cursor: pointer; text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .tab:hover { background: #e9ecef; }
    .tab.active { background: white; color: #2c3e50; border-bottom: 2px solid #3498db; }
    .tab-content { background: white; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
    
    .admin-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .admin-form input, .admin-form textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
    .admin-form button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px; }
    .admin-form button:hover { background: #2980b9; }
    .admin-form button#preview-btn { background: #17a2b8; }
    .admin-form button#preview-btn:hover { background: #138496; }
    
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .dashboard-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; }
    .dashboard-card h3 { color: #2c3e50; margin-top: 0; }
    .dashboard-card p { color: #6c757d; margin-bottom: 15px; }
    .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; cursor: pointer; font-size: 14px; margin-right: 10px; margin-bottom: 10px; }
    .btn-primary { background: #3498db; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-warning { background: #ffc107; color: black; }
    .btn:hover { opacity: 0.9; }
    
    .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .status.warning { background: #fff3cd; color: #856404; }
    .status.info { background: #d1ecf1; color: #0c5460; }
    
    #preview-content { border: 1px solid #ddd; padding: 20px; background: white; border-radius: 4px; margin-top: 10px; }
    #preview-content h1 { color: #2c3e50; margin-bottom: 10px; }
    #preview-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
    
    .debug-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .debug-data { background: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; overflow-x: auto; }
    .posts-list { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .post-item { background: white; padding: 15px; margin-bottom: 15px; border-radius: 4px; border: 1px solid #dee2e6; }
    .post-item h3 { margin-top: 0; color: #2c3e50; }
    .post-meta { color: #6c757d; font-size: 0.9em; margin-bottom: 10px; }
    .post-actions { display: flex; gap: 10px; }
    .loading { text-align: center; padding: 40px; color: #6c757d; }
  `;
}

function getLoginStyles() {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
    .login-form { background: #f8f9fa; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .login-form h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
    .login-form input { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
    .login-form button { width: 100%; background: #3498db; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .login-form button:hover { background: #2980b9; }
    .error { color: #e74c3c; margin-bottom: 15px; text-align: center; }
    .back-link { text-align: center; margin-top: 20px; }
    .back-link a { color: #3498db; text-decoration: none; }
  `;
}

function getSharedAdminUtils() {
  return `
    function showStatus(message, type = '') {
      const statusDiv = document.getElementById('status');
      if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = type ? \`status \${type}\` : '';
        setTimeout(() => { 
          statusDiv.textContent = ''; 
          statusDiv.className = ''; 
        }, 5000);
      }
    }

    async function uploadImage() {
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
        const response = await fetch('/api/upload', { 
          method: 'POST', 
          body: formData,
          credentials: 'same-origin'
        });
        const result = await response.json();

        if (result.url) {
          showStatus('✅ Image uploaded!', 'success');
          return result.url;
        } else {
          showStatus('❌ Upload failed: ' + (result.error || 'Unknown error'), 'error');
          return null;
        }
      } catch (error) {
        showStatus('❌ Upload error: ' + error.message, 'error');
        return null;
      }
    }

    function setupImageUpload(textareaId = 'content') {
      const uploadBtn = document.getElementById('upload-image');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
          const imageUrl = await uploadImage();
          if (imageUrl) {
            const textarea = document.getElementById(textareaId);
            if (textarea) {
              textarea.value += \`\\n<img src="\${imageUrl}" alt="" />\\n\`;
            }
          }
        });
      }
    }

    function setupPreview(titleId = 'title', contentId = 'content') {
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
            previewContent.innerHTML = \`
              <h1>\${title}</h1>
              <div style="color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                Preview - \${new Date().toLocaleDateString()}
              </div>
              <div style="line-height: 1.6;">\${content}</div>
            \`;
            
            previewSection.style.display = 'block';
            previewSection.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    }

    function handleApiError(response, defaultMessage) {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || defaultMessage);
        });
      }
      return response.json();
    }

    function validateSession() {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const adminSession = cookies.find(c => c.startsWith('admin_session='));
      
      if (!adminSession) {
        showStatus('Session expired. Please login again.', 'warning');
        setTimeout(() => {
          window.location.href = '/verysecretadminpanel';
        }, 2000);
        return false;
      }
      
      return true;
    }
  `;
}
