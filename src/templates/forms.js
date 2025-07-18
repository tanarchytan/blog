export function createPostForm(post = null) {
  const isEdit = !!post;
  const title = isEdit ? post.title.replace(/"/g, '&quot;') : '';
  const content = isEdit ? post.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  
  return `
    <section class="admin-section">
      <h2>${isEdit ? '✏️ Edit Post' : '📝 Create New Post'}</h2>
      ${isEdit ? `<div class="post-meta">Created: ${new Date(post.createdAt).toLocaleDateString()} | Slug: ${post.slug}</div>` : ''}
      <form id="post-form" class="admin-form">
        <input type="text" id="title" name="title" placeholder="Post title" value="${title}" required />
        <textarea id="content" name="content" placeholder="Post content (HTML)" rows="15" required>${content}</textarea>
        <button type="button" id="preview-btn">Preview ${isEdit ? 'Changes' : 'Post'}</button>
        <button type="submit">${isEdit ? 'Update' : 'Create'} Post</button>
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

export function getPostFormScript(isEdit = false, originalSlug = null) {
  return `
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
        const url = ${isEdit ? `\`/api/posts/\${originalSlug}\`` : "'/api/posts'"};
        const method = ${isEdit ? "'PUT'" : "'POST'"};
        
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ title, content })
        });
        
        if (response.status === 401) {
          showStatus('⚠️ Session expired. Please login again.', 'warning');
          setTimeout(() => window.location.href = '/verysecretadminpanel', 2000);
          return;
        }
        
        const result = await handleApiError(response, 'Failed to ${isEdit ? 'update' : 'create'} post');

        if (result.success) {
          showStatus('✅ Post ${isEdit ? 'updated' : 'created'}! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/verysecretadminpanel?tab=${isEdit ? 'edit' : 'dashboard'}';
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
