// Default blog settings
export const DEFAULT_SETTINGS = {
  blog: {
    defaultTitle: 'My Technology Blog',
    defaultDescription: 'A cybersecurity and technology blog',
    defaultAuthor: 'Blog Author'
  },
  domains: {
    // Domain-specific overrides will be added dynamically through admin panel
  },
  theme: {
    primaryColor: '#3498db',
    accentColor: '#2c3e50'
  },
  social: {
    twitter: '',
    linkedin: '',
    github: ''
  },
  seo: {
    keywords: 'cybersecurity, technology, blog',
    ogImage: ''
  }
};

export async function getSettings(env) {
  try {
    const settings = await env.BLOG_POSTS.get('blog_settings');
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_SETTINGS,
        ...parsedSettings,
        blog: { ...DEFAULT_SETTINGS.blog, ...parsedSettings.blog },
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
    // Validate settings structure
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
  // Check for domain-specific override first
  if (settings.domains && settings.domains[hostname]?.title) {
    return settings.domains[hostname].title;
  }
  
  // Fallback to default from settings
  if (settings.blog?.defaultTitle) {
    return settings.blog.defaultTitle;
  }
  
  // Final fallback - dynamic based on hostname
  return `${hostname.charAt(0).toUpperCase() + hostname.slice(1)} Blog`;
}

export function getBlogDescriptionForDomain(settings, hostname) {
  // Check for domain-specific override first
  if (settings.domains && settings.domains[hostname]?.description) {
    return settings.domains[hostname].description;
  }
  
  // Fallback to default from settings
  if (settings.blog?.defaultDescription) {
    return settings.blog.defaultDescription;
  }
  
  // Final fallback
  return 'A technology and cybersecurity blog';
}
