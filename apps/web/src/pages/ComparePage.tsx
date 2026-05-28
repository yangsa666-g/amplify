import { Upload, Button, Card, Radio, Typography, Alert, Space, Grid, Tooltip, theme } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { uploadDocument } from '../api/documents';
import { runCompare } from '../api/compare';
import UploadProgress from '../components/UploadProgress';
import { formatDuration } from '../utils/duration';
import { message } from '../utils/message';
import { useIsDark } from '../hooks/useIsDark';
import { useCompareStore } from '../stores/compareStore';
import { statusLabel } from '../utils/labels';
import type { ApiError, Document } from '../types';

const { Dragger } = Upload;

export default function ComparePage() {
  const { t } = useTranslation();
  const isDark = useIsDark();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { oldDoc, newDoc, diffMode, result, setOldDoc, setNewDoc, setDiffMode, setResult } =
    useCompareStore();

  const oldUpload = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => {
      setOldDoc(doc);
      message.success(t('compare.uploaded', { file: doc.fileName }));
    },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('compare.uploadFailed')),
  });

  const newUpload = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => {
      setNewDoc(doc);
      message.success(t('compare.uploaded', { file: doc.fileName }));
    },
    onError: (e: ApiError) => message.error(e.response?.data?.message || t('compare.uploadFailed')),
  });

  const compareMutation = useMutation({
    mutationFn: () => runCompare(oldDoc!.id, newDoc!.id, diffMode).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      message.success(t('compare.comparisonComplete'));
    },
    onError: (e: ApiError) =>
      message.error(e.response?.data?.message || t('compare.comparisonFailed')),
  });

  const oldText =
    result?.diffResult.chunks
      .filter((c) => c.type !== 'added')
      .map((c) => c.value)
      .join('') || '';
  const newText =
    result?.diffResult.chunks
      .filter((c) => c.type !== 'removed')
      .map((c) => c.value)
      .join('') || '';
  const compareDisabledReason =
    oldUpload.isPending || newUpload.isPending
      ? t('compare.compareDisabledProcessing')
      : !oldDoc
        ? t('compare.compareDisabledOld')
        : oldDoc.textExtractionStatus !== 'success'
          ? t('compare.compareDisabledOldReady')
          : !newDoc
            ? t('compare.compareDisabledNew')
            : newDoc.textExtractionStatus !== 'success'
              ? t('compare.compareDisabledNewReady')
              : undefined;

  const renderUploadPanel = ({
    title,
    uploadText,
    doc,
    pending,
    onFile,
  }: {
    title: string;
    uploadText: string;
    doc: Document | null;
    pending: boolean;
    onFile: (file: File) => void;
  }) => (
    <div
      className="compare-upload-panel"
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Typography.Text strong className="compare-upload-title">
        {title}
      </Typography.Text>
      <Dragger
        className="compare-upload-dragger"
        multiple={false}
        showUploadList={false}
        beforeUpload={(f) => {
          onFile(f);
          return false;
        }}
        accept=".pdf,.docx,.txt"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="compare-upload-copy">{uploadText}</p>
      </Dragger>
      {pending && (
        <div style={{ marginTop: 12 }}>
          <UploadProgress running={pending} />
        </div>
      )}
      {doc && !pending && (
        <Alert
          type={
            doc.textExtractionStatus === 'success'
              ? 'success'
              : doc.textExtractionStatus === 'failed'
                ? 'error'
                : 'info'
          }
          message={
            <Typography.Text ellipsis={{ tooltip: doc.fileName }} style={{ maxWidth: '100%' }}>
              {doc.fileName}
            </Typography.Text>
          }
          description={
            doc.textExtractionStatus === 'failed'
              ? doc.extractionError || t('compare.uploadFailed')
              : doc.extractionMs != null
                ? t('compare.ocrTook', { time: formatDuration(doc.extractionMs) })
                : statusLabel(t, doc.textExtractionStatus)
          }
          style={{ marginTop: 8 }}
          showIcon
        />
      )}
    </div>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4}>{t('compare.title')}</Typography.Title>

      <Card className="compare-upload-card">
        <div
          className="compare-upload-grid"
          style={{
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(240px, 1fr))',
          }}
        >
          {renderUploadPanel({
            title: t('compare.oldVersion'),
            uploadText: t('compare.uploadOld'),
            doc: oldDoc,
            pending: oldUpload.isPending,
            onFile: (file) => oldUpload.mutate(file),
          })}
          {renderUploadPanel({
            title: t('compare.newVersion'),
            uploadText: t('compare.uploadNew'),
            doc: newDoc,
            pending: newUpload.isPending,
            onFile: (file) => newUpload.mutate(file),
          })}
        </div>

        <Space className="compare-actions" wrap>
          <Radio.Group
            value={diffMode}
            onChange={(e) => setDiffMode(e.target.value)}
            style={{ maxWidth: '100%' }}
          >
            <Radio.Button value="side_by_side">{t('compare.sideBySide')}</Radio.Button>
            <Radio.Button value="unified">{t('compare.unified')}</Radio.Button>
          </Radio.Group>
          <Tooltip title={compareDisabledReason}>
            <span>
              <Button
                type="primary"
                loading={compareMutation.isPending}
                disabled={!!compareDisabledReason}
                onClick={() => compareMutation.mutate()}
              >
                {t('compare.compare')}
              </Button>
            </span>
          </Tooltip>
        </Space>
      </Card>

      {result && (
        <Card
          title={t('compare.diffResult', {
            added: result.diffResult.stats.added,
            removed: result.diffResult.stats.removed,
          })}
        >
          <div style={{ overflowX: 'auto' }}>
            <ReactDiffViewer
              oldValue={oldText}
              newValue={newText}
              splitView={diffMode === 'side_by_side'}
              useDarkTheme={isDark}
              leftTitle={oldDoc?.fileName}
              rightTitle={newDoc?.fileName}
            />
          </div>
        </Card>
      )}
    </Space>
  );
}
