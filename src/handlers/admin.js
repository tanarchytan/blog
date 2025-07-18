// Update the getTabContent function to include settings
function getTabContent(tab) {
  switch (tab) {
    case 'create': return getCreateTab();
    case 'edit': return getEditListTab();
    case 'settings': return getSettingsTab();  // ADD THIS LINE
    case 'debug': return getDebugTab();
    default: return getDashboardTab();
  }
}

// Update the getAdminLayout function to include settings tab
function getAdminLayout(activeTab, content) {
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'create', name: 'Create', icon: '📝' },
    { id: 'edit', name: 'Edit', icon: '✏️' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },  // ADD THIS LINE
    { id: 'debug', name: 'Debug', icon: '🔧' }
  ];

  return `
    <header style="border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
      <h1 style="color: #2c3e50; margin: 0;"><a href="/" style="color: inherit; text-decoration: none;">Blog Admin</a></h1>
      <a href="/admin/logout" style="background: #e74c3c; color: white; padding: 8px 16px; border: none; border-radius: 4px; text-decoration: none;">Logout</a>
    </header>
    <div style="display: flex; gap: 0; margin-bottom: 30px; border-bottom: 1px solid #ddd;">
      ${tabs.map(tab => `<a href="?tab=${tab.id}" style="background: ${activeTab === tab.id ? 'white' : '#f8f9fa'}; color: ${activeTab === tab.id ? '#2c3e50' : '#6c757d'}; padding: 12px 20px; border: 1px solid #ddd; border-bottom: ${activeTab === tab.id ? '2px solid #3498db' : 'none'}; text-decoration: none; display: flex; align-items: center; gap: 8px;"><span>${tab.icon}</span> ${tab.name}</a>`).join('')}
    </div>
    <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">${content}</div>
  `;
}

// Also add the import for getSettingsTab at the top of admin.js
import { 
  getDashboardTab, 
  getCreateTab, 
  getEditListTab, 
  getEditPostTab,
  getDebugTab,
  getSettingsTab  // ADD THIS LINE
} from './adminTabs.js';
