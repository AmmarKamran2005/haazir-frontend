import type { ReactNode } from 'react';

export function ConfidenceBar({ confidence, note }: { confidence: number; note?: ReactNode }) {
  return (
    <div className="conf">
      <div className="lbl lbl--panel" style={{ marginBottom: 6 }}>Confidence</div>
      <div className="conf__row">
        <div className="conf__track"><div className="conf__fill" style={{ width: (confidence * 100).toFixed(0) + '%' }} /></div>
        <span className="conf__v">{Math.round(confidence * 100)}%</span>
      </div>
      {note !== undefined && <div className="conf__note">{note}</div>}
    </div>
  );
}
