import React, { useEffect, useMemo, useState } from 'react';
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
  Grid,
  Tooltip,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
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
import UploadProgress from '../components/UploadProgress';
import RunTimings from '../components/RunTimings';
import TokenUsageSummary from '../components/TokenUsageSummary';
import { formatDuration } from '../utils/duration';
import { formatDateTime } from '../utils/format';
import { message } from '../utils/message';
import { statusLabel, effortLabel } from '../utils/labels';
import { templateDisplayName } from '../utils/templateLabels';
import type { FieldTemplate, PromptTemplate, ApiError, Model, ReasoningEffort } from '../types';

const { Dragger } = Upload;

const LAST_FIELD_TEMPLATE_KEY = 'lastFieldTemplateId';
const LAST_PROMPT_TEMPLATE_KEY = 'lastPromptTemplateId';
const ALL_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh'];

// Let long cell values wrap onto multiple lines (and preserve newlines in JSON
// values) instead of forcing the column to grow wide on a single line.
const wrapCellStyle: React.CSSProperties = { whiteSpace: 'pre-wrap', wordBreak: 'break-word' };

function buildTemplateOptions(templates: (FieldTemplate | PromptTemplate)[], t: TFunction) {
  const system = templates.filter((t) => t.scope === 'system');
  const personal = templates.filter((t) => t.scope === 'personal');
  const opts = [];
  if (system.length > 0) {
    opts.push({
      label: t('analysis.systemTemplates'),
      options: system.map((tmpl) => ({
        label: (tmpl as FieldTemplate).isDefault
          ? t('analysis.defaultSuffix', { name: templateDisplayName(t, tmpl.name) })
          : templateDisplayName(t, tmpl.name),
        value: tmpl.id,
      })),
    });
  }
  if (personal.length > 0) {
    opts.push({
      label: t('analysis.myTemplates'),
      options: personal.map((tmpl) => ({
        label: templateDisplayName(t, tmpl.name),
        value: tmpl.id,
      })),
    });
  }
  return opts;
}

const OPENAI_ICON_PATH =
  'M239.184 106.203a64.72 64.72 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.72 64.72 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.67 64.67 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.77 64.77 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483m-97.56 136.338a48.4 48.4 0 0 1-31.105-11.255l1.535-.87l51.67-29.825a8.6 8.6 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601M37.158 197.93a48.35 48.35 0 0 1-5.781-32.589l1.534.921l51.722 29.826a8.34 8.34 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803M23.549 85.38a48.5 48.5 0 0 1 25.58-21.333v61.39a8.29 8.29 0 0 0 4.195 7.316l62.874 36.272l-21.845 12.636a.82.82 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405zm179.466 41.695l-63.08-36.63L161.73 77.86a.82.82 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.54 8.54 0 0 0-4.4-7.213m21.742-32.69l-1.535-.922l-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.72.72 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391zM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87l-51.67 29.825a8.6 8.6 0 0 0-4.246 7.367zm11.868-25.58L128.067 97.3l28.188 16.218v32.434l-28.086 16.218l-28.188-16.218z';

const CLAUDE_ICON_PATH =
  'm50.228 170.321l50.357-28.257l.843-2.463l-.843-1.361h-2.462l-8.426-.518l-28.775-.778l-24.952-1.037l-24.175-1.296l-6.092-1.297L0 125.796l.583-3.759l5.12-3.434l7.324.648l16.202 1.101l24.304 1.685l17.629 1.037l26.118 2.722h4.148l.583-1.685l-1.426-1.037l-1.101-1.037l-25.147-17.045l-27.22-18.017l-14.258-10.37l-7.713-5.25l-3.888-4.925l-1.685-10.758l7-7.713l9.397.649l2.398.648l9.527 7.323l20.35 15.75L94.817 91.9l3.889 3.24l1.555-1.102l.195-.777l-1.75-2.917l-14.453-26.118l-15.425-26.572l-6.87-11.018l-1.814-6.61c-.648-2.723-1.102-4.991-1.102-7.778l7.972-10.823L71.42 0l10.63 1.426l4.472 3.888l6.61 15.101l10.694 23.786l16.591 32.34l4.861 9.592l2.592 8.879l.973 2.722h1.685v-1.556l1.36-18.211l2.528-22.36l2.463-28.776l.843-8.1l4.018-9.722l7.971-5.25l6.222 2.981l5.12 7.324l-.713 4.73l-3.046 19.768l-5.962 30.98l-3.889 20.739h2.268l2.593-2.593l10.499-13.934l17.628-22.036l7.778-8.749l9.073-9.657l5.833-4.601h11.018l8.1 12.055l-3.628 12.443l-11.342 14.388l-9.398 12.184l-13.48 18.147l-8.426 14.518l.778 1.166l2.01-.194l30.46-6.481l16.462-2.982l19.637-3.37l8.88 4.148l.971 4.213l-3.5 8.62l-20.998 5.184l-24.628 4.926l-36.682 8.685l-.454.324l.519.648l16.526 1.555l7.065.389h17.304l32.21 2.398l8.426 5.574l5.055 6.805l-.843 5.184l-12.962 6.611l-17.498-4.148l-40.83-9.721l-14-3.5h-1.944v1.167l11.666 11.406l21.387 19.314l26.767 24.887l1.36 6.157l-3.434 4.86l-3.63-.518l-23.526-17.693l-9.073-7.972l-20.545-17.304h-1.36v1.814l4.73 6.935l25.017 37.59l1.296 11.536l-1.814 3.76l-6.481 2.268l-7.13-1.297l-14.647-20.544l-15.1-23.138l-12.185-20.739l-1.49.843l-7.194 77.448l-3.37 3.953l-7.778 2.981l-6.48-4.925l-3.436-7.972l3.435-15.749l4.148-20.544l3.37-16.333l3.046-20.285l1.815-6.74l-.13-.454l-1.49.194l-15.295 20.999l-23.267 31.433l-18.406 19.702l-4.407 1.75l-7.648-3.954l.713-7.064l4.277-6.286l25.47-32.405l15.36-20.092l9.917-11.6l-.065-1.686h-.583L44.07 198.125l-12.055 1.555l-5.185-4.86l.648-7.972l2.463-2.593l20.35-13.999z';

function resolveModelIcon(model: Model): Model['icon'] {
  const name = model.name.toLowerCase();
  if (model.icon) return model.icon;
  if (name.startsWith('claude') || name.includes('anthropic')) return 'claude';
  if (name.startsWith('gpt') || /^o\d/.test(name) || name.includes('openai')) return 'openai';
  return undefined;
}

function ModelProviderIcon({ icon }: { icon?: Model['icon'] }) {
  if (!icon) return null;

  return (
    <svg
      aria-hidden="true"
      viewBox={icon === 'claude' ? '0 0 256 257' : '0 0 256 260'}
      width={16}
      height={16}
      style={{ flex: '0 0 auto', color: icon === 'claude' ? '#d97757' : 'currentColor' }}
    >
      <path
        fill={icon === 'claude' ? '#d97757' : 'currentColor'}
        d={icon === 'claude' ? CLAUDE_ICON_PATH : OPENAI_ICON_PATH}
      />
    </svg>
  );
}

function ModelOptionLabel({ model }: { model: Model }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ModelProviderIcon icon={resolveModelIcon(model)} />
      <span>{model.label}</span>
    </span>
  );
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const selectedModelInfo = useMemo(
    () => models.find((model) => model.name === selectedModel),
    [models, selectedModel],
  );
  const reasoningEfforts = selectedModelInfo?.reasoningEfforts?.length
    ? selectedModelInfo.reasoningEfforts
    : ALL_REASONING_EFFORTS;
  const reasoningEffortOptions = useMemo(
    () =>
      reasoningEfforts.map((effort) => ({
        label: effortLabel(t, effort),
        value: effort,
      })),
    [reasoningEfforts, t],
  );
  const {
    data: fieldTemplates = [],
    isLoading: fieldTemplatesLoading,
    isError: fieldTemplatesError,
  } = useQuery({
    queryKey: ['field-templates'],
    queryFn: () => listFieldTemplates().then((r) => r.data),
  });
  const {
    data: promptTemplates = [],
    isLoading: promptTemplatesLoading,
    isError: promptTemplatesError,
  } = useQuery({
    queryKey: ['prompt-templates', 'risk_analysis'],
    queryFn: () => listPromptTemplates().then((r) => r.data),
  });

  useEffect(() => {
    if (models.length === 0) return;
    const selectedExists = models.some((model) => model.name === selectedModel);
    if (!selectedModel || !selectedExists) {
      setSelectedModel(models.find((model) => model.isDefault)?.name ?? models[0].name);
    }
  }, [models, selectedModel, setSelectedModel]);

  useEffect(() => {
    if (!selectedModelInfo) return;
    const modelEfforts = selectedModelInfo.reasoningEfforts?.length
      ? selectedModelInfo.reasoningEfforts
      : ALL_REASONING_EFFORTS;
    if (!modelEfforts.includes(selectedReasoningEffort)) {
      setSelectedReasoningEffort(selectedModelInfo.defaultReasoningEffort ?? modelEfforts[0]);
    }
  }, [selectedModelInfo, selectedReasoningEffort, setSelectedReasoningEffort]);

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
      render: (d: string) => formatDateTime(d, i18n.language),
    },
  ];

  const fieldColumns = [
    {
      title: t('analysis.columns.field'),
      dataIndex: 'field',
      key: 'field',
      width: 160,
      onCell: () => ({ style: wrapCellStyle }),
    },
    {
      title: t('analysis.columns.value'),
      dataIndex: 'extracted_value',
      key: 'value',
      width: 420,
      onCell: () => ({ style: wrapCellStyle }),
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
  const runDisabledReason =
    !uploadedDoc || uploadedDoc.textExtractionStatus !== 'success'
      ? t('analysis.runDisabledUpload')
      : !selectedModel
        ? t('analysis.runDisabledModel')
        : !selectedFieldTemplateId
          ? t('analysis.runDisabledFieldTemplate')
          : !selectedPromptTemplateId
            ? t('analysis.runDisabledPromptTemplate')
            : undefined;

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
        {uploadMutation.isPending && (
          <div style={{ marginTop: 12 }}>
            <UploadProgress running={uploadMutation.isPending} />
          </div>
        )}
        {uploadedDoc && uploadedDoc.textExtractionStatus === 'success' && (
          <Alert
            type="success"
            message={t('analysis.uploadedExtraction', {
              file: uploadedDoc.fileName,
              status: statusLabel(t, uploadedDoc.textExtractionStatus),
            })}
            description={
              uploadedDoc.extractionMs != null
                ? t('analysis.ocrTook', { time: formatDuration(uploadedDoc.extractionMs) })
                : undefined
            }
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
                  className="always-scroll"
                  style={{
                    maxHeight: 480,
                    overflow: 'auto',
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
            <Trans
              i18nKey="analysis.manageInSettings"
              components={{ 1: <Link to="/settings" /> }}
            />
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
            loading={fieldTemplatesLoading}
            disabled={fieldTemplatesLoading || fieldTemplatesError}
          />
          {fieldTemplatesError && (
            <Alert type="error" showIcon message={t('analysis.fieldTemplatesUnavailable')} />
          )}
          {!fieldTemplatesLoading && !fieldTemplatesError && fieldTemplates.length === 0 && (
            <Alert type="warning" showIcon message={t('analysis.noFieldTemplates')} />
          )}
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
            <Trans
              i18nKey="analysis.manageInSettings"
              components={{ 1: <Link to="/settings" /> }}
            />
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
            loading={promptTemplatesLoading}
            disabled={promptTemplatesLoading || promptTemplatesError}
          />
          {promptTemplatesError && (
            <Alert type="error" showIcon message={t('analysis.promptTemplatesUnavailable')} />
          )}
          {!promptTemplatesLoading && !promptTemplatesError && promptTemplates.length === 0 && (
            <Alert type="warning" showIcon message={t('analysis.noPromptTemplates')} />
          )}
        </Space>
      </Card>

      <Card title={t('analysis.step4')}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space
            align={isMobile ? 'start' : 'end'}
            direction={isMobile ? 'vertical' : 'horizontal'}
            wrap={!isMobile}
            size={24}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" size={4} style={{ width: isMobile ? '100%' : undefined }}>
              <Typography.Text strong>{t('analysis.model')}</Typography.Text>
              <Select
                placeholder={t('analysis.selectModel')}
                style={{ width: isMobile ? '100%' : 220 }}
                value={selectedModel || undefined}
                onChange={setSelectedModel}
                disabled={analysisMutation.isPending}
                options={models.map((m) => ({
                  label: <ModelOptionLabel model={m} />,
                  value: m.name,
                }))}
              />
            </Space>
            <Space direction="vertical" size={4} style={{ width: isMobile ? '100%' : undefined }}>
              <Space size={6}>
                <Typography.Text strong>{t('effort.label')}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('effort.hint')}
                </Typography.Text>
              </Space>
              <Select
                placeholder={t('analysis.selectEffort')}
                style={{ width: isMobile ? '100%' : 210 }}
                value={selectedReasoningEffort}
                onChange={setSelectedReasoningEffort}
                disabled={
                  analysisMutation.isPending || selectedModelInfo?.supportsReasoning === false
                }
                options={reasoningEffortOptions}
              />
            </Space>
            <Tooltip title={runDisabledReason}>
              <span
                style={{
                  display: isMobile ? 'block' : 'inline-block',
                  width: isMobile ? '100%' : undefined,
                }}
              >
                <Button
                  type="primary"
                  loading={analysisMutation.isPending}
                  disabled={!!runDisabledReason}
                  onClick={() => analysisMutation.mutate()}
                  block={isMobile}
                >
                  {t('analysis.runAnalysis')}
                </Button>
              </span>
            </Tooltip>
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
          <Space style={{ marginBottom: 12 }} size={4} wrap>
            <Typography.Text type="secondary">{t('common.resultId')}:</Typography.Text>
            <Typography.Text
              copyable={{ text: result.analysisJobId }}
              code
              style={{ fontSize: 12 }}
            >
              {result.analysisJobId}
            </Typography.Text>
          </Space>
          {result.timings && (
            <div style={{ marginBottom: 12 }}>
              <RunTimings timings={result.timings} />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <TokenUsageSummary usage={result.tokenUsage} />
          </div>
          <Tabs
            items={[
              {
                key: 'fields',
                label: t('analysis.fieldExtraction'),
                children: Array.isArray(result.fieldExtractionResult) ? (
                  <Table
                    className="always-scroll"
                    dataSource={result.fieldExtractionResult}
                    columns={fieldColumns}
                    rowKey={(row, idx) => row.field ?? String(idx)}
                    pagination={false}
                    size="small"
                    scroll={{ x: 680 }}
                  />
                ) : (
                  <Alert type="warning" message={t('analysis.fieldResultBadFormat')} />
                ),
              },
              {
                key: 'risk',
                label: t('analysis.riskAnalysis'),
                children: (
                  <div
                    className="always-scroll"
                    style={{ maxHeight: 500, overflow: 'auto', padding: '0 4px' }}
                  >
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
          className="always-scroll"
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
