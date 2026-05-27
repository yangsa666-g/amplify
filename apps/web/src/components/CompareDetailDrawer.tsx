import { Drawer, Typography, Space, Tag, Alert, Grid } from 'antd';
import { useTranslation } from 'react-i18next';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useIsDark } from '../hooks/useIsDark';
import { statusLabel } from '../utils/labels';
import type { CompareJob } from '../types';

interface Props {
  job: CompareJob | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Read-only view of a past comparison. Renders directly from the job record —
 * the history list already includes diffResultJson — so it needs no extra fetch
 * and works for both "my history" and the admin "all history" view.
 */
export default function CompareDetailDrawer({ job, open, onClose }: Props) {
  const { t } = useTranslation();
  const isDark = useIsDark();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const chunks = job?.diffResultJson?.chunks ?? [];
  const oldText = chunks
    .filter((c) => c.type !== 'added')
    .map((c) => c.value)
    .join('');
  const newText = chunks
    .filter((c) => c.type !== 'removed')
    .map((c) => c.value)
    .join('');
  const stats = job?.diffResultJson?.stats;

  return (
    <Drawer
      title={
        <Space>
          <span>{t('compareDetail.title')}</span>
          {job && (
            <Tag
              color={job.status === 'success' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}
            >
              {statusLabel(t, job.status)}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={isMobile ? '100%' : 1000}
      destroyOnClose
    >
      {!job ? null : (
        <>
          <Space style={{ marginBottom: 16 }} wrap>
            <Typography.Text strong>{job.oldDocument.fileName}</Typography.Text>
            <Typography.Text type="secondary">→</Typography.Text>
            <Typography.Text strong>{job.newDocument.fileName}</Typography.Text>
            <Tag style={{ marginInlineEnd: 0 }}>
              {job.diffMode === 'unified' ? t('compare.unified') : t('compare.sideBySide')}
            </Tag>
            <Typography.Text type="secondary">
              {new Date(job.createdAt).toLocaleString()}
            </Typography.Text>
            {job.user && (
              <Typography.Text type="secondary">
                {t('detail.by', { name: job.user.name })}
              </Typography.Text>
            )}
          </Space>

          {job.diffResultJson ? (
            <>
              <Typography.Paragraph type="secondary">
                {t('compare.diffResult', {
                  added: stats?.added ?? 0,
                  removed: stats?.removed ?? 0,
                })}
              </Typography.Paragraph>
              <div style={{ overflowX: 'auto' }}>
                <ReactDiffViewer
                  oldValue={oldText}
                  newValue={newText}
                  splitView={job.diffMode === 'side_by_side'}
                  useDarkTheme={isDark}
                  leftTitle={job.oldDocument.fileName}
                  rightTitle={job.newDocument.fileName}
                />
              </div>
            </>
          ) : (
            <Alert
              type={job.status === 'failed' ? 'error' : 'info'}
              message={job.errorMessage || t('compareDetail.noDiff')}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
