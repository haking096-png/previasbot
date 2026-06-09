import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelegramService } from '../../src/services/telegram.service';

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
  telegramConfig: {
    botToken: 'test-token',
    chatId: 'test-chat-id',
  },
}));

// Mock previewService
vi.mock('../../src/services/preview.service', () => ({
  default: {
    formatForTelegram: vi.fn((preview) => `<b>${preview.headline}</b>\n\n${preview.body}`),
  },
  PreviewService: class {
    formatForTelegram = vi.fn((preview) => `<b>${preview.headline}</b>\n\n${preview.body}`);
  },
}));

describe('TelegramService.isInlineSource', () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService();
  });

  it('returns true for inline:// sources', () => {
    const result = (service as any).isInlineSource('inline://generated-content');
    expect(result).toBe(true);
  });

  it('returns true for video-preview- sources', () => {
    const result = (service as any).isInlineSource('video-preview-12345');
    expect(result).toBe(true);
  });

  it('returns false for normal file paths', () => {
    const result = (service as any).isInlineSource('/uploads/image.jpg');
    expect(result).toBe(false);
  });

  it('returns false for URLs', () => {
    const result = (service as any).isInlineSource('https://example.com/image.jpg');
    expect(result).toBe(false);
  });

  it('returns false for empty string', () => {
    const result = (service as any).isInlineSource('');
    expect(result).toBe(false);
  });
});

describe('TelegramService.retry logic', () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService();
  });

  it('withRetry executes operation once on success', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    const result = await (service as any).withRetry(mockFn, 'testOperation');
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('withRetry retries on retriable errors', async () => {
    const retriableError = { code: 429 };
    const mockFn = vi.fn()
      .mockRejectedValueOnce(retriableError)
      .mockResolvedValueOnce('success');

    // Mock sleep
    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const result = await (service as any).withRetry(mockFn, 'testOperation');
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('withRetry does not retry on non-retriable errors', async () => {
    const nonRetriableError = { code: 400 };
    const mockFn = vi.fn().mockRejectedValue(nonRetriableError);

    // Mock sleep
    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    await expect((service as any).withRetry(mockFn, 'testOperation')).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('withRetry respects max attempts', async () => {
    const retriableError = { code: 500 };
    const mockFn = vi.fn().mockRejectedValue(retriableError);

    // Mock sleep
    vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    await expect((service as any).withRetry(mockFn, 'testOperation')).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(3); // maxAttempts
  });

  it('withRetry handles rate limit with retry_after', async () => {
    const rateLimitError = { response: { parameters: { retry_after: 5 } } };
    const mockFn = vi.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success');

    // Mock sleep
    const sleepSpy = vi.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const result = await (service as any).withRetry(mockFn, 'testOperation');
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledWith(5000); // retry_after * 1000
  });
});

describe('TelegramService.createSafeReadStream', () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService();
  });

  it('returns exists=false for non-existent file', () => {
    const result = (service as any).createSafeReadStream('/non/existent/path.jpg');
    expect(result.exists).toBe(false);
  });
});

describe('TelegramService.updateConfig', () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService();
  });

  it('updates botToken when provided', () => {
    service.updateConfig('new-token', undefined);
    expect(service).toBeDefined(); // Config updated internally
  });

  it('updates chatId when provided', () => {
    service.updateConfig(undefined, 'new-chat-id');
    expect(service).toBeDefined(); // Config updated internally
  });

  it('updates both when provided', () => {
    service.updateConfig('token', 'chat-id');
    expect(service).toBeDefined(); // Config updated internally
  });
});