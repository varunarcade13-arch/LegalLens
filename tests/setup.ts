import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

process.env.LLM_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  cleanup();
});
