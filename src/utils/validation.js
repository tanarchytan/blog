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

  if (post.title && post.title.length > 200) {
    errors.push('Title must be less than 200 characters');
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

  if (slug.length > 100) {
    return { isValid: false, error: 'Slug too long' };
  }
  
  return { isValid: true };
}

export function validateSettings(settings) {
  const errors = [];
  
  if (!settings || typeof settings !== 'object') {
    errors.push('Settings must be an object');
    return { isValid: false, errors };
  }

  // Validate blog settings
  if (settings.blog) {
    if (settings.blog.defaultTitle && typeof settings.blog.defaultTitle !== 'string') {
      errors.push('Blog title must be a string');
    }
    if (settings.blog.defaultDescription && typeof settings.blog.defaultDescription !== 'string') {
      errors.push('Blog description must be a string');
    }
  }

  // Validate domain settings
  if (settings.domains && typeof settings.domains !== 'object') {
    errors.push('Domains must be an object');
  }

  // Validate theme settings
  if (settings.theme) {
    if (settings.theme.primaryColor && !/^#[0-9A-F]{6}$/i.test(settings.theme.primaryColor)) {
      errors.push('Primary color must be a valid hex color');
    }
    if (settings.theme.accentColor && !/^#[0-9A-F]{6}$/i.test(settings.theme.accentColor)) {
      errors.push('Accent color must be a valid hex color');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
