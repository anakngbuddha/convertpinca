import huaweiCloudMapping from './huawei-cloud/mapping.js';

// Registry of all available templates
const templates = {
  'huawei-cloud': huaweiCloudMapping,
};

export function getTemplate(templateId) {
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Template "${templateId}" not found. Available: ${Object.keys(templates).join(', ')}`);
  }
  return template;
}

export function listTemplates() {
  return Object.values(templates).map(({ id, name, description }) => ({ id, name, description }));
}

export default templates;
