import React, { useState } from 'react';
import {
  Drawer,
  Tabs,
  Table,
  Typography,
  Button,
  Space,
  Spin,
  Alert,
  Tag,
} from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAnalysisJob } from '../api/analysis';
import { getDocumentText, downloadDocument, downloadTextAsMarkdown } from '../api/documents';
import type { AnalysisJob } from '../types';

interface Props {
  job: AnalysisJob | null;
  open: boolean;
  onClose: () => void;
}

const fieldColumns = [
  { title: 'Field', dataIndex: 'field', key: 'field', width: 180 },
  {
    title: 'Value',
    dataIndex: 'extracted_value',
    key: 'value',
    render: (v: any) => {
      if (v === null || v === undefined)
        return <Typography.Text type="secondary">Not found</Typography.Text>;
      if (typeof v === 'object')
        return <Typography.Text code>{JSON.stringify(v, null, 2)}</Typography.Text>;
      return String(v);
    },
  },
  { title: 'Confidence', dataIndex: 'confidence', key: 'conf', width: 100 },
  {
    title: 'Evidence',
    dataIndex: 'evidence',
    key: 'evidence',
    render: (v: any) =>
      v ? (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {v}
        </Typography.Text>
      ) : (
        '—'
      ),
  },
  {
    title: 'Comments',
    dataIndex: 'comments',
    key: 'comments',
    render: (v: any) => v || '—',
  },
];

export default function AnalysisDetailDrawer({ job, open, onClose }: Props) {
  const [ocrTabActive, setOcrTabActive] = useState(false);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['analysis-detail', job?.id],
    queryFn: () => getAnalysisJob(job!.id).then((r) => r.data),
    enabled: !!job?.id && open,
  });

  const { data: ocrText, isFetching: ocrLoading } = useQuery({
    queryKey: ['document-text', job?.documentId],
    queryFn: () => getDocumentText(job!.documentId).then((r) => r.data.text),
    enabled: !!job?.documentId && open && ocrTabActive,
  });

  const fieldResults: any[] = Array.isArray(detail?.fieldExtractionResult?.resultJson)
    ? detail.fieldExtractionResult.resultJson
    : [];
  const riskJson = detail?.riskAnalysisResult?.resultJson ?? null;

  const handleTabChange = (key: string) => {
    if (key === 'ocr') setOcrTabActive(true);
  };

  return (
    <Drawer
      title={
        <Space>
          <span>Analysis Detail</span>
          {job && (
            <Tag color={job.status === 'success' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}>
              {job.status}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={() => {
        setOcrTabActive(false);
        onClose();
      }}
      width={900}
      destroyOnClose
    >
      {!job ? null : detailLoading ? (
        <Spin style={{ display: 'block', marginTop: 80 }} />
      ) : (
        <>
          <Space style={{ marginBottom: 16 }} wrap>
            <Typography.Text strong>{job.document.fileName}</Typography.Text>
            <Typography.Text type="secondary">Model: {job.modelName}</Typography.Text>
            <Typography.Text type="secondary">
              {new Date(job.createdAt).toLocaleString()}
            </Typography.Text>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => downloadDocument(job.documentId, job.document.fileName)}
            >
              Download Original
            </Button>
          </Space>

          <Tabs
            defaultActiveKey="fields"
            onChange={handleTabChange}
            items={[
              {
                key: 'fields',
                label: 'Field Extraction',
                children:
                  fieldResults.length > 0 ? (
                    <Table
                      dataSource={fieldResults}
                      columns={fieldColumns}
                      rowKey={(row, idx) => row.field ?? String(idx)}
                      pagination={false}
                      size="small"
                      scroll={{ x: true }}
                    />
                  ) : (
                    <Alert type="info" message="No field extraction results available." />
                  ),
              },
              {
                key: 'risk',
                label: 'Risk Analysis',
                children: riskJson ? (
                  <div style={{ maxHeight: 600, overflowY: 'auto', padding: '0 4px' }}>
                    {riskJson.originalContractDescription && (
                      <>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>
                          Original Contract Description
                        </Typography.Title>
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {riskJson.originalContractDescription}
                        </Markdown>
                        <hr style={{ margin: '16px 0', borderColor: '#f0f0f0' }} />
                      </>
                    )}
                    {riskJson.riskAnalysis && (
                      <>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>
                          Risk Analysis
                        </Typography.Title>
                        <Markdown remarkPlugins={[remarkGfm]}>{riskJson.riskAnalysis}</Markdown>
                      </>
                    )}
                  </div>
                ) : (
                  <Alert type="info" message="No risk analysis results available." />
                ),
              },
              {
                key: 'ocr',
                label: (
                  <Space>
                    <FileTextOutlined />
                    OCR Text
                  </Space>
                ),
                children: ocrLoading ? (
                  <Spin style={{ display: 'block', marginTop: 40 }} />
                ) : ocrText ? (
                  <>
                    <Button
                      icon={<DownloadOutlined />}
                      size="small"
                      style={{ marginBottom: 12 }}
                      onClick={() => downloadTextAsMarkdown(ocrText, job.document.fileName)}
                    >
                      Download Markdown
                    </Button>
                    <div
                      style={{
                        maxHeight: 560,
                        overflowY: 'auto',
                        padding: '0 4px',
                        fontSize: 13,
                        lineHeight: 1.7,
                        border: '1px solid #f0f0f0',
                        borderRadius: 6,
                        paddingInline: 12,
                      }}
                    >
                      <Markdown remarkPlugins={[remarkGfm]}>{ocrText}</Markdown>
                    </div>
                  </>
                ) : (
                  <Alert type="info" message="OCR text not available for this document." />
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
