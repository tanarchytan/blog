// Shared template components for admin panel
export function createFormSection(title, formId, fields, buttons) {
  return `
    <section class="admin-section">
      <h2>${title}</h2>
      <form id="${formId}" class="admin-form">
        ${fields.map(field => createFormField(field)).join('')}
        <div class="form-buttons">
          ${buttons.map(btn => createButton(btn)).join('')}
        </div>
      </form>
    </section>
  `;
}

export function createFormField(field) {
  if (field.type === 'textarea') {
    return `<textarea id="${field.id}" name="${field.name}" placeholder="${field.placeholder}" rows="${field.rows || 10}" ${field.required ? 'required' : ''}>${field.value || ''}</textarea>`;
  }
  return `<input type="${field.type}" id="${field.id}" name="${field.name}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''} value="${field.value || ''}" />`;
}

export function createButton(button) {
  return `<button type="${button.type}" id="${button.id}" class="${button.class}">${button.text}</button>`;
}

export function createPreviewSection() {
  return `
    <section class="admin-section" id="preview-section" style="display: none;">
      <h2>📖 Post Preview</h2>
      <div id="preview-content"></div>
    </section>
  `;
}

export function createImageUploadSection() {
  return `
    <section class="admin-section">
      <h2>📤 Upload Image</h2>
      <input type="file" id="image-upload" accept="image/*" />
      <button id="upload-image">Upload Image</button>
    </section>
  `;
}

export function createDebugSection(title, id, content = 'Loading...') {
  return `
    <div class="debug-section">
      <h3>${title}</h3>
      <div id="${id}">${content}</div>
    </div>
  `;
}

export function createDashboardCard(title, description, buttons) {
  return `
    <div class="dashboard-card">
      <h3>${title}</h3>
      <p>${description}</p>
      ${buttons.map(btn => 
        btn.href ? 
          `<a href="${btn.href}" class="${btn.class}">${btn.text}</a>` :
          `<button id="${btn.id}" class="${btn.class}">${btn.text}</button>`
      ).join('')}
    </div>
  `;
}
