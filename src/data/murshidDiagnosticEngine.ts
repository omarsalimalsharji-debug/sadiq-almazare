/**
 * مُرشد — unified local agronomy engine entry point.
 *
 * Composes the Oman knowledge catalogue, stress differential rules and
 * nutrient screening. It does not perform image inference or claim certainty.
 */
import { getMurshidKnowledgeByCrop } from './murshidOmanPestKnowledge.ts';
import {
  rankMurshidCitrusNutritionCandidates,
  type MurshidNutritionObservation,
  type MurshidNutrientCandidate
} from './murshidNutrientDiagnostic.ts';
import {
  assessMurshidPlantStress,
  type MurshidStressAssessment,
  type MurshidStressObservation
} from './murshidStressDifferential.ts';

export interface MurshidFieldCaseInput {
  stress: MurshidStressObservation;
  nutrition?: MurshidNutritionObservation;
}

export interface MurshidFieldCaseResult {
  engineVersion: '0.2.0';
  region: 'Oman';
  stressAssessment: MurshidStressAssessment;
  nutrientCandidates: MurshidNutrientCandidate[];
  knowledgeReferences: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    evidenceStatus: string;
    lookalikes: string[];
  }>;
  decisionNote: string;
}

function cropSearchTerm(crop: MurshidStressObservation['crop']): string {
  if (crop === 'citrus') return 'citrus';
  if (crop === 'nursery_seedling') return 'seedling';
  return '';
}

/**
 * Main deterministic entry point for non-image field observations.
 * Image recognition must be supplied by a separately trained and evaluated model.
 */
export function assessMurshidFieldCase(input: MurshidFieldCaseInput): MurshidFieldCaseResult {
  const stressAssessment = assessMurshidPlantStress(input.stress);
  const nutrientCandidates = input.nutrition
    ? rankMurshidCitrusNutritionCandidates(input.nutrition)
    : [];
  const searchTerm = cropSearchTerm(input.stress.crop);
  const knowledgeReferences = searchTerm
    ? getMurshidKnowledgeByCrop(searchTerm).map((record) => ({
        id: record.id,
        nameAr: record.nameAr,
        nameEn: record.nameEn,
        evidenceStatus: record.evidenceStatus,
        lookalikes: record.lookalikes
      }))
    : [];

  return {
    engineVersion: '0.2.0',
    region: 'Oman',
    stressAssessment,
    nutrientCandidates,
    knowledgeReferences,
    decisionNote: 'هذه نتيجة فرز زراعي تفسيري مبني على الملاحظات المدخلة؛ ليست تشخيصاً بصرياً أو مخبرياً، ولا تُستخدم وحدها لاختيار مبيد أو جرعة سماد.'
  };
}
