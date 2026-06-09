import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PreviewService } from '../../src/services/preview.service';

// Mock the logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock prisma
vi.mock('../../src/utils/prisma', () => ({
  default: {
    channel: { findUnique: vi.fn() },
    settings: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

// Mock grokConfig
vi.mock('../../src/config', () => ({
  grokConfig: {
    apiKey: 'test-key',
    apiUrl: 'https://api.x.ai',
  },
}));

describe('PreviewService.parseStructuredPreview', () => {
  let service: PreviewService;

  beforeEach(() => {
    service = new PreviewService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CTA normalization', () => {
    it('forces 3 identical CTAs even if Grok returns different', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'line1\nline2\nline3',
        preCta: 'cta?',
        ctaLines: ['A', 'B', 'C']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      const ctas = result.cta.split('\n');
      expect(ctas).toHaveLength(3);
      expect(new Set(ctas).size).toBe(1);
    });

    it('uses first CTA when multiple different provided', () => {
      const rawText = JSON.stringify({
        headline: 'HEADLINE?',
        body: 'body line 1\nbody line 2',
        preCta: 'pre-cta?',
        ctaLines: ['FIRST CTA', 'SECOND CTA', 'THIRD CTA']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.cta).toBe('FIRST CTA\nFIRST CTA\nFIRST CTA');
    });

    it('pads CTA array to 3 items if less than 3 provided', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'body',
        preCta: 'cta?',
        ctaLines: ['ONLY ONE']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      const ctas = result.cta.split('\n');
      expect(ctas).toHaveLength(3);
      expect(ctas.every(cta => cta === 'ONLY ONE')).toBe(true);
    });
  });

  describe('Headline validation', () => {
    it('adds ? to headline if missing', () => {
      const rawText = JSON.stringify({
        headline: 'BLA BLA BLA',
        body: 'line1',
        preCta: 'cta',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toMatch(/\?$/);
    });

    it('adds ? to headline ending with !', () => {
      const rawText = JSON.stringify({
        headline: 'HEADLINE!',
        body: 'body',
        preCta: 'cta',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toMatch(/\?$/);
    });

    it('keeps headline unchanged if already ends with ?', () => {
      const rawText = JSON.stringify({
        headline: 'ALREADY HAS QUESTION?',
        body: 'body',
        preCta: 'cta',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toBe('ALREADY HAS QUESTION?');
    });

    it('keeps headline unchanged if ends with !', () => {
      const rawText = JSON.stringify({
        headline: 'EXCLAMATION!',
        body: 'body',
        preCta: 'cta',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toMatch(/!$/);
    });

    it('uses fallback headline if missing', () => {
      const rawText = JSON.stringify({
        body: 'body content',
        preCta: 'cta?',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toBeTruthy();
    });
  });

  describe('Body splitting', () => {
    it('splits single-line body into multiple lines', () => {
      const rawText = JSON.stringify({
        headline: 'X?',
        body: 'Frase 1. Frase 2. Frase 3.',
        preCta: 'cta',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.body.split('\n').length).toBeGreaterThanOrEqual(2);
    });

    it('splits long body by sentences', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'Primeira frase. Segunda frase. Terceira frase. Quarta frase.',
        preCta: 'cta?',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      const lines = result.body.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('keeps body unchanged if already has line breaks', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'line1\nline2\nline3\nline4',
        preCta: 'cta?',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      const lines = result.body.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('JSON parsing', () => {
    it('strips markdown code blocks', () => {
      const rawText = '```json\n' + JSON.stringify({
        headline: 'TEST?',
        body: 'body',
        preCta: 'cta?',
        ctaLines: ['A', 'A', 'A']
      }) + '\n```';
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toBe('TEST?');
    });

    it('handles plain JSON without code blocks', () => {
      const rawText = JSON.stringify({
        headline: 'PLAIN JSON?',
        body: 'body content',
        preCta: 'cta?',
        ctaLines: ['B', 'B', 'B']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toBe('PLAIN JSON?');
    });

    it('extracts JSON from text with surrounding content', () => {
      const data = JSON.stringify({
        headline: 'EXTRACTED?',
        body: 'body',
        preCta: 'cta?',
        ctaLines: ['C', 'C', 'C']
      });
      const rawText = `Some text before\n${data}\nSome text after`;
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.headline).toBe('EXTRACTED?');
    });
  });

  describe('Pre-CTA handling', () => {
    it('uses preCta from JSON', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'body',
        preCta: 'Quer ver o resto?',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.preCta).toBe('Quer ver o resto?');
    });

    it('uses fallback preCta if missing', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'body',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://t.me/');
      expect(result.preCta).toBeTruthy();
    });
  });

  describe('Button URL', () => {
    it('sets buttonUrl from parameter', () => {
      const rawText = JSON.stringify({
        headline: 'TEST?',
        body: 'body',
        preCta: 'cta?',
        ctaLines: ['A', 'A', 'A']
      });
      const result = (service as any).parseStructuredPreview(rawText, 'http://custom.url/path');
      expect(result.buttonUrl).toBe('http://custom.url/path');
    });
  });
});

describe('PreviewService.formatForTelegram', () => {
  let service: PreviewService;

  beforeEach(() => {
    service = new PreviewService();
  });

  it('formats preview as HTML caption', () => {
    const preview = {
      headline: 'TEST HEADLINE?',
      body: 'body line 1\nbody line 2',
      preCta: 'Want more?',
      cta: 'CTA LINE 1\nCTA LINE 2\nCTA LINE 3',
      buttonText: '',
      buttonUrl: 'http://t.me/test'
    };
    const result = service.formatForTelegram(preview);
    expect(result).toContain('<b>TEST HEADLINE?</b>');
    expect(result).toContain('body line 1');
    expect(result).toContain('<b>Want more?</b>');
    expect(result).toContain('<a href="http://t.me/test">');
  });

  it('includes all CTA lines as links', () => {
    const preview = {
      headline: 'TEST?',
      body: 'body',
      preCta: 'cta?',
      cta: 'LINE 1\nLINE 2\nLINE 3',
      buttonText: '',
      buttonUrl: 'http://example.com'
    };
    const result = service.formatForTelegram(preview);
    const linkCount = (result.match(/<a href/g) || []).length;
    expect(linkCount).toBe(3);
  });
});

describe('PreviewService.buildInlineKeyboard', () => {
  let service: PreviewService;

  beforeEach(() => {
    service = new PreviewService();
  });

  it('creates inline keyboard from CTA lines', () => {
    const preview = {
      headline: 'TEST?',
      body: 'body',
      preCta: 'cta?',
      cta: 'BTN 1\nBTN 2\nBTN 3',
      buttonText: '',
      buttonUrl: 'http://t.me/link'
    };
    const result = service.buildInlineKeyboard(preview);
    expect(result.inline_keyboard).toHaveLength(3);
    expect(result.inline_keyboard[0][0].text).toBe('BTN 1');
    expect(result.inline_keyboard[0][0].url).toBe('http://t.me/link');
  });
});