export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/test-kv') {
      try {
        await env.BLOG_POSTS.put('test-key', 'test-value');
        const value = await env.BLOG_POSTS.get('test-key');
        
        return new Response(JSON.stringify({
          success: true,
          kvNamespace: 'configured',
          testRead: value
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Hello from minimal Cloudflare Workers blog!');
  }
};
