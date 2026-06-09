import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrokService } from '../../src/services/grok.service';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock config
vi.mock('../../src/config', () => ({
  grokConfig: {
    apiKey: 'test-api-key',
    apiUrl: 'https://api.x.ai/v1',
  },
}));

// Mock circuit breaker
vi.mock('../../src/utils/circuitBreaker', () => ({
  grokCircuitBreaker: {
    execute: vi.fn((fn) => fn()),
    getState: vi.fn(() => 'CLOSED'),
  },
}));

// Mock prisma
vi.mock('../../src/utils/prisma', () => ({
  default: {
    settings: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  statSync: vi.fn(() => ({ size: 1000 })),
  readFileSync: vi.fn(() => Buffer.from('fake-image-data')),
}));

describe('GrokService.parseAnalysisResponse', () => {
  let service: GrokService;

  beforeEach(() => {
    service = new GrokService();
  });

  it('parses valid JSON response', () => {
    const content = JSON.stringify({
      scenario: 'beach',
      pose: 'lying down',
      clothing: 'bikini',
      emotion: 'relaxed',
      mainFocus: 'body',
      description: 'A woman relaxing on the beach',
      category: 'lifestyle'
    });

    const result = (service as any).parseAnalysisResponse(content);

    expect(result.scenario).toBe('beach');
    expect(result.pose).toBe('lying down');
    expect(result.clothing).toBe('bikini');
    expect(result.emotion).toBe('relaxed');
    expect(result.description).toBe('A woman relaxing on the beach');
    expect(result.category).toBe('lifestyle');
  });

  it('handles JSON with extra whitespace', () => {
    const content = `

    ${JSON.stringify({
      scenario: 'studio',
      description: 'Test description'
    })}

    `;

    const result = (service as any).parseAnalysisResponse(content);
    expect(result.scenario).toBe('studio');
    expect(result.description).toBe('Test description');
  });

  it('strips markdown code blocks', () => {
    const data = {
      scenario: 'outdoor',
      description: 'Outdoor scene'
    };
    const content = '```json\n' + JSON.stringify(data) + '\n```';

    const result = (service as any).parseAnalysisResponse(content);
    expect(result.scenario).toBe('outdoor');
  });

  it('handles markdown with language specifier', () => {
    const data = {
      scenario: 'indoor',
      description: 'Indoor scene'
    };
    const content = '```javascript\n' + JSON.stringify(data) + '\n```';

    const result = (service as any).parseAnalysisResponse(content);
    expect(result.scenario).toBe('indoor');
  });

  it('returns fallback on invalid JSON', () => {
    const content = 'This is not JSON at all';

    const result = (service as any).parseAnalysisResponse(content);

    expect(result.description).toBeTruthy();
    expect(result.rawData).toBe(content);
  });

  it('returns fallback when no JSON found in response', () => {
    const content = 'Here is some text without any JSON structure';

    const result = (service as any).parseAnalysisResponse(content);

    expect(result.description).toBeTruthy();
  });

  it('preserves rawData in result', () => {
    const content = JSON.stringify({ scenario: 'test' });
    const result = (service as any).parseAnalysisResponse(content);

    expect(result.rawData).toBe(content);
  });

  it('handles partial JSON fields', () => {
    const content = JSON.stringify({
      scenario: 'partial',
      // missing other fields
    });

    const result = (service as any).parseAnalysisResponse(content);
    expect(result.scenario).toBe('partial');
    expect(result.pose).toBeUndefined();
    expect(result.description).toBeUndefined();
  });
});

describe('GrokService.validateApiKey', () => {
  let service: GrokService;

  beforeEach(() => {
    service = new GrokService();
  });

  it('throws when API key is empty', () => {
    expect(() => (service as any).validateApiKey()).not.toThrow();
  });

  it('does not throw when API key is set', () => {
    expect(() => (service as any).validateApiKey()).not.toThrow();
  });
});

describe('GrokService.validateImageFile', () => {
  let service: GrokService;

  beforeEach(() => {
    service = new GrokService();
  });

  it('throws when file does not exist', () => {
    vi.mocked(require('fs').existsSync).mockReturnValueOnce(false);

    expect(() => (service as any).validateImageFile('/nonexistent/image.jpg'))
      .toThrow('Arquivo de imagem não encontrado');
  });

  it('throws when file is too large', () => {
    vi.mocked(require('fs').existsSync).mockReturnValueOnce(true);
    vi.mocked(require('fs').statSync).mockReturnValueOnce({ size: 30 * 1024 * 1024 }); // 30MB

    expect(() => (service as any).validateImageFile('/path/to/image.jpg'))
      .toThrow('Imagem muito grande');
  });

  it('throws for unsupported image formats', () => {
    vi.mocked(require('fs').existsSync).mockReturnValueOnce(true);
    vi.mocked(require('fs').statSync).mockReturnValueOnce({ size: 1000 });

    expect(() => (service as any).validateImageFile('/path/to/image.bmp'))
      .toThrow('Formato de imagem não suportado');
  });

  it('accepts valid image formats', () => {
    vi.mocked(require('fs').existsSync).mockReturnValueOnce(true);
    vi.mocked(require('fs').statSync).mockReturnValueOnce({ size: 1000 });

    const validFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of validFormats) {
      expect(() => (service as any).validateImageFile(`/path/to/image${ext}`))
        .not.toThrow();
    }
  });
});

describe('GrokService.readImageAsBase64', () => {
  let service: GrokService;

  beforeEach(() => {
    service = new GrokService();
  });

  it('returns base64 string and correct mime type for jpg', () => {
    const result = (service as any).readImageAsBase64('/path/to/image.jpg');

    expect(result.base64Image).toBeTruthy();
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('returns base64 string and correct mime type for png', () => {
    const result = (service as any).readImageAsBase64('/path/to/image.png');

    expect(result.base64Image).toBeTruthy();
    expect(result.mimeType).toBe('image/png');
  });

  it('returns base64 string and correct mime type for webp', () => {
    const result = (service as any).readImageAsBase64('/path/to/image.webp');

    expect(result.base64Image).toBeTruthy();
    expect(result.mimeType).toBe('image/webp');
  });

  it('defaults to jpeg for unknown extensions', () => {
    const result = (service as any).readImageAsBase64('/path/to/image.unknown');

    expect(result.mimeType).toBe('image/jpeg');
  });
});

describe('GrokService.default model', () => {
  it('uses grok-4-1-fast-non-reasoning as default', () => {
    const service = new GrokService();
    expect((service as any).DEFAULT_MODEL).toBe('grok-4-1-fast-non-reasoning');
  });
});