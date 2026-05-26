import { describe, it, expect } from 'vitest';
import { parseRiskAnalysis } from './analysis.service';

describe('parseRiskAnalysis', () => {
  it('splits both sections when headers appear in order', () => {
    const text =
      '[Original Contract Description]\nThis is a lease agreement.\n[Risk Analysis]\nClause 5 is risky.';
    const result = parseRiskAnalysis(text);
    expect(result.originalContractDescription).toBe('This is a lease agreement.');
    expect(result.riskAnalysis).toBe('Clause 5 is risky.');
  });

  it('handles markdown-prefixed headers (## [..])', () => {
    const text = '## [Original Contract Description]\nDesc body\n## [Risk Analysis]\nRisk body';
    const result = parseRiskAnalysis(text);
    expect(result.originalContractDescription).toBe('Desc body');
    expect(result.riskAnalysis).toBe('Risk body');
  });

  it('handles reversed order (risk before description)', () => {
    const text = '[Risk Analysis]\nRisk body\n[Original Contract Description]\nDesc body';
    const result = parseRiskAnalysis(text);
    expect(result.originalContractDescription).toBe('Desc body');
    expect(result.riskAnalysis).toBe('Risk body');
  });

  it('treats text before a lone risk header as the description', () => {
    const text = 'Some preamble.\n[Risk Analysis]\nRisk body';
    const result = parseRiskAnalysis(text);
    expect(result.originalContractDescription).toBe('Some preamble.');
    expect(result.riskAnalysis).toBe('Risk body');
  });

  it('returns empty risk when only the description header is present', () => {
    const text = '[Original Contract Description]\nOnly a description here';
    const result = parseRiskAnalysis(text);
    expect(result.originalContractDescription).toBe('Only a description here');
    expect(result.riskAnalysis).toBe('');
  });

  it('falls back to treating the whole text as risk analysis when no headers', () => {
    const text = 'Just a plain blob of analysis with no headers.';
    const result = parseRiskAnalysis(text);
    expect(result.originalContractDescription).toBe('');
    expect(result.riskAnalysis).toBe(text);
  });
});
