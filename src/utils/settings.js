// Default blog settings - these will be the fallbacks
export const DEFAULT_SETTINGS = {
  blog: {
    defaultTitle: 'My Technology Blog',
    defaultDescription: 'A cybersecurity and technology blog',
    defaultAuthor: 'Blog Author',
    defaultKeywords: 'cybersecurity, technology, blog'
  },
  domains: {
    // Domain-specific overrides added through admin panel
  },
  theme: {
    primaryColor: '#3498db',
    accentColor: '#2c3e50',
    backgroundColor: '#ffffff',
    textColor: '#333333'
  },
  social: {
    twitter: '',
    linkedin: '',
    github: '',
    email: ''
  },
  seo: {
    ogImage: '',
    favicon: '',
    analyticsId: ''
  }
};

export async function getSettings(env) {
  try {
    const settings = await env.BLOG_POSTS.get('blog_settings');
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      return {
        ...DEFAULT_SETTINGS,
        ...parsedSettings,
        blog: { ...DEFAULT_SETTINGS.blog, ...parsedSettings.blog },
        domains: { ...DEFAULT_SETTINGS.domains, ...parsedSettings.domains },
        theme: { ...DEFAULT_SETTINGS.theme, ...parsedSettings.theme },
        social: { ...DEFAULT_SETTINGS.social, ...parsedSettings.social },
        seo: { ...DEFAULT_SETTINGS.seo, ...parsedSettings.seo }
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(env, settings) {
  try {
    const validatedSettings = {
      blog: settings.blog || DEFAULT_SETTINGS.blog,
      domains: settings.domains || {},
      theme: settings.theme || DEFAULT_SETTINGS.theme,
      social: settings.social || DEFAULT_SETTINGS.social,
      seo: settings.seo || DEFAULT_SETTINGS.seo
    };
    
    await env.BLOG_POSTS.put('blog_settings', JSON.stringify(validatedSettings));
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, error: error.message };
  }
}

export function getBlogTitleForDomain(settings, hostname) {
  if (settings.domains?.[hostname]?.title) {
    return settings.domains[hostname].title;
  }
  return settings.blog?.defaultTitle || `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} Blog`;
}

export function getBlogDescriptionForDomain(settings, hostname) {
  if (settings.domains?.[hostname]?.description) {
    return settings.domains[hostname].description;
  }
  return settings.blog?.defaultDescription || 'A technology and cybersecurity blog';
}

export function getBlogAuthorForDomain(settings, hostname) {
  if (settings.domains?.[hostname]?.author) {
    return settings.domains[hostname].author;
  }
  return settings.blog?.defaultAuthor || 'Blog Author';
}
