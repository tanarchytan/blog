export function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    const value = rest.join('=');
    if (name && value !== undefined) {
      cookies[name] = value;
    }
  });
  return cookies;
}
