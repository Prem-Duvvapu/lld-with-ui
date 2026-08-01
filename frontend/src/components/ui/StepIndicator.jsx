import React from 'react';
import './StepIndicator.css';

export default function StepIndicator({ steps = [], currentStep = 0, className = '' }) {
  const total = typeof steps === 'number' ? steps : steps.length;
  const stepArray = Array.from({ length: total }, (_, i) => i);

  return (
    <div className={`ui-step-indicator ${className}`}>
      {stepArray.map((idx) => {
        let status = 'pending';
        if (idx === currentStep) status = 'active';
        else if (idx < currentStep) status = 'done';

        const label = typeof steps[idx] === 'string' ? steps[idx] : `Step ${idx + 1}`;

        return (
          <div
            key={idx}
            className={`ui-step-dot ui-step-dot--${status}`}
            title={`${idx + 1}. ${label}`}
          />
        );
      })}
    </div>
  );
}
