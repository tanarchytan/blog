import { generateSlug } from './post.js';
import { validatePostData } from '../utils/validation.js';
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../utils/apiHelpers.js';

export async function createPost(request, env) {
  try {
    const post = await request.json();
    
    // Validate input
    const validation = validatePostData(post);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation.errors);
    }
    
    const slug = generateSlug(post.title);
    
    // Check for duplicate slug
    const existingPost = await env.BLOG_POSTS.get(slug);
    if (existingPost) {
      return createErrorResponse({ 
        error: 'A post with this title already exists',
        conflictingSlug: slug 
      }, 409);
    }
    
    const postData = {
      title: post.title.trim(),
      content: post.content.trim(),
      slug,
      createdAt: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    await env.BLOG_POSTS.put(slug, JSON.stringify(postData));
    
    return createSuccessResponse({ success: true, slug });
  } catch (error) {
    return handleApiError('create post', error);
  }
}

export async function updatePost(request, env, slug) {
  try {
    const post = await request.json();
    
    // Validate input
    const validation = validatePostData(post);
    if (!validation.isValid) {
      return createValidationErrorResponse(validation.errors);
    }
    
    const newSlug = generateSlug(post.title);
    
    // Get existing post
    const existingPost = await env.BLOG_POSTS.get(slug);
    if (!existingPost) {
      return createErrorResponse('Post not found', 404);
    }
    
    const existingData = JSON.parse(existingPost);
    
    const updatedPost = {
      ...existingData,
      title: post.title.trim(),
      content: post.content.trim(),
      slug: newSlug,
      updatedAt: new Date().toISOString()
    };
    
    // Handle slug changes
    if (slug !== newSlug) {
      const conflictingPost = await env.BLOG_POSTS.get(newSlug);
      if (conflictingPost) {
        return createErrorResponse({ 
          error: 'A post with this title already exists',
          conflictingSlug: newSlug 
        }, 409);
      }
      await env.BLOG_POSTS.delete(slug);
    }
    
    await env.BLOG_POSTS.put(newSlug, JSON.stringify(updatedPost));
    
    // Log the update for audit purposes
    await env.BLOG_POSTS.put(`security_update_${Date.now()}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'post_updated',
      oldSlug: slug,
      newSlug: newSlug,
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
    }), { expirationTtl: 604800 });
    
    return createSuccessResponse({ success: true, slug: newSlug });
  } catch (error) {
    return handleApiError('update post', error);
  }
}

export async function deletePost(request, env, slug) {
  try {
    // Check if post exists
    const existingPost = await env.BLOG_POSTS.get(slug);
    if (!existingPost) {
      return createErrorResponse('Post not found', 404);
    }
    
    // Log the deletion for audit purposes
    await env.BLOG_POSTS.put(`security_delete_${Date.now()}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'post_deleted',
      slug: slug,
      ipAddress: request.headers.get('CF-Connecting-IP') || 'unknown'
    }), { expirationTtl: 604800 });
    
    await env.BLOG_POSTS.delete(slug);
    
    return createSuccessResponse({ success: true });
  } catch (error) {
    return handleApiError('delete post', error);
  }
}
