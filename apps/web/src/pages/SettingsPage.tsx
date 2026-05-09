import React from 'react';
import { Tabs, Typography } from 'antd';
import FieldTemplateEditor from '../components/FieldTemplateEditor';
import PromptEditor from '../components/PromptEditor';
import {
  getCurrentFieldTemplate,
  saveFieldTemplate,
  resetFieldTemplate,
} from '../api/fieldTemplates';
import {
  getCurrentPromptTemplate,
  savePromptTemplate,
  resetPromptTemplate,
} from '../api/promptTemplates';

export default function SettingsPage() {
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
  ];

  return (
    <div>
      <Typography.Title level={4}>Settings</Typography.Title>
      <Tabs items={tabItems} />
    </div>
  );
}
