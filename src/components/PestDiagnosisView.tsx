import React from 'react';
import { PlantDiagnosisView } from './PlantDiagnosisView.tsx';

/**
 * Preserves existing `pest_diagnosis` route compatibility seamlessly
 * by delegating to the unified Smart Diagnosis experience with insect focus.
 */
export const PestDiagnosisView: React.FC = () => {
  return <PlantDiagnosisView initialFocus="insect" />;
};
