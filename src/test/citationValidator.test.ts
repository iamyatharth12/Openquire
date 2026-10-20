import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateCitations } from '../services/synthesis/citationValidator';
import { NormalizedSearchResult } from '../services/search/types';

describe('Citation Validator Engine', () => {
  const mockSources: NormalizedSearchResult[] = [
    {
      id: 1,
      title: 'Global Energy Transition Report',
      url: 'https://irena.org/report',
      domain: 'irena.org',
      snippet: 'Renewable investments grew by 24% globally.',
      rank: 1,
      retrievalStatus: 'retrieved',
    },
    {
      id: 2,
      title: 'Solar Grid Parity Analysis',
      url: 'https://iea.org/solar',
      domain: 'iea.org',
      snippet: 'Levelized cost of solar electricity declined further.',
      rank: 2,
      retrievalStatus: 'retrieved',
    },
  ];

  it('should validate inline citations matching existing source IDs', () => {
    const text = 'Solar energy adoption expanded rapidly [1]. Recent benchmark data confirms cost parity in major regions [2].';
    const result = validateCitations(text, mockSources);

    assert.strictEqual(result.totalCitations, 2);
    assert.strictEqual(result.validCitations, 2);
    assert.strictEqual(result.invalidCitations, 0);
    assert.strictEqual(result.integrityPercentage, 100);
    assert.deepStrictEqual(result.citedSourceIds, [1, 2]);
  });

  it('should flag and reject hallucinated or unknown citation IDs', () => {
    const text = 'Clean energy investments reached new heights [1], but geothermal projections remain uncertain [99].';
    const result = validateCitations(text, mockSources);

    assert.strictEqual(result.totalCitations, 2);
    assert.strictEqual(result.validCitations, 1);
    assert.strictEqual(result.invalidCitations, 1);
    assert.strictEqual(result.integrityPercentage, 50);
    assert.deepStrictEqual(result.citedSourceIds, [1]);
    assert.strictEqual(result.flaggedErrors.length, 1);
    assert.ok(result.flaggedErrors[0].includes('Source ID 99'));
  });

  it('should handle text with no citations gracefully', () => {
    const text = 'General introduction without any specific statistical assertions.';
    const result = validateCitations(text, mockSources);

    assert.strictEqual(result.totalCitations, 0);
    assert.strictEqual(result.integrityPercentage, 100);
  });
});
