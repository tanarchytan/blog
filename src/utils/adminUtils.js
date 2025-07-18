export function setupImageUpload(textareaId = 'content') {
  const uploadBtn = document.getElementById('upload-image');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
      const imageUrl = await uploadImage();
      if (imageUrl) {
        const textarea = document.getElementById(textareaId);
        if (textarea) {
          textarea.value += `\n<img src="${imageUrl}" alt="" />\n`;
        }
      }
    });
  }
}

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

export async function uploadImage() {
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
