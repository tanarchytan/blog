// Admin HTML templates - reduces duplication in adminTabs.js

export function createPostFormTemplate(isEdit = false, post = null) {
  const title = isEdit ? 'Edit Post' : 'Create New Post';
  const buttonText = isEdit ? 'Update Post' : 'Create Post';
  const formId = isEdit ? 'edit-form' : 'post-form';
  
  const escapedTitle = post?.title?.replace(/"/g, '&quot;').replace(/'/g, '&#39;') || '';
  const escapedContent = post?.content?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '';
  
  return `
    <section class="admin-section">
      <h2>${isEdit ? '✏️' : '📝'} ${title}</h2>
      ${isEdit ? `<div class="post-meta">
        Created: ${new Date(post.createdAt).toLocaleDateString()} | 
        Slug: ${post.slug}
        ${post.updatedAt ? ' | Last Updated: ' + new Date(post.updatedAt).toLocaleDateString() : ''}
      </div>` : ''}
      <form id="${formId}" class="admin-form">
        <input type="text" id="title" name="title" placeholder="Post title" value="${escapedTitle}" required />
        <textarea id="content" name="content" placeholder="Post content (HTML)" rows="15" required>${escapedContent}</textarea>
        <button type="button" id="preview-btn">Preview ${isEdit ? 'Changes' : 'Post'}</button>
        <button type="submit">${buttonText}</button>
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
  `;
}

export function createDashboardCards() {
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
  `;
}

export function createDebugSections() {
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
  `;
}
