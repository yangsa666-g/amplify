import React, { useEffect, useState } from 'react';
import { Upload, Select, Button, Card, Table, Typography, Alert, Tabs, Spin, Tag, Space, message, Collapse } from 'antd';
import { InboxOutlined, FileTextOutlined, UnorderedListOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadDocument, getDocumentText } from '../api/documents';
import { runAnalysis, getRecentAnalysis } from '../api/analysis';
import { getModels } from '../api/models';
import { listFieldTemplates } from '../api/fieldTemplates';
import { listPromptTemplates } from '../api/promptTemplates';
import { useAnalysisStore } from '../stores/analysisStore';
import type { Document, AnalysisResult, AnalysisJob, FieldTemplate, PromptTemplate } from '../types';

const { Dragger } = Upload;

const LAST_FIELD_TEMPLATE_KEY = 'lastFieldTemplateId';
const LAST_PROMPT_TEMPLATE_KEY = 'lastPromptTemplateId';

function buildTemplateOptions(templates: (FieldTemplate | PromptTemplate)[]) {
  const system = templates.filter((t) => t.scope === 'system');
  const personal = templates.filter((t) => t.scope === 'personal');
  const opts = [];
  if (system.length > 0) {
    opts.push({
      label: 'System Templates',
      options: system.map((t) => ({
        label: (t as FieldTemplate).isDefault ? `${t.name} (Default)` : t.name,
        value: t.id,
      })),
    });
  }
  if (personal.length > 0) {
    opts.push({
      label: 'My Templates',
      options: personal.map((t) => ({ label: t.name, value: t.id })),
    });
  }
  return opts;
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const {
    uploadedDoc,
    selectedModel,
    selectedReasoningEffort,
    result,
    ocrPreviewOpen,
    setUploadedDoc,
    setSelectedModel,
    setSelectedReasoningEffort,
    setResult,
    setOcrPreviewOpen,
  } = useAnalysisStore();

  const [selectedFieldTemplateId, setSelectedFieldTemplateId] = useState<string | undefined>(
    () => localStorage.getItem(LAST_FIELD_TEMPLATE_KEY) ?? undefined,
  );
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState<string | undefined>(
    () => localStorage.getItem(LAST_PROMPT_TEMPLATE_KEY) ?? undefined,
  );

  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: () => getModels().then((r) => r.data) });
  const { data: fieldTemplates = [] } = useQuery({ queryKey: ['field-templates'], queryFn: () => listFieldTemplates().then((r) => r.data) });
  const { data: promptTemplates = [] } = useQuery({ queryKey: ['prompt-templates'], queryFn: () => listPromptTemplates().then((r) => r.data) });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel, setSelectedModel]);

  // Auto-select system default if last-used is no longer available
  useEffect(() => {
    if (fieldTemplates.length > 0 && selectedFieldTemplateId) {
      const exists = fieldTemplates.find((t) => t.id === selectedFieldTemplateId);
      if (!exists) {
        const defaultTemplate = fieldTemplates.find((t) => t.scope === 'system' && t.isDefault);
        setSelectedFieldTemplateId(defaultTemplate?.id);
      }
    } else if (fieldTemplates.length > 0 && !selectedFieldTemplateId) {
      const defaultTemplate = fieldTemplates.find((t) => t.scope === 'system' && t.isDefault);
      setSelectedFieldTemplateId(defaultTemplate?.id);
    }
  }, [fieldTemplates]);

  useEffect(() => {
    if (promptTemplates.length > 0 && selectedPromptTemplateId) {
      const exists = promptTemplates.find((t) => t.id === selectedPromptTemplateId);
      if (!exists) {
        const defaultTemplate = promptTemplates.find((t) => t.scope === 'system' && t.isDefault);
        setSelectedPromptTemplateId(defaultTemplate?.id);
      }
    } else if (promptTemplates.length > 0 && !selectedPromptTemplateId) {
      const defaultTemplate = promptTemplates.find((t) => t.scope === 'system' && t.isDefault);
      setSelectedPromptTemplateId(defaultTemplate?.id);
    }
  }, [promptTemplates]);

  const { data: recent = [], refetch: refetchRecent } = useQuery({ queryKey: ['analysis-recent'], queryFn: () => getRecentAnalysis().then((r) => r.data) });

  const { data: ocrText, isFetching: ocrLoading } = useQuery({
    queryKey: ['document-text', uploadedDoc?.id],
    queryFn: () => getDocumentText(uploadedDoc!.id).then((r) => r.data.text),
    enabled: !!uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && ocrPreviewOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => { setUploadedDoc(doc); setOcrPreviewOpen(false); message.success('File uploaded and text extracted'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Upload failed'),
  });

  const analysisMutation = useMutation({
    mutationFn: () =>
      runAnalysis(
        uploadedDoc!.id,
        selectedModel,
        selectedFieldTemplateId,
        selectedPromptTemplateId,
        selectedReasoningEffort,
      ).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      refetchRecent();
      // Remember last-used template IDs
      if (selectedFieldTemplateId) localStorage.setItem(LAST_FIELD_TEMPLATE_KEY, selectedFieldTemplateId);
      if (selectedPromptTemplateId) localStorage.setItem(LAST_PROMPT_TEMPLATE_KEY, selectedPromptTemplateId);
      message.success('Analysis complete');
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Analysis failed'),
  });

  const recentColumns = [
    { title: 'File', dataIndex: ['document', 'fileName'], key: 'fileName' },
    { title: 'Model', dataIndex: 'modelName', key: 'model' },
    { title: 'Reasoning Effort', dataIndex: 'reasoningEffort', key: 'reasoningEffort' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>{s}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
  ];

  const fieldColumns = [
    { title: 'Field', dataIndex: 'field', key: 'field', width: 160 },
    {
      title: 'Value',
      dataIndex: 'extracted_value',
      key: 'value',
      render: (v: any) => {
        if (v === null || v === undefined) return <Typography.Text type="secondary">Not found</Typography.Text>;
        if (typeof v === 'object') return <Typography.Text code>{JSON.stringify(v, null, 2)}</Typography.Text>;
        return String(v);
      },
    },
    { title: 'Confidence', dataIndex: 'confidence', key: 'conf', width: 100 },
  ];

  const fieldTemplateOptions = buildTemplateOptions(fieldTemplates);
  const promptTemplateOptions = buildTemplateOptions(promptTemplates);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4}>Contract Analysis</Typography.Title>

      <Card title="1. Upload Contract">
        <Dragger
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => { uploadMutation.mutate(file); return false; }}
          accept=".pdf,.docx,.txt"
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p>Click or drag file here to upload (PDF, DOCX, TXT)</p>
        </Dragger>
        {uploadMutation.isPending && <Spin style={{ marginTop: 8 }} />}
        {uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && (
          <Alert
            type="success"
            message={`Uploaded: ${uploadedDoc.fileName} | Extraction: ${uploadedDoc.textExtractionStatus}`}
            style={{ marginTop: 8 }}
          />
        )}
        {uploadedDoc && uploadedDoc.textExtractionStatus === 'failed' && (
          <Alert
            type="error"
            message={`Extraction failed for: ${uploadedDoc.fileName}`}
            description={uploadedDoc.extractionError ?? 'Unknown error — check server logs for details.'}
            style={{ marginTop: 8 }}
            showIcon
          />
        )}
      </Card>

      {uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && (
        <Collapse
          onChange={(keys) => setOcrPreviewOpen(Array.isArray(keys) ? keys.includes('ocr') : keys === 'ocr')}
          items={[{
            key: 'ocr',
            label: (
              <Space>
                <FileTextOutlined />
                OCR Preview — verify the extracted content before running analysis
              </Space>
            ),
            children: ocrLoading ? (
              <Spin />
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto', padding: '0 4px', fontSize: 13, lineHeight: 1.7 }}>
                {ocrText ? (
                  <Markdown remarkPlugins={[remarkGfm]}>{ocrText}</Markdown>
                ) : (
                  <Typography.Text type="secondary">No content available.</Typography.Text>
                )}
              </div>
            ),
          }]}
        />
      )}

      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            2. Extraction Fields Template
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Select a field template to define which fields to extract from the contract. Manage your templates in <a href="/settings">Settings</a>.
          </Typography.Text>
          <Select
            style={{ width: '100%', maxWidth: 480 }}
            placeholder="Select a field template"
            value={selectedFieldTemplateId}
            onChange={(id) => { setSelectedFieldTemplateId(id); localStorage.setItem(LAST_FIELD_TEMPLATE_KEY, id); }}
            options={fieldTemplateOptions}
            loading={fieldTemplates.length === 0}
          />
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <EditOutlined />
            3. Risk Analysis Prompt Template
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            Select a prompt template for risk analysis. Manage your templates in <a href="/settings">Settings</a>.
          </Typography.Text>
          <Select
            style={{ width: '100%', maxWidth: 480 }}
            placeholder="Select a prompt template"
            value={selectedPromptTemplateId}
            onChange={(id) => { setSelectedPromptTemplateId(id); localStorage.setItem(LAST_PROMPT_TEMPLATE_KEY, id); }}
            options={promptTemplateOptions}
            loading={promptTemplates.length === 0}
          />
        </Space>
      </Card>

      <Card title="4. Select Model & Run">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="end" wrap size={24}>
            <Space direction="vertical" size={4}>
              <Typography.Text strong>Model</Typography.Text>
              <Select
                placeholder="Select AI model"
                style={{ width: 220 }}
                value={selectedModel || undefined}
                onChange={setSelectedModel}
                options={models.map((m) => ({ label: m.label, value: m.name }))}
              />
            </Space>
            <Space direction="vertical" size={4}>
              <Space size={6}>
                <Typography.Text strong>Reasoning Effort</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>(for models that support it)</Typography.Text>
              </Space>
              <Select
                placeholder="Select reasoning effort"
                style={{ width: 210 }}
                value={selectedReasoningEffort}
                onChange={setSelectedReasoningEffort}
                options={[
                  { label: 'None', value: 'none' },
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' },
                  { label: 'XHigh', value: 'xhigh' },
                ]}
              />
            </Space>
            <Button
              type="primary"
              loading={analysisMutation.isPending}
              disabled={!uploadedDoc || !selectedModel || uploadedDoc.textExtractionStatus !== 'success'}
              onClick={() => analysisMutation.mutate()}
            >
              Run Analysis
            </Button>
          </Space>
          {analysisMutation.isError && (
            <Alert type="error" message={(analysisMutation.error as any)?.response?.data?.message || 'Analysis failed'} />
          )}
        </Space>
      </Card>

      {result && (
        <Card title="5. Results">
          <Tabs items={[
            {
              key: 'fields',
              label: 'Field Extraction',
              children: Array.isArray(result.fieldExtractionResult) ? (
                <Table
                  dataSource={result.fieldExtractionResult}
                  columns={fieldColumns}
                  rowKey={(row, idx) => row.field ?? String(idx)}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Alert type="warning" message="Field extraction result is not available or has an unexpected format." />
              ),
            },
            {
              key: 'risk',
              label: 'Risk Analysis',
              children: (
                <div style={{ maxHeight: 500, overflowY: 'auto', padding: '0 4px' }}>
                  {result.riskAnalysisResult.originalContractDescription && (
                    <>
                      <Typography.Title level={5} style={{ marginTop: 0 }}>Original Contract Description</Typography.Title>
                      <Markdown remarkPlugins={[remarkGfm]}>{result.riskAnalysisResult.originalContractDescription}</Markdown>
                      <hr style={{ margin: '16px 0', borderColor: '#f0f0f0' }} />
                    </>
                  )}
                  {result.riskAnalysisResult.riskAnalysis && (
                    <>
                      <Typography.Title level={5} style={{ marginTop: 0 }}>Risk Analysis</Typography.Title>
                      <Markdown remarkPlugins={[remarkGfm]}>{result.riskAnalysisResult.riskAnalysis}</Markdown>
                    </>
                  )}
                  {!result.riskAnalysisResult.originalContractDescription && !result.riskAnalysisResult.riskAnalysis && (
                    <Alert type="info" message="No risk analysis results available." />
                  )}
                </div>
              ),
            },
          ]} />
        </Card>
      )}

      <Card title="Recent History">
        <Table
          dataSource={recent}
          columns={recentColumns}
          rowKey="id"
          pagination={false}
          size="small"
          onRow={(record) => ({
            onClick: () => navigate(`/history?jobId=${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </Space>
  );
}

