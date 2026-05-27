import TimedProgress, { type ProgressStage } from './TimedProgress';

// Field extraction + risk analysis run in parallel and can take a while on
// high reasoning effort, so the bar eases slowly (tau = 40).
const STAGES: ProgressStage[] = [
  { until: 5, key: 'analysis.progress.reading' },
  { until: 30, key: 'analysis.progress.working' },
  { until: 75, key: 'analysis.progress.stillWorking' },
  { until: Infinity, key: 'analysis.progress.finalizing' },
];

/** Progress feedback shown while the synchronous analysis request is in flight. */
export default function AnalysisProgress({ running }: { running: boolean }) {
  return (
    <TimedProgress
      running={running}
      titleKey="analysis.progress.title"
      hintKey="analysis.progress.hint"
      stages={STAGES}
      tau={40}
    />
  );
}
