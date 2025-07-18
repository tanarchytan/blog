// ALL shared JavaScript utilities in one place
export const SHARED_SCRIPTS = `
  function showStatus(message, type = '') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = type ? \`status \${type}\` : '';
      setTimeout(() => { statusDiv.textContent = ''; statusDiv.className = ''; }, 5000);
    }
  }

  function validateSession() {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const adminSession = cookies.find(c => c.startsWith('admin_session='));
    if (!adminSession) {
      showStatus('Session expired. Please login again.', 'warning');
      setTimeout(() => window.location.href = '/verysecretadminpanel', 2000);
      return false;
    }
    return true;
  }

  function handleApiError(response, defaultMessage) {
    if (!response.ok) {
      return response.json().then(data => { throw new Error(data.error || defaultMessage); });
    }
    return response.json();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    if (response.status === 401) {
      showStatus('⚠️ Session expired. Please login again.', 'warning');
      setTimeout(() => window.location.href = '/verysecretadminpanel', 2000);
      throw new Error('Session expired');
    }
    
    return handleApiError(response, 'Request failed');
  }

  function setupImageUpload(textareaId) {
    const uploadBtn = document.getElementById('upload-image');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', async () => {
        const fileInput = document.getElementById('image-upload');
        const file = fileInput.files[0];
        if (!file) return showStatus('Please select an image', 'error');
        if (file.size > 10 * 1024 * 1024) return showStatus('File too large. Max 10MB.', 'error');
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) return showStatus('Invalid file type.', 'error');
        
        showStatus('📤 Uploading...');
        const formData = new FormData();
        formData.append('image', file);
        
        try {
          const result = await apiRequest('/api/upload', { method: 'POST', body: formData, headers: {} });
          if (result.url) {
            document.getElementById(textareaId).value += \`\\n<img src="\${result.url}" alt="" />\\n\`;
            showStatus('✅ Image uploaded!', 'success');
          }
        } catch (error) {
          showStatus('❌ Upload error: ' + error.message, 'error');
        }
      });
    }
  }

  function setupPreview(titleId, contentId) {
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        const title = document.getElementById(titleId).value;
        const content = document.getElementById(contentId).value;
        if (!title || !content) return showStatus('Please fill in both title and content for preview', 'error');
        
        const previewSection = document.getElementById('preview-section');
        const previewContent = document.getElementById('preview-content');
        if (previewSection && previewContent) {
          previewContent.innerHTML = \`<h1>\${title}</h1><div style="color: #7f8c8d; font-size: 0.9em; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Preview - \${new Date().toLocaleDateString()}</div><div style="line-height: 1.6;">\${content}</div>\`;
          previewSection.style.display = 'block';
          previewSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }
`;

export const SHARED_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
  .admin-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .admin-form input, .admin-form textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
  .admin-form button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px; }
  .admin-form button:hover { background: #2980b9; }
  .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; cursor: pointer; font-size: 14px; margin-right: 10px; margin-bottom: 10px; }
  .btn-primary { background: #3498db; color: white; } .btn-success { background: #28a745; color: white; } .btn-info { background: #17a2b8; color: white; } .btn-danger { background: #dc3545; color: white; } .btn-warning { background: #ffc107; color: black; }
  .btn:hover { opacity: 0.9; }
  .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
  .status.success { background: #d4edda; color: #155724; } .status.error { background: #f8d7da; color: #721c24; } .status.warning { background: #fff3cd; color: #856404; } .status.info { background: #d1ecf1; color: #0c5460; }
  .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
  .dashboard-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; }
  .dashboard-card h3 { color: #2c3e50; margin-top: 0; } .dashboard-card p { color: #6c757d; margin-bottom: 15px; }
  .debug-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
  .debug-data { background: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px; white-space: pre-wrap; overflow-x: auto; }
  .posts-list { background: #f8f9fa; padding: 20px; border-radius: 8px; }
  .post-item { background: white; padding: 15px; margin-bottom: 15px; border-radius: 4px; border: 1px solid #dee2e6; }
  .post-item h3 { margin-top: 0; color: #2c3e50; } .post-meta { color: #6c757d; font-size: 0.9em; margin-bottom: 10px; } .post-actions { display: flex; gap: 10px; }
  .loading { text-align: center; padding: 40px; color: #6c757d; }
  #preview-content { border: 1px solid #ddd; padding: 20px; background: white; border-radius: 4px; margin-top: 10px; }
  #preview-content h1 { color: #2c3e50; margin-bottom: 10px; } #preview-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
`;

export function createTemplate(title, content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title><style>${SHARED_STYLES}</style></head><body>${content}<div id="status"></div><script>${SHARED_SCRIPTS}</script></body></html>`;
}
