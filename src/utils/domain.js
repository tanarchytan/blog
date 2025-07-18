import { getSettings, getBlogTitleForDomain, getBlogDescriptionForDomain, getBlogAuthorForDomain } from './settings.js';

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

export function getAbsoluteUrl(request, path = '') {
  const { origin } = getDomainInfo(request);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

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

export async function getBlogTitle(request, env) {
  const { hostname } = getDomainInfo(request);
  
  try {
    const settings = await getSettings(env);
    return getBlogTitleForDomain(settings, hostname);
  } catch (error) {
    console.error('Error getting blog title:', error);
    return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} Blog`;
  }
}

export async function getBlogDescription(request, env) {
  const { hostname } = getDomainInfo(request);
  
  try {
    const settings = await getSettings(env);
    return getBlogDescriptionForDomain(settings, hostname);
  } catch (error) {
    console.error('Error getting blog description:', error);
    return 'A technology and cybersecurity blog';
  }
}

export async function getBlogAuthor(request, env) {
  const { hostname } = getDomainInfo(request);
  
  try {
    const settings = await getSettings(env);
    return getBlogAuthorForDomain(settings, hostname);
  } catch (error) {
    console.error('Error getting blog author:', error);
    return 'Blog Author';
  }
}
