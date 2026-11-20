import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMurshidPlantStress } from '../src/data/murshidStressDifferential.ts';

test('ranks salinity when salty irrigation and marginal scorch are reported', () => {
  const result = assessMurshidPlantStress({
    crop: 'citrus',
    patterns: ['marginal_burn', 'leaf_tip_burn'],
    irrigationWaterSalty: true,
    affectedPlantPercent: 35,
    symptomIntensity: 2
  });
  assert.equal(result.candidates[0]?.causeId, 'salinity');
  assert.notEqual(result.severity, 'undetermined');
});

test('ranks waterlogging when wet soil, poor drainage and wilting coexist', () => {
  const result = assessMurshidPlantStress({
    crop: 'nursery_seedling',
    patterns: ['wilting', 'root_browning'],
    soilCurrentlyWet: true,
    drainagePoor: true
  });
  assert.equal(result.candidates[0]?.causeId, 'waterlogging');
});

test('keeps an empty observation undetermined rather than inventing a cause', () => {
  const result = assessMurshidPlantStress({ crop: 'other', patterns: [] });
  assert.equal(result.severity, 'undetermined');
  assert.deepEqual(result.candidates, []);
  assert.equal(result.urgentFieldReview, false);
});

test('flags rapidly worsening severe cases for field review', () => {
  const result = assessMurshidPlantStress({
    crop: 'citrus',
    patterns: ['wilting', 'root_soft_rot'],
    affectedPlantPercent: 55,
    affectedLeafAreaPercent: 70,
    symptomIntensity: 3,
    growthImpact: 3,
    progression: 'rapid'
  });
  assert.equal(result.severity, 'severe');
  assert.equal(result.urgentFieldReview, true);
});

test('ranks high-pH nutrient availability issue for young-leaf interveinal chlorosis', () => {
  const result = assessMurshidPlantStress({
    crop: 'citrus',
    patterns: ['interveinal_chlorosis'],
    leafAge: 'young',
    soilCalcareousOrHighPh: true
  });
  assert.equal(result.candidates[0]?.causeId, 'high_ph_lockout');
});

test('rejects invalid affected-area percentages', () => {
  assert.throws(
    () => assessMurshidPlantStress({
      crop: 'citrus',
      patterns: [],
      affectedPlantPercent: 120
    }),
    RangeError
  );
});

test('never describes heuristic scores as probabilities', () => {
  const result = assessMurshidPlantStress({
    crop: 'citrus',
    patterns: ['leaf_tip_burn'],
    irrigationWaterSalty: true
  });
  assert.ok(result.limitations.some((item) => item.includes('ليست نسب ثقة')));
  assert.ok(result.candidates.every((candidate) => typeof candidate.score === 'number'));
});
