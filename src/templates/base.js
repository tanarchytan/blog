export function createBaseTemplate(title, content, styles = '', scripts = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${getBaseStyles()}${styles}</style>
</head>
<body>
  ${content}
  <script>${getBaseScripts()}${scripts}</script>
</body>
</html>`;
}

export function getBaseStyles() {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
    .admin-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .admin-form input, .admin-form textarea { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
    .admin-form button { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-right: 10px; }
    .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; cursor: pointer; font-size: 14px; margin-right: 10px; margin-bottom: 10px; }
    .btn-primary { background: #3498db; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-warning { background: #ffc107; color: black; }
    .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
    .status.warning { background: #fff3cd; color: #856404; }
    .status.info { background: #d1ecf1; color: #0c5460; }
  `;
}

export function getBaseScripts() {
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

    function handleApiError(response, defaultMessage) {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || defaultMessage);
        });
      }
      return response.json();
    }
  `;
}
