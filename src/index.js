/*  Cloudflare Workers blog
    – KV for posts
    – private R2 for files
    – Images Free for transforms
    – hidden admin at /verysecretadminpanel
*/
export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/'))            return handleAPI(request, env, path);
    if (path.startsWith('/images/'))         return serveImage(request, env, path);
    if (path.startsWith('/post/'))           return servePost(request, env, path);
    if (path === '/verysecretadminpanel')    return new Response(adminPage(), h.html);
    if (path === '/' || path === '')         return new Response(homePage(), h.html);

    return new Response('Not found', { status: 404 });
  }
};

/* ---------- helpers ---------- */
const h = {
  html: { 'Content-Type': 'text/html' },
  json: { 'Content-Type': 'application/json' },
  cors: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
};

/* ---------- API router ---------- */
async function handleAPI(req, env, path) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: h.cors });

  if (path === '/api/posts' && req.method === 'GET')
    return new Response(JSON.stringify(await allPosts(env)), { headers: { ...h.json, ...h.cors } });

  if (path === '/api/posts' && req.method === 'POST')
    return createPost(req, env);

  if (path === '/api/upload' && req.method === 'POST')
    return uploadImage(req, env);

  if (path === '/api/test' && req.method === 'GET')
    return systemTest(env);

  return new Response('No endpoint', { status: 404 });
}

/* ---------- blog posts ---------- */
async function allPosts(env) {
  const list  = await env.BLOG_POSTS.list();
  const posts = [];
  for (const k of list.keys) if (!k.name.startsWith('image_'))
    posts.push(JSON.parse(await env.BLOG_POSTS.get(k.name)));
  return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createPost(req, env) {
  try {
    const { title, content } = await req.json();
    const slug = slugify(title);
    const data = { id: Date.now(), title, content, slug,
                   createdAt: new Date().toISOString() };
    await env.BLOG_POSTS.put(slug, JSON.stringify(data));
    return new Response(JSON.stringify({ success: true, slug }),
                        { headers: { ...h.json, ...h.cors } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }),
                        { status: 500, headers: { ...h.json, ...h.cors } });
  }
}

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ---------- R2 upload ---------- */
async function uploadImage(req, env) {
  const fd   = await req.formData();
  const file = fd.get('image');
  if (!file) return new Response(JSON.stringify({ error: 'no file' }), { status: 400, headers: h.json });

  const okTypes = ['image/jpeg','image/png','image/webp','image/gif'];
  if (!okTypes.includes(file.type) || file.size > 10*1024*1024)
    return new Response(JSON.stringify({ error: 'invalid file' }), { status: 400, headers: h.json });

  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${file.name.slice(file.name.lastIndexOf('.'))}`;
  await env.R2_BUCKET.put(name, file, { customMetadata:{ 'ori':file.name,'ct':file.type } });
  await env.BLOG_POSTS.put(`image_${name}`, JSON.stringify({ stored:name, time:Date.now() }));

  return new Response(JSON.stringify({ url:`/images/${name}` }), { headers: h.json });
}

/* ---------- image serving & transform ---------- */
async function serveImage(req, env, path) {
  const file = path.replace('/images/','');
  if (file.includes('..') || !/^[\w\-\.]+$/.test(file)) return new Response('bad name', { status:400 });

  const obj = await env.R2_BUCKET.get(file);
  if (!obj) return new Response('not found', { status:404 });

  const url = new URL(req.url);
  const p   = [];
  ['width','height','quality','format'].forEach(k=>{ const v=url.searchParams.get(k); if(v)p.push(`${k}=${v}`); });

  if (p.length) { // ask Images Free to transform
    url.pathname = `/cdn-cgi/image/${p.join(',')}${url.pathname}`;
    return Response.redirect(url,302);
  }

  return new Response(obj.body, {
    headers:{
      'Content-Type': obj.customMetadata?.ct || 'image/jpeg',
      'Cache-Control':'public,max-age=31536000',
      'ETag':obj.etag
    }
  });
}

/* ---------- system test ---------- */
async function systemTest(env) {
  const kvOK = !!env.BLOG_POSTS;
  const r2OK = !!env.R2_BUCKET;
  return new Response(JSON.stringify({
    kv: kvOK, r2: r2OK,
    acct: !!env.CLOUDFLARE_ACCOUNT_ID,
    token: !!env.CLOUDFLARE_IMAGES_TOKEN
  }), { headers:{ ...h.json, ...h.cors }});
}

/* ---------- post & pages ---------- */
async function servePost(req, env, path) {
  const slug = path.replace('/post/','');
  const raw  = await env.BLOG_POSTS.get(slug);
  if (!raw)  return new Response('missing', { status:404 });

  const p = JSON.parse(raw);
  return new Response(`<!doctype html><h1>${p.title}</h1><p>${p.content}</p>`, h.html);
}

function homePage() {
  return `<!doctype html>
  <h1>My Blog</h1>
  <div id="posts">Loading...</div>
  <script>
    fetch('/api/posts').then(r=>r.json()).then(ps=>{
      document.getElementById('posts').innerHTML = ps.map(p=>\`<article>
        <h2><a href="/post/\${p.slug}">\${p.title}</a></h2>
        <small>\${new Date(p.createdAt).toLocaleDateString()}</small>
      </article>\`).join('') || 'No posts yet.';
    });
  </script>`;
}

function adminPage() {
  return `<!doctype html>
  <h1>Admin</h1>
  <form id="f"><input name=title placeholder="title"><br>
  <textarea name=content placeholder="html"></textarea><br>
  <input type=file name=image><button>upload img</button><br>
  <button type=submit>publish</button></form>
  <pre id=o></pre>
  <script>
  f.onsubmit=async e=>{
    e.preventDefault();
    const d=new FormData(f);
    const j={title:d.get('title'),content:d.get('content')};
    const r=await fetch('/api/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(j)});
    o.textContent=await r.text();
  };
  </script>`;
}
