import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ErrorInfo } from '../types';

interface Props {
  error: ErrorInfo;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<Props> = ({ error, onRetry }) => {
  return (
    <div className="error-card">
      <div className="error-icon">
        <AlertCircle size={18} />
      </div>
      <div className="error-body">
        <div className="error-code">{error.code}</div>
        <div className="error-message">{error.message}</div>
        <div className="error-suggestion">{error.suggestion}</div>
        {onRetry && error.canRetry && (
          <button className="ghost retry" onClick={onRetry}>
            <RefreshCw size={14} />
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
