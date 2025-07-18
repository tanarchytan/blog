import { 
  isValidImageFile, 
  isValidImageRequest, 
  generateSecureFilename, 
  getContentTypeFromFilename, 
  trackImageUpload 
} from '../utils/imageUtils.js';
import { getCorsHeaders } from '../utils/security.js';

export async function handleImageUpload(request, env) {
  const corsHeaders = getCorsHeaders();
  
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!isValidImageFile(file)) {
      return new Response(JSON.stringify({
        error: 'Invalid file type or size',
        details: 'Only JPEG, PNG, WebP, and GIF files under 10MB are allowed'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 bucket not available' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const filename = generateSecureFilename(file.name);

    await env.R2_BUCKET.put(filename, file, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000'
      },
      customMetadata: {
        'uploaded-at': new Date().toISOString(),
        'original-name': file.name,
        'content-type': file.type
      }
    });

    await trackImageUpload(env, filename, file.name);

    const imageUrl = `/images/${filename}`;

    return new Response(JSON.stringify({ url: imageUrl, imageId: filename }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Upload failed', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function handleImageServing(request, env, path) {
  try {
    const filename = path.replace('/images/', '');

    if (!isValidImageRequest(filename)) {
      return new Response('Invalid image request', { status: 400 });
    }

    const object = await env.R2_BUCKET.get(filename);
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    const contentType = object.httpMetadata?.contentType ||
      object.customMetadata?.['content-type'] ||
      getContentTypeFromFilename(filename) ||
      'image/jpeg';

    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'ETag': object.etag || 'unknown',
        'Last-Modified': object.uploaded ? object.uploaded.toUTCString() : new Date().toUTCString()
      }
    });
  } catch (error) {
    return new Response('Error serving image', { status: 500 });
  }
}
