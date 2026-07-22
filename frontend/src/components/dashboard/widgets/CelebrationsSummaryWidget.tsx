import React from 'react';
import { WidgetHeader } from '../WidgetHeader';
import CelebrationsWidget from '../../CelebrationsWidget';

export function CelebrationsSummaryWidget() {
  return (
    <div className="flex-1 flex flex-col">
      <WidgetHeader icon={<span className="text-lg leading-none">🎉</span>} title="Today's Celebrations" />
      <CelebrationsWidget variant="compact" embedded />
    </div>
  );
}
