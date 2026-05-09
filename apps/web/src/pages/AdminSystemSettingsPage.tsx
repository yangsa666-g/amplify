import React from 'react';
import { Typography, Tabs } from 'antd';
import FieldTemplateEditor from '../components/FieldTemplateEditor';
import PromptEditor from '../components/PromptEditor';
import {
  getAdminDefaultFieldTemplate,
  updateAdminDefaultFieldTemplate,
} from '../api/fieldTemplates';
import {
  getAdminDefaultPromptTemplate,
  updateAdminDefaultPromptTemplate,
} from '../api/promptTemplates';

export default function AdminSystemSettingsPage() {
  const tabItems = [
    {
      key: 'admin-fields',
      label: 'System Default Fields',
      children: (
        <FieldTemplateEditor
          queryKey={['admin-field-template']}
          fetchFn={getAdminDefaultFieldTemplate}
          saveFn={updateAdminDefaultFieldTemplate}
        />
      ),
    },
    {
      key: 'admin-prompt',
      label: 'System Default Prompt',
      children: (
        <PromptEditor
          queryKey={['admin-prompt-template']}
          fetchFn={getAdminDefaultPromptTemplate}
          saveFn={updateAdminDefaultPromptTemplate}
        />
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>System Settings</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        These settings apply as defaults for all users who have not set their own templates.
      </Typography.Text>
      <Tabs items={tabItems} />
    </div>
  );
}
