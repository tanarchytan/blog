import { getBasicSecurityHeaders } from '../utils/security.js';
import { createPostTemplate, createHomeTemplate, createErrorTemplate } from '../templates/blog.js';

export async function getAllPosts(env) {
  const posts = [];

  try {
    if (!env.BLOG_POSTS) throw new Error('KV namespace BLOG_POSTS not found');

    const list = await env.BLOG_POSTS.list();

    for (const key of list.keys) {
      // Enhanced filtering to exclude all system keys
      if (key.name.startsWith('image_') || 
          key.name.startsWith('session_') || 
          key.name.startsWith('security_') ||
          key.name === 'test-key' ||
          key.name === 'perf-test') continue;
          
      const postData = await env.BLOG_POSTS.get(key.name);
      if (postData) {
        try {
          const parsedPost = JSON.parse(postData);
          // Verify this is actually a post (has required fields)
          if (parsedPost.title && parsedPost.content && parsedPost.slug) {
            posts.push(parsedPost);
          }
        } catch (parseError) {
          console.error(`Failed to parse post ${key.name}:`, parseError);
          // Skip malformed entries
        }
      }
    }

    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('getAllPosts error:', error);
    return [];
  }
}

export function generateSlug(title) {
  if (!title || typeof title !== 'string') {
    return '';
  }
  
  return title.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export async function handlePost(request, env, path) {
  const slug = path.replace('/post/', '');

  // Validate slug
  if (!slug || slug.includes('..') || slug.includes('/')) {
    return new Response(createErrorTemplate(request, {
      title: 'Invalid URL',
      message: 'The requested URL is not valid.'
    }), { 
      status: 400,
      headers: getBasicSecurityHeaders()
    });
  }

  try {
    const post = await env.BLOG_POSTS.get(slug);
    if (!post) {
      return new Response(createErrorTemplate(request, {
        title: 'Post Not Found',
        message: "The post you're looking for doesn't exist or may have been moved."
      }), { 
        status: 404,
        headers: getBasicSecurityHeaders()
      });
    }

    const postData = JSON.parse(post);

    // Validate post data
    if (!postData.title || !postData.content) {
      throw new Error('Invalid post data');
    }

    return new Response(createPostTemplate(request, postData), { 
      headers: getBasicSecurityHeaders()
    });
  } catch (error) {
    console.error('handlePost error:', error);
    return new Response(createErrorTemplate(request, {
      title: 'Oops! Something went wrong',
      message: "We're experiencing technical difficulties loading this post."
    }), { 
      status: 500,
      headers: getBasicSecurityHeaders()
    });
  }
}

export function getBlogHomePage(request) {
  return createHomeTemplate(request);
}
