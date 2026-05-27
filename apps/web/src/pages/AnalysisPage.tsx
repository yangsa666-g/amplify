import React, { useEffect, useState } from 'react';
import {
  Upload,
  Select,
  Button,
  Card,
  Table,
  Typography,
  Alert,
  Tabs,
  Spin,
  Tag,
  Space,
  Collapse,
  theme,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import type { TFunction } from 'i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadDocument, getDocumentText } from '../api/documents';
import { runAnalysis, getRecentAnalysis } from '../api/analysis';
import { getModels } from '../api/models';
import { listFieldTemplates } from '../api/fieldTemplates';
import { listPromptTemplates } from '../api/promptTemplates';
import { useAnalysisStore } from '../stores/analysisStore';
import AnalysisProgress from '../components/AnalysisProgress';
import { message } from '../utils/message';
import { statusLabel, effortLabel } from '../utils/labels';
import type { FieldTemplate, PromptTemplate, ApiError } from '../types';

const { Dragger } = Upload;

const LAST_FIELD_TEMPLATE_KEY = 'lastFieldTemplateId';
const LAST_PROMPT_TEMPLATE_KEY = 'lastPromptTemplateId';

function buildTemplateOptions(templates: (FieldTemplate | PromptTemplate)[], t: TFunction) {
  const system = templates.filter((t) => t.scope === 'system');
  const personal = templates.filter((t) => t.scope === 'personal');
  const opts = [];
  if (system.length > 0) {
    opts.push({
      label: t('analysis.systemTemplates'),
      options: system.map((tmpl) => ({
        label: (tmpl as FieldTemplate).isDefault
          ? t('analysis.defaultSuffix', { name: tmpl.name })
          : tmpl.name,
        value: tmpl.id,
      })),
    });
  }
  if (personal.length > 0) {
    opts.push({
      label: t('analysis.myTemplates'),
      options: personal.map((tmpl) => ({ label: tmpl.name, value: tmpl.id })),
    });
  }
  return opts;
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { token } = theme.useToken();
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

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: () => getModels().then((r) => r.data),
  });
  const { data: fieldTemplates = [] } = useQuery({
    queryKey: ['field-templates'],
    queryFn: () => listFieldTemplates().then((r) => r.data),
  });
  const { data: promptTemplates = [] } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: () => listPromptTemplates().then((r) => r.data),
  });

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

  const { data: recent = [], refetch: refetchRecent } = useQuery({
    queryKey: ['analysis-recent'],
    queryFn: () => getRecentAnalysis().then((r) => r.data),
  });

  const { data: ocrText, isFetching: ocrLoading } = useQuery({
    queryKey: ['document-text', uploadedDoc?.id],
    queryFn: () => getDocumentText(uploadedDoc!.id).then((r) => r.data.text),
    enabled: !!uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && ocrPreviewOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => {
      setUploadedDoc(doc);
      setOcrPreviewOpen(false);
      message.success(t('analysis.fileUploaded'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('analysis.uploadFailed')),
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
      if (selectedFieldTemplateId)
        localStorage.setItem(LAST_FIELD_TEMPLATE_KEY, selectedFieldTemplateId);
      if (selectedPromptTemplateId)
        localStorage.setItem(LAST_PROMPT_TEMPLATE_KEY, selectedPromptTemplateId);
      message.success(t('analysis.analysisComplete'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('analysis.analysisFailed')),
  });

  const recentColumns = [
    { title: t('analysis.columns.file'), dataIndex: ['document', 'fileName'], key: 'fileName' },
    { title: t('analysis.columns.model'), dataIndex: 'modelName', key: 'model' },
    {
      title: t('analysis.columns.effort'),
      dataIndex: 'reasoningEffort',
      key: 'reasoningEffort',
      render: (e: string) => effortLabel(t, e),
    },
    {
      title: t('analysis.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>
          {statusLabel(t, s)}
        </Tag>
      ),
    },
    {
      title: t('analysis.columns.created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleString(),
    },
  ];

  const fieldColumns = [
    { title: t('analysis.columns.field'), dataIndex: 'field', key: 'field', width: 160 },
    {
      title: t('analysis.columns.value'),
      dataIndex: 'extracted_value',
      key: 'value',
      render: (v: unknown) => {
        if (v === null || v === undefined)
          return (
            <Typography.Text type="secondary">{t('analysis.columns.notFound')}</Typography.Text>
          );
        if (typeof v === 'object')
          return <Typography.Text code>{JSON.stringify(v, null, 2)}</Typography.Text>;
        return String(v);
      },
    },
    { title: t('analysis.columns.confidence'), dataIndex: 'confidence', key: 'conf', width: 100 },
  ];

  const fieldTemplateOptions = buildTemplateOptions(fieldTemplates, t);
  const promptTemplateOptions = buildTemplateOptions(promptTemplates, t);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4}>{t('analysis.title')}</Typography.Title>

      <Card title={t('analysis.step1')}>
        <Dragger
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => {
            uploadMutation.mutate(file);
            return false;
          }}
          accept=".pdf,.docx,.txt"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p>{t('analysis.dragHint')}</p>
        </Dragger>
        {uploadMutation.isPending && <Spin style={{ marginTop: 8 }} />}
        {uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && (
          <Alert
            type="success"
            message={t('analysis.uploadedExtraction', {
              file: uploadedDoc.fileName,
              status: uploadedDoc.textExtractionStatus,
            })}
            style={{ marginTop: 8 }}
          />
        )}
        {uploadedDoc && uploadedDoc.textExtractionStatus === 'failed' && (
          <Alert
            type="error"
            message={t('analysis.extractionFailed', { file: uploadedDoc.fileName })}
            description={uploadedDoc.extractionError ?? t('analysis.extractionUnknownError')}
            style={{ marginTop: 8 }}
            showIcon
          />
        )}
      </Card>

      {uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && (
        <Collapse
          onChange={(keys) =>
            setOcrPreviewOpen(Array.isArray(keys) ? keys.includes('ocr') : keys === 'ocr')
          }
          items={[
            {
              key: 'ocr',
              label: (
                <Space>
                  <FileTextOutlined />
                  {t('analysis.ocrPreview')}
                </Space>
              ),
              children: ocrLoading ? (
                <Spin />
              ) : (
                <div
                  style={{
                    maxHeight: 480,
                    overflowY: 'auto',
                    padding: '0 4px',
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {ocrText ? (
                    <Markdown remarkPlugins={[remarkGfm]}>{ocrText}</Markdown>
                  ) : (
                    <Typography.Text type="secondary">{t('analysis.noContent')}</Typography.Text>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            {t('analysis.step2')}
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            {t('analysis.fieldTemplateHint')}{' '}
            <Trans i18nKey="analysis.manageInSettings" components={{ 1: <a href="/settings" /> }} />
          </Typography.Text>
          <Select
            style={{ width: '100%', maxWidth: 480 }}
            placeholder={t('analysis.selectFieldTemplate')}
            value={selectedFieldTemplateId}
            onChange={(id) => {
              setSelectedFieldTemplateId(id);
              localStorage.setItem(LAST_FIELD_TEMPLATE_KEY, id);
            }}
            options={fieldTemplateOptions}
            loading={fieldTemplates.length === 0}
          />
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <EditOutlined />
            {t('analysis.step3')}
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">
            {t('analysis.promptTemplateHint')}{' '}
            <Trans i18nKey="analysis.manageInSettings" components={{ 1: <a href="/settings" /> }} />
          </Typography.Text>
          <Select
            style={{ width: '100%', maxWidth: 480 }}
            placeholder={t('analysis.selectPromptTemplate')}
            value={selectedPromptTemplateId}
            onChange={(id) => {
              setSelectedPromptTemplateId(id);
              localStorage.setItem(LAST_PROMPT_TEMPLATE_KEY, id);
            }}
            options={promptTemplateOptions}
            loading={promptTemplates.length === 0}
          />
        </Space>
      </Card>

      <Card title={t('analysis.step4')}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="end" wrap size={24}>
            <Space direction="vertical" size={4}>
              <Typography.Text strong>{t('analysis.model')}</Typography.Text>
              <Select
                placeholder={t('analysis.selectModel')}
                style={{ width: 220 }}
                value={selectedModel || undefined}
                onChange={setSelectedModel}
                disabled={analysisMutation.isPending}
                options={models.map((m) => ({ label: m.label, value: m.name }))}
              />
            </Space>
            <Space direction="vertical" size={4}>
              <Space size={6}>
                <Typography.Text strong>{t('effort.label')}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('effort.hint')}
                </Typography.Text>
              </Space>
              <Select
                placeholder={t('analysis.selectEffort')}
                style={{ width: 210 }}
                value={selectedReasoningEffort}
                onChange={setSelectedReasoningEffort}
                disabled={analysisMutation.isPending}
                options={[
                  { label: t('effort.none'), value: 'none' },
                  { label: t('effort.low'), value: 'low' },
                  { label: t('effort.medium'), value: 'medium' },
                  { label: t('effort.high'), value: 'high' },
                  { label: t('effort.xhigh'), value: 'xhigh' },
                ]}
              />
            </Space>
            <Button
              type="primary"
              loading={analysisMutation.isPending}
              disabled={
                !uploadedDoc || !selectedModel || uploadedDoc.textExtractionStatus !== 'success'
              }
              onClick={() => analysisMutation.mutate()}
            >
              {t('analysis.runAnalysis')}
            </Button>
          </Space>
          <AnalysisProgress running={analysisMutation.isPending} />
          {analysisMutation.isError && (
            <Alert
              type="error"
              message={
                (analysisMutation.error as ApiError)?.response?.data?.message ||
                t('analysis.analysisFailed')
              }
            />
          )}
        </Space>
      </Card>

      {result && (
        <Card title={t('analysis.step5')}>
          <Tabs
            items={[
              {
                key: 'fields',
                label: t('analysis.fieldExtraction'),
                children: Array.isArray(result.fieldExtractionResult) ? (
                  <Table
                    dataSource={result.fieldExtractionResult}
                    columns={fieldColumns}
                    rowKey={(row, idx) => row.field ?? String(idx)}
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                  />
                ) : (
                  <Alert type="warning" message={t('analysis.fieldResultBadFormat')} />
                ),
              },
              {
                key: 'risk',
                label: t('analysis.riskAnalysis'),
                children: (
                  <div style={{ maxHeight: 500, overflowY: 'auto', padding: '0 4px' }}>
                    {result.riskAnalysisResult.originalContractDescription && (
                      <>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>
                          {t('analysis.originalContractDescription')}
                        </Typography.Title>
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {result.riskAnalysisResult.originalContractDescription}
                        </Markdown>
                        <hr
                          style={{
                            margin: '16px 0',
                            border: 'none',
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        />
                      </>
                    )}
                    {result.riskAnalysisResult.riskAnalysis && (
                      <>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>
                          {t('analysis.riskAnalysis')}
                        </Typography.Title>
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {result.riskAnalysisResult.riskAnalysis}
                        </Markdown>
                      </>
                    )}
                    {!result.riskAnalysisResult.originalContractDescription &&
                      !result.riskAnalysisResult.riskAnalysis && (
                        <Alert type="info" message={t('analysis.noRiskResults')} />
                      )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Card title={t('analysis.recentHistory')}>
        <Table
          dataSource={recent}
          columns={recentColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          onRow={(record) => ({
            onClick: () => navigate(`/history?jobId=${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </Space>
  );
}
