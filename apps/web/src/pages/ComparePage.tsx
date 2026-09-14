import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Grid,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  theme,
} from 'antd';
import { DeleteOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadDocument } from '../api/documents';
import { getRecentCompare, runCompare } from '../api/compare';
import { getModels } from '../api/models';
import { listPromptTemplates } from '../api/promptTemplates';
import UploadProgress from '../components/UploadProgress';
import AnalysisProgress from '../components/AnalysisProgress';
import RunTimings from '../components/RunTimings';
import TokenUsageSummary from '../components/TokenUsageSummary';
import { ModelOptionLabel } from '../components/ModelProviderIcon';
import { formatDuration } from '../utils/duration';
import { formatDateTime } from '../utils/format';
import { message } from '../utils/message';
import { effortLabel, statusLabel } from '../utils/labels';
import { templateDisplayName } from '../utils/templateLabels';
import { useCompareStore } from '../stores/compareStore';
import { useAuthStore } from '../stores/authStore';
import type { ApiError, Model, PromptTemplate, ReasoningEffort } from '../types';

const { Dragger } = Upload;
const LAST_COMPARE_PROMPT_KEY = 'lastComparePromptTemplateId';
const ALL_EFFORTS: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh'];

function templateOptions(templates: PromptTemplate[], t: ReturnType<typeof useTranslation>['t']) {
  return [
    {
      label: t('analysis.systemTemplates'),
      options: templates
        .filter((template) => template.scope === 'system')
        .map((template) => ({
          value: template.id,
          label: template.isDefault
            ? t('analysis.defaultSuffix', { name: templateDisplayName(t, template.name) })
            : templateDisplayName(t, template.name),
        })),
    },
    {
      label: t('analysis.myTemplates'),
      options: templates
        .filter((template) => template.scope === 'personal')
        .map((template) => ({ value: template.id, label: templateDisplayName(t, template.name) })),
    },
  ].filter((group) => group.options.length > 0);
}

export default function ComparePage() {
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { selectedOrganizationId } = useAuthStore();
  const {
    documents,
    selectedModel,
    selectedReasoningEffort,
    result,
    setDocument,
    addDocumentSlot,
    removeDocumentSlot,
    setSelectedModel,
    setSelectedReasoningEffort,
    setResult,
    resetForOrganizationChange,
  } = useCompareStore();
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState<string | undefined>(
    () => localStorage.getItem(LAST_COMPARE_PROMPT_KEY) ?? undefined,
  );

  const { data: models = [] } = useQuery({
    queryKey: ['models', selectedOrganizationId],
    queryFn: () => getModels().then((response) => response.data),
  });
  const { data: promptTemplates = [], isLoading: promptsLoading } = useQuery({
    queryKey: ['prompt-templates', 'contract_comparison', selectedOrganizationId],
    queryFn: () => listPromptTemplates('contract_comparison').then((response) => response.data),
  });
  const { data: recent = [], refetch: refetchRecent } = useQuery({
    queryKey: ['compare-recent', selectedOrganizationId],
    queryFn: () => getRecentCompare().then((response) => response.data),
  });

  const selectedModelInfo = useMemo(
    () => models.find((model) => model.name === selectedModel),
    [models, selectedModel],
  );
  const efforts = selectedModelInfo?.reasoningEfforts?.length
    ? selectedModelInfo.reasoningEfforts
    : ALL_EFFORTS;

  useEffect(() => {
    resetForOrganizationChange();
  }, [selectedOrganizationId, resetForOrganizationChange]);

  useEffect(() => {
    if (models.length && !models.some((model) => model.name === selectedModel)) {
      setSelectedModel(models.find((model) => model.isDefault)?.name ?? models[0].name);
    }
  }, [models, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (!selectedModelInfo) return;
    if (!efforts.includes(selectedReasoningEffort)) {
      setSelectedReasoningEffort(selectedModelInfo.defaultReasoningEffort ?? efforts[0]);
    }
  }, [efforts, selectedModelInfo, selectedReasoningEffort, setSelectedReasoningEffort]);

  useEffect(() => {
    if (!promptTemplates.length) return;
    if (!promptTemplates.some((template) => template.id === selectedPromptTemplateId)) {
      setSelectedPromptTemplateId(
        promptTemplates.find((template) => template.scope === 'system' && template.isDefault)?.id ??
          promptTemplates[0].id,
      );
    }
  }, [promptTemplates, selectedPromptTemplateId]);

  const uploadMutation = useMutation({
    mutationFn: ({ file }: { index: number; file: File }) =>
      uploadDocument(file).then((response) => response.data),
    onSuccess: (document, { index }) => {
      setDocument(index, document);
      message.success(t('compare.uploaded', { file: document.fileName }));
    },
    onError: (error: ApiError) =>
      message.error(error.response?.data?.message || t('compare.uploadFailed')),
  });

  const compareMutation = useMutation({
    mutationFn: () =>
      runCompare(
        documents.map((document) => document!.id),
        selectedModel,
        selectedPromptTemplateId,
        selectedReasoningEffort,
      ).then((response) => response.data),
    onSuccess: (data) => {
      setResult(data);
      refetchRecent();
      if (selectedPromptTemplateId) {
        localStorage.setItem(LAST_COMPARE_PROMPT_KEY, selectedPromptTemplateId);
      }
      message.success(t('compare.comparisonComplete'));
    },
    onError: (error: ApiError) =>
      message.error(error.response?.data?.message || t('compare.comparisonFailed')),
  });

  const allDocumentsReady = documents.every(
    (document) => document?.textExtractionStatus === 'success',
  );
  const disabledReason = !allDocumentsReady
    ? t('compare.compareDisabledDocuments')
    : !selectedPromptTemplateId
      ? t('compare.compareDisabledPrompt')
      : !selectedModel
        ? t('analysis.runDisabledModel')
        : undefined;

  const recentColumns = [
    {
      title: t('compare.documents'),
      key: 'documents',
      render: (_: unknown, job: (typeof recent)[number]) =>
        job.documents.map((item) => item.document.fileName).join(', '),
    },
    { title: t('analysis.columns.model'), dataIndex: 'modelName', key: 'model' },
    {
      title: t('analysis.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag>{statusLabel(t, status)}</Tag>,
    },
    {
      title: t('analysis.columns.created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date, i18n.language),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4}>{t('compare.title')}</Typography.Title>

      <Card title={t('compare.step1')} className="compare-upload-card">
        <div className="compare-upload-grid">
          {documents.map((document, index) => (
            <div
              className="compare-upload-panel"
              key={index}
              style={{ border: `1px solid ${token.colorBorderSecondary}` }}
            >
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text strong>
                  {t('compare.documentNumber', { number: index + 1 })}
                </Typography.Text>
                {(document || documents.length > 2) && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      documents.length > 2 ? removeDocumentSlot(index) : setDocument(index, null)
                    }
                  />
                )}
              </Space>
              <Dragger
                className="compare-upload-dragger"
                multiple={false}
                showUploadList={false}
                disabled={uploadMutation.isPending}
                beforeUpload={(file) => {
                  uploadMutation.mutate({ index, file });
                  return false;
                }}
                accept=".pdf,.docx,.xlsx,.txt"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p>{document ? t('compare.replaceDocument') : t('compare.uploadDocument')}</p>
              </Dragger>
              {uploadMutation.isPending && uploadMutation.variables?.index === index && (
                <UploadProgress running />
              )}
              {document &&
                !(uploadMutation.isPending && uploadMutation.variables?.index === index) && (
                  <Alert
                    showIcon
                    style={{ marginTop: 8 }}
                    type={document.textExtractionStatus === 'success' ? 'success' : 'error'}
                    message={document.fileName}
                    description={
                      document.extractionMs != null
                        ? t('compare.ocrTook', { time: formatDuration(document.extractionMs) })
                        : document.extractionError
                    }
                  />
                )}
            </div>
          ))}
        </div>
        {documents.length < 5 && (
          <Button icon={<PlusOutlined />} onClick={addDocumentSlot} style={{ marginTop: 12 }}>
            {t('compare.addDocument')}
          </Button>
        )}
      </Card>

      <Card title={t('compare.step2')}>
        <Typography.Text type="secondary">
          {t('compare.promptHint')}{' '}
          <Trans i18nKey="analysis.manageInSettings" components={{ 1: <Link to="/settings" /> }} />
        </Typography.Text>
        <Select
          style={{ display: 'block', maxWidth: 480, marginTop: 12 }}
          loading={promptsLoading}
          value={selectedPromptTemplateId}
          options={templateOptions(promptTemplates, t)}
          onChange={(id) => {
            setSelectedPromptTemplateId(id);
            setResult(null);
          }}
          placeholder={t('analysis.selectPromptTemplate')}
          disabled={promptsLoading}
        />
      </Card>

      <Card title={t('compare.step3')}>
        <Space
          direction={isMobile ? 'vertical' : 'horizontal'}
          align={isMobile ? 'start' : 'end'}
          wrap
        >
          <Space direction="vertical" size={4}>
            <Typography.Text strong>{t('analysis.model')}</Typography.Text>
            <Select
              style={{ width: isMobile ? '100%' : 240 }}
              value={selectedModel || undefined}
              onChange={setSelectedModel}
              disabled={compareMutation.isPending}
              options={models.map((model: Model) => ({
                value: model.name,
                label: <ModelOptionLabel model={model} />,
              }))}
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text strong>{t('effort.label')}</Typography.Text>
            <Select
              style={{ width: isMobile ? '100%' : 210 }}
              value={selectedReasoningEffort}
              onChange={setSelectedReasoningEffort}
              disabled={compareMutation.isPending || selectedModelInfo?.supportsReasoning === false}
              options={efforts.map((effort) => ({ value: effort, label: effortLabel(t, effort) }))}
            />
          </Space>
          <Tooltip title={disabledReason}>
            <span>
              <Button
                type="primary"
                disabled={!!disabledReason}
                loading={compareMutation.isPending}
                onClick={() => compareMutation.mutate()}
              >
                {t('compare.compare')}
              </Button>
            </span>
          </Tooltip>
        </Space>
        <AnalysisProgress running={compareMutation.isPending} />
      </Card>

      {result && (
        <Card title={t('compare.step4')}>
          <Typography.Text copyable code>
            {result.compareJobId}
          </Typography.Text>
          <div style={{ marginTop: 12 }}>
            <RunTimings timings={result.timings} />
          </div>
          <div style={{ marginTop: 12 }}>
            <TokenUsageSummary usage={result.tokenUsage} />
          </div>
          <div
            className="always-scroll"
            style={{ maxHeight: 640, overflow: 'auto', marginTop: 16 }}
          >
            <Markdown remarkPlugins={[remarkGfm]}>{result.analysisResult}</Markdown>
          </div>
        </Card>
      )}

      <Card title={t('compare.recentHistory')}>
        <Table
          dataSource={recent}
          columns={recentColumns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          onRow={(job) => ({
            onClick: () => navigate(`/history?compareId=${job.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>
    </Space>
  );
}
