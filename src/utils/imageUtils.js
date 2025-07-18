export function isValidImageFile(file) {
  if (file.size > 10 * 1024 * 1024) return false;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type);
}

export function isValidImageRequest(filename) {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
  if (filename.length > 255) return false;
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

export function generateSecureFilename(originalName) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  return `${timestamp}-${randomId}${extension}`;
}

export function getContentTypeFromFilename(filename) {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return contentTypes[extension] || 'image/jpeg';
}

export async function trackImageUpload(env, filename, originalName) {
  try {
    const uploadData = {
      filename,
      originalName,
      uploadedAt: new Date().toISOString(),
      storageType: 'r2'
    };
    await env.BLOG_POSTS.put(`image_${filename}`, JSON.stringify(uploadData));
  } catch (error) {
    console.error('Error tracking image upload:', error);
  }
}
