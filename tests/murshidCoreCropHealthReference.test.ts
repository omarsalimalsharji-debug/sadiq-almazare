import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MURSHID_CORE_CROP_HEALTH,
  MURSHID_CORE_REFERENCE_SOURCES,
  getMurshidCoreReferenceById,
  getMurshidCoreReferencesByCrop
} from '../src/data/murshidCoreCropHealthReference.ts';

test('regional crop-health library has unique stable IDs and resolvable sources', () => {
  const ids = MURSHID_CORE_CROP_HEALTH.map((record) => record.id);
  assert.equal(new Set(ids).size, ids.length, 'record IDs must be unique');

  const sourceIds = new Set<string>(MURSHID_CORE_REFERENCE_SOURCES.map((source) => source.id));
  for (const record of MURSHID_CORE_CROP_HEALTH) {
    assert.ok(record.sourceIds.length > 0, record.id);
    for (const sourceId of record.sourceIds) {
      assert.ok(sourceIds.has(sourceId), `unknown source ${sourceId} in ${record.id}`);
    }
    assert.ok(record.diagnosticClues.length >= 2, record.id);
    assert.ok(record.lookalikes.length >= 1, record.id);
    assert.ok(record.confirmation.length >= 1, record.id);
    assert.ok(record.imageRequirements.length >= 1, record.id);
    assert.ok(record.regionalOccurrences.length >= 1, record.id);
  }
});

test('date-palm and citrus reference retrieval is crop-specific', () => {
  const datePalm = getMurshidCoreReferencesByCrop('date-palm');
  const citrus = getMurshidCoreReferencesByCrop('citrus');
  assert.equal(datePalm.length, 6);
  assert.equal(citrus.length, 8);
  assert.ok(datePalm.every((record) => record.cropId === 'date-palm'));
  assert.ok(citrus.every((record) => record.cropId === 'citrus'));
});

test('lookup returns a differential reference, not a fabricated result', () => {
  assert.equal(getMurshidCoreReferenceById('citrus-canker')?.scientificName, 'Xanthomonas citri subsp. citri');
  assert.equal(getMurshidCoreReferenceById('not-a-real-record'), undefined);
});

test('high-consequence records include explicit uncertainty and confirmation requirements', () => {
  for (const id of ['dp-fusarium-wilt-bayoud', 'citrus-huanglongbing', 'citrus-canker']) {
    const record = getMurshidCoreReferenceById(id);
    assert.ok(record);
    assert.ok(record.confirmation.length > 0);
    assert.ok(record.diagnosisLimitations.length > 0);
    assert.ok(record.urgentFlags.length > 0);
  }
});
