import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMurshidFieldCase } from '../src/data/murshidDiagnosticEngine.ts';

test('unified engine returns Oman context, stress ranking and nutrient candidates', () => {
  const result = assessMurshidFieldCase({
    stress: {
      crop: 'citrus',
      patterns: ['interveinal_chlorosis'],
      leafAge: 'young',
      soilCalcareousOrHighPh: true
    },
    nutrition: {
      crop: 'citrus',
      leafAge: 'young',
      patterns: ['interveinal_yellowing', 'green_veins_yellow_blade'],
      soilKnownCalcareousOrHighPH: true
    }
  });
  assert.equal(result.region, 'Oman');
  assert.equal(result.engineVersion, '0.3.0');
  assert.equal(result.regionScope, 'regional-and-global');
  assert.ok(result.coreKnowledgeReferences.some((record) => record.id === 'citrus-canker'));
  assert.ok(result.stressAssessment.candidates.some((candidate) => candidate.causeId === 'high_ph_lockout'));
  assert.ok(result.nutrientCandidates.length > 0);
  assert.ok(result.knowledgeReferences.some((record) => record.id === 'lime-witches-broom'));
});

test('unified engine does not invent pest references for an unknown crop', () => {
  const result = assessMurshidFieldCase({
    stress: { crop: 'other', patterns: [] }
  });
  assert.deepEqual(result.knowledgeReferences, []);
  assert.deepEqual(result.nutrientCandidates, []);
});


test('unified engine returns regional date-palm references for date-palm cases', () => {
  const result = assessMurshidFieldCase({
    stress: { crop: 'date_palm', patterns: ['visible_insects'] }
  });
  assert.equal(result.coreKnowledgeReferences.length, 6);
  assert.ok(result.coreKnowledgeReferences.some((record) => record.id === 'dp-black-scorch'));
});
