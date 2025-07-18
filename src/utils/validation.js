export function validatePostData(post) {
  const errors = [];
  
  if (!post || typeof post !== 'object') {
    errors.push('Invalid request body');
  }
  
  if (!post.title || typeof post.title !== 'string') {
    errors.push('Title is required and must be a string');
  }
  
  if (!post.content || typeof post.content !== 'string') {
    errors.push('Content is required and must be a string');
  }
  
  if (post.title && post.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }
  
  if (post.content && post.content.trim().length === 0) {
    errors.push('Content cannot be empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, error: 'Invalid slug' };
  }
  
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
    return { isValid: false, error: 'Slug contains invalid characters' };
  }
  
  return { isValid: true };
}
