import React from 'react';
import { Tabs, Typography, Badge } from 'antd';
import { useAuthStore } from '../stores/authStore';
import FieldTemplateEditor from '../components/FieldTemplateEditor';
import PromptEditor from '../components/PromptEditor';
import {
  getCurrentFieldTemplate,
  saveFieldTemplate,
  resetFieldTemplate,
  getAdminDefaultFieldTemplate,
  updateAdminDefaultFieldTemplate,
} from '../api/fieldTemplates';
import {
  getCurrentPromptTemplate,
  savePromptTemplate,
  resetPromptTemplate,
  getAdminDefaultPromptTemplate,
  updateAdminDefaultPromptTemplate,
} from '../api/promptTemplates';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const tabItems = [
    {
      key: 'fields',
      label: 'My Field Template',
      children: (
        <FieldTemplateEditor
          queryKey={['field-template']}
          fetchFn={getCurrentFieldTemplate}
          saveFn={saveFieldTemplate}
          resetFn={resetFieldTemplate}
        />
      ),
    },
    {
      key: 'prompt',
      label: 'My Risk Prompt',
      children: (
        <PromptEditor
          queryKey={['prompt-template']}
          fetchFn={getCurrentPromptTemplate}
          saveFn={savePromptTemplate}
          resetFn={resetPromptTemplate}
        />
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'admin-fields',
            label: (
              <span>
                System Default Fields&nbsp;
                <Badge count="Admin" color="volcano" style={{ fontSize: 10 }} />
              </span>
            ),
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
            label: (
              <span>
                System Default Prompt&nbsp;
                <Badge count="Admin" color="volcano" style={{ fontSize: 10 }} />
              </span>
            ),
            children: (
              <PromptEditor
                queryKey={['admin-prompt-template']}
                fetchFn={getAdminDefaultPromptTemplate}
                saveFn={updateAdminDefaultPromptTemplate}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Typography.Title level={4}>Settings</Typography.Title>
      <Tabs items={tabItems} />
    </div>
  );
}
