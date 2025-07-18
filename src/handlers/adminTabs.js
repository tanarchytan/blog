// Add this to your adminTabs.js file

export function getSettingsTab() {
  return `
    <div class="settings-container">
      <h2>⚙️ Blog Settings</h2>
      
      <div class="settings-section">
        <h3>📝 General Settings</h3>
        <form id="general-settings" class="admin-form">
          <label for="default-title">Default Blog Title</label>
          <input type="text" id="default-title" name="defaultTitle" placeholder="My Blog" required />
          
          <label for="default-description">Default Description</label>
          <textarea id="default-description" name="defaultDescription" placeholder="A cybersecurity and technology blog" rows="3"></textarea>
          
          <label for="default-author">Default Author</label>
          <input type="text" id="default-author" name="defaultAuthor" placeholder="Blog Author" />
          
          <button type="submit" class="btn btn-primary">Save General Settings</button>
        </form>
      </div>

      <div class="settings-section">
        <h3>🌐 Domain-Specific Settings</h3>
        <div id="domain-settings">
          <div class="domain-setting">
            <input type="text" placeholder="Domain (e.g., gillot.eu)" class="domain-input" />
            <input type="text" placeholder="Custom Title" class="domain-title" />
            <input type="text" placeholder="Custom Description" class="domain-description" />
            <button type="button" class="btn btn-success add-domain">Add Domain</button>
          </div>
        </div>
        <div id="existing-domains"></div>
        <button type="button" id="save-domain-settings" class="btn btn-primary">Save Domain Settings</button>
      </div>

      <div class="settings-section">
        <h3>🎨 Theme Settings</h3>
        <form id="theme-settings" class="admin-form">
          <label for="primary-color">Primary Color</label>
          <input type="color" id="primary-color" name="primaryColor" value="#3498db" />
          
          <label for="accent-color">Accent Color</label>
          <input type="color" id="accent-color" name="accentColor" value="#2c3e50" />
          
          <button type="submit" class="btn btn-primary">Save Theme Settings</button>
        </form>
      </div>

      <div class="settings-section">
        <h3>📱 Social Media</h3>
        <form id="social-settings" class="admin-form">
          <label for="twitter">Twitter URL</label>
          <input type="url" id="twitter" name="twitter" placeholder="https://twitter.com/username" />
          
          <label for="linkedin">LinkedIn URL</label>
          <input type="url" id="linkedin" name="linkedin" placeholder="https://linkedin.com/in/username" />
          
          <label for="github">GitHub URL</label>
          <input type="url" id="github" name="github" placeholder="https://github.com/username" />
          
          <button type="submit" class="btn btn-primary">Save Social Settings</button>
        </form>
      </div>
    </div>

    <script>
      let currentSettings = {};

      // Load current settings
      async function loadSettings() {
        try {
          const response = await fetch('/api/settings');
          currentSettings = await response.json();
          populateSettings(currentSettings);
        } catch (error) {
          console.error('Error loading settings:', error);
          showStatus('Error loading settings', 'error');
        }
      }

      function populateSettings(settings) {
        // Populate general settings
        document.getElementById('default-title').value = settings.blog?.defaultTitle || '';
        document.getElementById('default-description').value = settings.blog?.defaultDescription || '';
        document.getElementById('default-author').value = settings.blog?.defaultAuthor || '';
        
        // Populate theme settings
        document.getElementById('primary-color').value = settings.theme?.primaryColor || '#3498db';
        document.getElementById('accent-color').value = settings.theme?.accentColor || '#2c3e50';
        
        // Populate social settings
        document.getElementById('twitter').value = settings.social?.twitter || '';
        document.getElementById('linkedin').value = settings.social?.linkedin || '';
        document.getElementById('github').value = settings.social?.github || '';
        
        // Populate domain settings
        populateDomainSettings(settings.domains || {});
      }

      function populateDomainSettings(domains) {
        const container = document.getElementById('existing-domains');
        container.innerHTML = '';
        
        Object.entries(domains).forEach(([domain, config]) => {
          const domainDiv = document.createElement('div');
          domainDiv.className = 'existing-domain-setting';
          domainDiv.innerHTML = \`
            <div class="domain-row">
              <span class="domain-name">\${domain}</span>
              <input type="text" value="\${config.title || ''}" class="domain-title-edit" placeholder="Custom Title" />
              <input type="text" value="\${config.description || ''}" class="domain-description-edit" placeholder="Custom Description" />
              <button type="button" class="btn btn-danger remove-domain" data-domain="\${domain}">Remove</button>
            </div>
          \`;
          container.appendChild(domainDiv);
        });
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-domain').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const domain = e.target.dataset.domain;
            delete currentSettings.domains[domain];
            populateDomainSettings(currentSettings.domains);
          });
        });
      }

      // Form handlers
      document.getElementById('general-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        currentSettings.blog = {
          defaultTitle: formData.get('defaultTitle'),
          defaultDescription: formData.get('defaultDescription'),
          defaultAuthor: formData.get('defaultAuthor')
        };
        
        await saveSettings();
      });

      document.getElementById('theme-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        currentSettings.theme = {
          primaryColor: formData.get('primaryColor'),
          accentColor: formData.get('accentColor')
        };
        
        await saveSettings();
      });

      document.getElementById('social-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        currentSettings.social = {
          twitter: formData.get('twitter'),
          linkedin: formData.get('linkedin'),
          github: formData.get('github')
        };
        
        await saveSettings();
      });

      // Domain settings handler
      document.querySelector('.add-domain').addEventListener('click', () => {
        const domain = document.querySelector('.domain-input').value.trim();
        const title = document.querySelector('.domain-title').value.trim();
        const description = document.querySelector('.domain-description').value.trim();
        
        if (domain) {
          if (!currentSettings.domains) currentSettings.domains = {};
          currentSettings.domains[domain] = { title, description };
          
          // Clear inputs
          document.querySelector('.domain-input').value = '';
          document.querySelector('.domain-title').value = '';
          document.querySelector('.domain-description').value = '';
          
          populateDomainSettings(currentSettings.domains);
        }
      });

      document.getElementById('save-domain-settings').addEventListener('click', async () => {
        // Update domain settings from current form values
        document.querySelectorAll('.existing-domain-setting').forEach(domainDiv => {
          const domainName = domainDiv.querySelector('.domain-name').textContent;
          const title = domainDiv.querySelector('.domain-title-edit').value;
          const description = domainDiv.querySelector('.domain-description-edit').value;
          
          if (currentSettings.domains[domainName]) {
            currentSettings.domains[domainName] = { title, description };
          }
        });
        
        await saveSettings();
      });

      async function saveSettings() {
        try {
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(currentSettings)
          });
          
          const result = await response.json();
          
          if (result.success) {
            showStatus('✅ Settings saved successfully!', 'success');
          } else {
            showStatus('❌ Failed to save settings: ' + result.error, 'error');
          }
        } catch (error) {
          showStatus('❌ Error saving settings: ' + error.message, 'error');
        }
      }

      // Load settings on page load
      loadSettings();
    </script>

    <style>
      .settings-container { max-width: 800px; }
      .settings-section { 
        background: #f8f9fa; 
        padding: 20px; 
        border-radius: 8px; 
        margin-bottom: 20px; 
      }
      .settings-section h3 { 
        margin-top: 0; 
        color: #2c3e50; 
        border-bottom: 2px solid #eee; 
        padding-bottom: 10px; 
      }
      .admin-form label { 
        display: block; 
        margin-bottom: 5px; 
        font-weight: bold; 
        color: #2c3e50; 
      }
      .domain-setting, .domain-row { 
        display: flex; 
        gap: 10px; 
        align-items: center; 
        margin-bottom: 10px; 
      }
      .domain-input, .domain-title, .domain-description,
      .domain-title-edit, .domain-description-edit { 
        flex: 1; 
        padding: 8px; 
        border: 1px solid #ddd; 
        border-radius: 4px; 
      }
      .domain-name { 
        font-weight: bold; 
        color: #2c3e50; 
        min-width: 120px; 
      }
      .existing-domain-setting { 
        background: white; 
        padding: 10px; 
        border-radius: 4px; 
        margin-bottom: 10px; 
      }
    </style>
  `;
}
