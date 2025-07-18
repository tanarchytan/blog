/**
 * Extract domain information from request
 */
export function getDomainInfo(request) {
  const url = new URL(request.url);
  
  return {
    hostname: url.hostname,
    protocol: url.protocol,
    origin: url.origin,
    isSecure: url.protocol === 'https:',
    isDevelopment: url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1') || url.hostname.includes('.workers.dev')
  };
}

/**
 * Generate absolute URL for the current domain
 */
export function getAbsoluteUrl(request, path = '') {
  const { origin } = getDomainInfo(request);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

/**
 * Generate domain-appropriate cookie settings
 */
export function getCookieSettings(request) {
  const { hostname, isSecure, isDevelopment } = getDomainInfo(request);
  
  return {
    secure: isSecure && !isDevelopment,
    sameSite: 'Strict',
    httpOnly: true,
    path: '/',
    // Don't set domain for localhost/development
    domain: isDevelopment ? undefined : hostname
  };
}

/**
 * Generate blog title based on domain
 */
export function getBlogTitle(request) {
  const { hostname } = getDomainInfo(request);
  
  // You can customize this based on your domains
  const domainTitles = {
    'gillot.eu': 'Gillot Security Blog',
    'localhost': 'My Blog (Dev)',
    // Add more domains as needed
  };
  
  return domainTitles[hostname] || `${hostname} Blog`;
}
