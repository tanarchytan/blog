import { getSettings, getBlogTitleForDomain, getBlogDescriptionForDomain } from './settings.js';

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
    domain: isDevelopment ? undefined : hostname
  };
}

/**
 * Generate blog title based on settings and domain - fully dynamic
 */
export async function getBlogTitle(request, env) {
  const { hostname } = getDomainInfo(request);
  
  try {
    const settings = await getSettings(env);
    return getBlogTitleForDomain(settings, hostname);
  } catch (error) {
    console.error('Error getting blog title:', error);
    // Dynamic fallback based on hostname instead of hardcoded
    return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} Blog`;
  }
}

/**
 * Generate blog description based on settings and domain
 */
export async function getBlogDescription(request, env) {
  const { hostname } = getDomainInfo(request);
  
  try {
    const settings = await getSettings(env);
    return getBlogDescriptionForDomain(settings, hostname);
  } catch (error) {
    console.error('Error getting blog description:', error);
    return 'A technology and cybersecurity blog'; // Generic fallback
  }
}

/**
 * Synchronous version for cases where env is not available
 */
export function getBlogTitleSync(hostname) {
  return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} Blog`;
}
