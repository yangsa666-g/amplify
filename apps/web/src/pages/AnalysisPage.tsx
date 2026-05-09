import React, { useEffect } from 'react';
import { Upload, Select, Button, Card, Table, Typography, Alert, Tabs, Spin, Tag, Space, message, Collapse } from 'antd';
import { InboxOutlined, FileTextOutlined, UnorderedListOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadDocument, getDocumentText } from '../api/documents';
import { runAnalysis, getRecentAnalysis } from '../api/analysis';
import { getModels } from '../api/models';
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
import FieldTemplateEditor from '../components/FieldTemplateEditor';
import PromptEditor from '../components/PromptEditor';
import { useAnalysisStore } from '../stores/analysisStore';
import type { Document, AnalysisResult, AnalysisJob } from '../types';

const { Dragger } = Upload;

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { uploadedDoc, selectedModel, result, ocrPreviewOpen, setUploadedDoc, setSelectedModel, setResult, setOcrPreviewOpen } = useAnalysisStore();

  const { data: models = [] } = useQuery({ queryKey: ['models'], queryFn: () => getModels().then((r) => r.data) });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel, setSelectedModel]);
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
                  <Typography.Text type="secondary">No content available.</Typography.Text>
                )}
              </div>
            ),
          }]}
        />
      )}

      <Collapse
        items={[
          {
            key: 'fields',
            label: (
              <Space>
                <UnorderedListOutlined />
                2. Extraction Fields — configure which fields to extract from the contract
              </Space>
            ),
            children: (
              <FieldTemplateEditor
                queryKey={['field-template']}
                fetchFn={getCurrentFieldTemplate}
                saveFn={saveFieldTemplate}
                resetFn={resetFieldTemplate}
              />
            ),
          },
        ]}
      />

      <Collapse
        items={[
          {
            key: 'prompt',
            label: (
              <Space>
                <EditOutlined />
                3. Risk Analysis Prompt — configure the prompt used for risk analysis
              </Space>
            ),
            children: (
              <PromptEditor
                queryKey={['prompt-template']}
                fetchFn={getCurrentPromptTemplate}
                saveFn={savePromptTemplate}
                resetFn={resetPromptTemplate}
              />
            ),
          },
        ]}
      />

      <Card title="4. Select Model & Run">
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
                      <Typography.Title level={5} style={{ marginTop: 0 }}>
                        Original Contract Description
                      </Typography.Title>
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {result.riskAnalysisResult.originalContractDescription}
                      </Markdown>
                      <hr style={{ margin: '16px 0', borderColor: '#f0f0f0' }} />
                    </>
                  )}
                  {result.riskAnalysisResult.riskAnalysis && (
                    <>
                      <Typography.Title level={5} style={{ marginTop: 0 }}>
                        Risk Analysis
                      </Typography.Title>
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {result.riskAnalysisResult.riskAnalysis}
                      </Markdown>
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
