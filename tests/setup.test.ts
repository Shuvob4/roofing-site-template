import { describe, it, expect } from 'vitest';

describe('Test framework setup', () => {
  it('should run a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support happy-dom environment', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello, Vitest!';
    document.body.appendChild(div);

    expect(document.body.innerHTML).toContain('Hello, Vitest!');

    document.body.removeChild(div);
  });

  it('should support async operations', async () => {
    const result = await Promise.resolve('resolved');
    expect(result).toBe('resolved');
  });
});
