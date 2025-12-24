import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { ProgressState } from '../types';

interface Props {
  state: ProgressState | null;
}

const stageLabel: Record<ProgressState['stage'], string> = {
  transpiling: 'Transpiling',
  rendering: 'Rendering',
  extracting: 'Extracting layout',
  generating: 'Generating export',
};

export const ProgressIndicator: React.FC<Props> = ({ state }) => {
  if (!state) return null;

  const clampedPercent = Math.min(100, Math.max(0, Math.round(state.percent)));

  return (
    <div className="progress-card">
      <div className="progress-header">
        <div className="pill">
          <Sparkles size={14} />
          {stageLabel[state.stage]}
        </div>
        <div className="percent">{clampedPercent}%</div>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${clampedPercent}%` }} />
      </div>
      <div className="progress-message">
        <Loader2 size={14} className="spin" />
        <span>{state.message}</span>
      </div>
    </div>
  );
};
