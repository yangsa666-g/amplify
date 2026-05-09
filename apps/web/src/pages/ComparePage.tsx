import React, { useState } from 'react';
import { Upload, Button, Card, Radio, Typography, Alert, Space, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { uploadDocument } from '../api/documents';
import { runCompare } from '../api/compare';
import type { Document, CompareResult } from '../types';

const { Dragger } = Upload;

export default function ComparePage() {
  const [oldDoc, setOldDoc] = useState<Document | null>(null);
  const [newDoc, setNewDoc] = useState<Document | null>(null);
  const [diffMode, setDiffMode] = useState<'side_by_side' | 'unified'>('side_by_side');
  const [result, setResult] = useState<CompareResult | null>(null);

  const oldUpload = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => { setOldDoc(doc); message.success(`Uploaded: ${doc.fileName}`); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Upload failed'),
  });

  const newUpload = useMutation({
    mutationFn: (file: File) => uploadDocument(file).then((r) => r.data),
    onSuccess: (doc) => { setNewDoc(doc); message.success(`Uploaded: ${doc.fileName}`); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Upload failed'),
  });

  const compareMutation = useMutation({
    mutationFn: () => runCompare(oldDoc!.id, newDoc!.id, diffMode).then((r) => r.data),
    onSuccess: (data) => { setResult(data); message.success('Comparison complete'); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Comparison failed'),
  });

  const oldText = result?.diffResult.chunks.filter((c) => c.type !== 'added').map((c) => c.value).join('') || '';
  const newText = result?.diffResult.chunks.filter((c) => c.type !== 'removed').map((c) => c.value).join('') || '';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4}>Contract Compare</Typography.Title>

      <Card>
        <Space size={16} style={{ width: '100%' }} align="start">
          <Card title="Old Version" style={{ flex: 1, minWidth: 240 }} size="small">
            <Dragger multiple={false} showUploadList={false} beforeUpload={(f) => { oldUpload.mutate(f); return false; }} accept=".pdf,.docx,.txt">
              <p><InboxOutlined /></p><p>Upload old version</p>
            </Dragger>
            {oldDoc && <Alert type="success" message={oldDoc.fileName} style={{ marginTop: 8 }} />}
          </Card>
          <Card title="New Version" style={{ flex: 1, minWidth: 240 }} size="small">
            <Dragger multiple={false} showUploadList={false} beforeUpload={(f) => { newUpload.mutate(f); return false; }} accept=".pdf,.docx,.txt">
              <p><InboxOutlined /></p><p>Upload new version</p>
            </Dragger>
            {newDoc && <Alert type="success" message={newDoc.fileName} style={{ marginTop: 8 }} />}
          </Card>
        </Space>

        <Space style={{ marginTop: 16 }}>
          <Radio.Group value={diffMode} onChange={(e) => setDiffMode(e.target.value)}>
            <Radio.Button value="side_by_side">Side by Side</Radio.Button>
            <Radio.Button value="unified">Unified</Radio.Button>
          </Radio.Group>
          <Button
            type="primary"
            loading={compareMutation.isPending}
            disabled={!oldDoc || !newDoc}
            onClick={() => compareMutation.mutate()}
          >
            Compare
          </Button>
        </Space>
      </Card>

      {result && (
        <Card title={`Diff Result — Added: ${result.diffResult.stats.added} | Removed: ${result.diffResult.stats.removed}`}>
          <ReactDiffViewer
            oldValue={oldText}
            newValue={newText}
            splitView={diffMode === 'side_by_side'}
            leftTitle={oldDoc?.fileName}
            rightTitle={newDoc?.fileName}
          />
        </Card>
      )}
    </Space>
  );
}
