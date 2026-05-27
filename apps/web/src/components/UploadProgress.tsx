import TimedProgress, { type ProgressStage } from './TimedProgress';

// Upload is quick; OCR/text extraction dominates and typically takes ~30s, so
// the bar eases faster (tau = 16 → ~80% at 30s) than the analysis one.
const STAGES: ProgressStage[] = [
  { until: 3, key: 'analysis.uploadProgress.uploading' },
  { until: 20, key: 'analysis.uploadProgress.extracting' },
  { until: 45, key: 'analysis.uploadProgress.stillExtracting' },
  { until: Infinity, key: 'analysis.uploadProgress.finalizing' },
];

/** Progress feedback shown while a document is uploading and being OCR'd. */
export default function UploadProgress({ running }: { running: boolean }) {
  return (
    <TimedProgress
      running={running}
      titleKey="analysis.uploadProgress.title"
      hintKey="analysis.uploadProgress.hint"
      stages={STAGES}
      tau={16}
    />
  );
}
