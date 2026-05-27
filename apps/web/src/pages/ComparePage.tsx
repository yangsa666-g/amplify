import { Upload, Button, Card, Radio, Typography, Alert, Space } from 'antd';
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
import type { ApiError } from '../types';

const { Dragger } = Upload;

export default function ComparePage() {
  const { t } = useTranslation();
  const isDark = useIsDark();
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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4}>{t('compare.title')}</Typography.Title>

      <Card>
        <Space size={16} style={{ width: '100%' }} align="start" wrap>
          <Card title={t('compare.oldVersion')} style={{ flex: 1, minWidth: 240 }} size="small">
            <Dragger
              multiple={false}
              showUploadList={false}
              beforeUpload={(f) => {
                oldUpload.mutate(f);
                return false;
              }}
              accept=".pdf,.docx,.txt"
            >
              <p>
                <InboxOutlined />
              </p>
              <p>{t('compare.uploadOld')}</p>
            </Dragger>
            {oldUpload.isPending && (
              <div style={{ marginTop: 12 }}>
                <UploadProgress running={oldUpload.isPending} />
              </div>
            )}
            {oldDoc && !oldUpload.isPending && (
              <Alert
                type="success"
                message={oldDoc.fileName}
                description={
                  oldDoc.extractionMs != null
                    ? t('compare.ocrTook', { time: formatDuration(oldDoc.extractionMs) })
                    : undefined
                }
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
          <Card title={t('compare.newVersion')} style={{ flex: 1, minWidth: 240 }} size="small">
            <Dragger
              multiple={false}
              showUploadList={false}
              beforeUpload={(f) => {
                newUpload.mutate(f);
                return false;
              }}
              accept=".pdf,.docx,.txt"
            >
              <p>
                <InboxOutlined />
              </p>
              <p>{t('compare.uploadNew')}</p>
            </Dragger>
            {newUpload.isPending && (
              <div style={{ marginTop: 12 }}>
                <UploadProgress running={newUpload.isPending} />
              </div>
            )}
            {newDoc && !newUpload.isPending && (
              <Alert
                type="success"
                message={newDoc.fileName}
                description={
                  newDoc.extractionMs != null
                    ? t('compare.ocrTook', { time: formatDuration(newDoc.extractionMs) })
                    : undefined
                }
                style={{ marginTop: 8 }}
              />
            )}
          </Card>
        </Space>

        <Space style={{ marginTop: 16 }} wrap>
          <Radio.Group value={diffMode} onChange={(e) => setDiffMode(e.target.value)}>
            <Radio.Button value="side_by_side">{t('compare.sideBySide')}</Radio.Button>
            <Radio.Button value="unified">{t('compare.unified')}</Radio.Button>
          </Radio.Group>
          <Button
            type="primary"
            loading={compareMutation.isPending}
            disabled={!oldDoc || !newDoc || oldUpload.isPending || newUpload.isPending}
            onClick={() => compareMutation.mutate()}
          >
            {t('compare.compare')}
          </Button>
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
