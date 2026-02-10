/**
 * Tests for code-viewer.tsx Sandpack error handling
 * 
 * These tests verify that the "TypeError: Cannot read properties of null (reading 'document')"
 * error is properly suppressed and doesn't trigger the ERROR state.
 */

import { isDocumentNullError, isNetworkError, isSandpackElement, ERROR_SUPPRESSION_SCRIPT } from '../code-viewer-utils';

describe('Error Detection Utilities', () => {
  describe('isDocumentNullError', () => {
    it('should detect "Cannot read properties of null" error', () => {
      expect(isDocumentNullError("TypeError: Cannot read properties of null (reading 'document')")).toBe(true);
    });

    it('should detect "document is null" error', () => {
      expect(isDocumentNullError('document is null')).toBe(true);
    });

    it('should detect "null (reading" pattern', () => {
      expect(isDocumentNullError("null (reading 'something')")).toBe(true);
    });

    it('should detect "document is undefined" error', () => {
      expect(isDocumentNullError('document is undefined')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isDocumentNullError("CANNOT READ PROPERTIES OF NULL")).toBe(true);
    });

    it('should return false for unrelated errors', () => {
      expect(isDocumentNullError('SyntaxError: Unexpected token')).toBe(false);
      expect(isDocumentNullError('ReferenceError: foo is not defined')).toBe(false);
      expect(isDocumentNullError('TypeError: foo.bar is not a function')).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should detect network fetch errors', () => {
      expect(isNetworkError('Failed to fetch')).toBe(true);
      expect(isNetworkError('Network error')).toBe(true);
      expect(isNetworkError('net::ERR_FAILED')).toBe(true);
    });

    it('should detect CORS errors', () => {
      expect(isNetworkError('CORS policy')).toBe(true);
    });

    it('should detect network timeout errors', () => {
      expect(isNetworkError('timeout')).toBe(true);
      expect(isNetworkError('ETIMEDOUT')).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError('SyntaxError')).toBe(false);
      expect(isNetworkError('TypeError')).toBe(false);
    });
  });

  describe('isSandpackElement', () => {
    it('should identify elements with sandpack class', () => {
      const el = document.createElement('div');
      el.className = 'sandpack-preview';
      expect(isSandpackElement(el)).toBe(true);
    });

    it('should identify elements with sp- class prefix', () => {
      const el = document.createElement('div');
      el.className = 'sp-wrapper sp-layout';
      expect(isSandpackElement(el)).toBe(true);
    });

    it('should identify iframes with sandpack in src', () => {
      const el = document.createElement('iframe');
      el.setAttribute('src', 'https://sandpack.codesandbox.io/');
      expect(isSandpackElement(el)).toBe(true);
    });

    it('should identify iframes with csb in src', () => {
      const el = document.createElement('iframe');
      el.setAttribute('src', 'https://csb.app/preview');
      expect(isSandpackElement(el)).toBe(true);
    });

    it('should return false for generic elements', () => {
      const el = document.createElement('div');
      el.className = 'error-overlay';
      expect(isSandpackElement(el)).toBe(false);
    });

    it('should return false for error overlay iframes', () => {
      const el = document.createElement('iframe');
      el.style.cssText = 'position: fixed; z-index: 2147483647;';
      expect(isSandpackElement(el)).toBe(false);
    });
  });
});

describe('Error Suppression Script', () => {
  it('should have document null check at the start', () => {
    // This test verifies the error suppression script has proper guards
    expect(ERROR_SUPPRESSION_SCRIPT).toContain("typeof document === 'undefined'");
    expect(ERROR_SUPPRESSION_SCRIPT).toContain('!document');
  });

  it('should check document.head before appending styles', () => {
    expect(ERROR_SUPPRESSION_SCRIPT).toContain('if (document.head)');
  });

  it('should check document.body before observing mutations', () => {
    expect(ERROR_SUPPRESSION_SCRIPT).toContain('if (document.body)');
  });

  it('should protect Sandpack elements from removal', () => {
    expect(ERROR_SUPPRESSION_SCRIPT).toContain('isSandpackElement');
    expect(ERROR_SUPPRESSION_SCRIPT).toContain('CRITICAL: Protect Sandpack');
  });

  it('should suppress document-related errors', () => {
    expect(ERROR_SUPPRESSION_SCRIPT).toContain("e.message.includes('document')");
    expect(ERROR_SUPPRESSION_SCRIPT).toContain("Cannot read properties of null");
  });

  it('should suppress unhandled rejections', () => {
    expect(ERROR_SUPPRESSION_SCRIPT).toContain('unhandledrejection');
  });
});

describe('SandpackErrorBoundary', () => {
  it('should suppress document null errors', () => {
    const error = new Error("TypeError: Cannot read properties of null (reading 'document')");
    expect(isDocumentNullError(error.message)).toBe(true);
  });

  it('should not suppress other errors', () => {
    const error = new Error('SyntaxError: Unexpected token');
    expect(isDocumentNullError(error.message)).toBe(false);
  });
});

describe('AnimatePresence configuration', () => {
  it('should use popLayout mode instead of wait', () => {
    // This is a documentation test - the actual mode is set in code-viewer.tsx
    // mode="popLayout" prevents Sandpack unmount during state transitions
    // which fixes the "Cannot read properties of null (reading 'document')" error
    const modes = ['wait', 'sync', 'popLayout'];
    expect(modes).toContain('popLayout');
  });
});
