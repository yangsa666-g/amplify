import React, { useState } from 'react';
import { Upload, Select, Button, Card, Table, Typography, Alert, Tabs, Spin, Tag, Space, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { uploadDocument } from '../api/documents';
import { runAnalysis, getRecentAnalysis } from '../api/analysis';
import { getModels } from '../api/models';
import type { Document, AnalysisResult, AnalysisJob } from '../types';

const { Dragger } = Upload;

export default function AnalysisPage() {
  const [uploadedDoc, setUploadedDoc] = useState<Document | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: () => getModels().then((r) => r.data) });
  const { data: recent = [], refetch: refetchRecent } = useQuery({ queryKey: ['analysis-recent'], queryFn: () => getRecentAnalysis().then((r) => r.data) });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => { setUploadedDoc(doc); message.success('File uploaded and text extracted'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Upload failed'),
  });

  const analysisMutation = useMutation({
    mutationFn: () => runAnalysis(uploadedDoc!.id, selectedModel).then((r) => r.data),
    onSuccess: (data) => { setResult(data); refetchRecent(); message.success('Analysis complete'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Analysis failed'),
  });

  const recentColumns = [
    { title: 'File', dataIndex: ['document', 'fileName'], key: 'fileName' },
    { title: 'Model', dataIndex: 'modelName', key: 'model' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'success' ? 'green' : s === 'failed' ? 'red' : 'blue'}>{s}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
  ];

  const fieldColumns = [
    { title: 'Field', dataIndex: 'field', key: 'field', width: 160 },
    { title: 'Value', dataIndex: 'extracted_value', key: 'value', render: (v: any) => v ?? <Typography.Text type="secondary">Not found</Typography.Text> },
    { title: 'Confidence', dataIndex: 'confidence', key: 'conf', width: 100 },
  ];

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
        {uploadedDoc && <Alert type="success" message={`Uploaded: ${uploadedDoc.fileName} | Extraction: ${uploadedDoc.textExtractionStatus}`} style={{ marginTop: 8 }} />}
      </Card>

      <Card title="2. Select Model & Run">
        <Space>
          <Select
            placeholder="Select AI model"
            style={{ width: 200 }}
            value={selectedModel || undefined}
            onChange={setSelectedModel}
            options={models.map((m) => ({ label: m.label, value: m.name }))}
          />
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
          <Alert type="error" message={(analysisMutation.error as any)?.response?.data?.message || 'Analysis failed'} style={{ marginTop: 8 }} />
        )}
      </Card>

      {result && (
        <Card title="3. Results">
          <Tabs items={[
            {
              key: 'fields',
              label: 'Field Extraction',
              children: (
                <Table
                  dataSource={result.fieldExtractionResult}
                  columns={fieldColumns}
                  rowKey="field"
                  pagination={false}
                  size="small"
                />
              ),
            },
            {
              key: 'risk',
              label: 'Risk Analysis',
              children: (
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {result.riskAnalysisResult}
                </Typography.Paragraph>
              ),
            },
          ]} />
        </Card>
      )}

      <Card title="Recent History">
        <Table dataSource={recent} columns={recentColumns} rowKey="id" pagination={false} size="small" />
      </Card>
    </Space>
  );
}
