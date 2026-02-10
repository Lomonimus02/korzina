/**
 * Utility functions for Sandpack error handling
 * Extracted from code-viewer.tsx for testability
 */

/**
 * Check if an error message is related to network issues
 * These errors should be suppressed as they are transient
 */
export function isNetworkError(message: string): boolean {
  const networkErrorPatterns = [
    'failed to fetch',
    'networkerror',
    'network error',
    'load failed',
    'aborted',
    'timeout',
    'etimedout',
    'econnrefused',
    'enotfound',
    'socket hang up',
    'fetch error',
    'cors',
    'net::',
    'err_',
  ];
  const lowerMessage = message.toLowerCase();
  return networkErrorPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Check if error is related to null document access
 * This is a common Sandpack internal error that occurs during iframe transitions
 * and should be suppressed
 */
export function isDocumentNullError(message: string): boolean {
  const documentNullPatterns = [
    'cannot read properties of null',
    "reading 'document'",
    'null (reading',
    'document is null',
    'document is undefined',
  ];
  const lowerMessage = message.toLowerCase();
  return documentNullPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Check if error is related to read-only property assignment
 * This occurs when trying to modify frozen Error objects in Sandpack
 * Common error: "Cannot assign to read only property 'message' of object 'SyntaxError'"
 */
export function isReadOnlyPropertyError(message: string): boolean {
  const readOnlyPatterns = [
    'cannot assign to read only property',
    'read only property',
    'readonly property',
    "cannot set property",
    'object is not extensible',
  ];
  const lowerMessage = message.toLowerCase();
  return readOnlyPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Check if error is a syntax error from incomplete/truncated code
 * These errors are expected during streaming and should be suppressed
 */
export function isSyntaxErrorFromIncompleteCode(message: string): boolean {
  const syntaxPatterns = [
    'unterminated jsx',
    'unexpected token',
    'expected "jsxtagend"',
    'unexpected end of input',
    'expected expression',
    'missing initializer',
    'unterminated string',
    'unterminated template',
  ];
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('syntaxerror') && 
    syntaxPatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Combined check if any error should be suppressed
 * Use this for comprehensive error filtering
 */
export function shouldSuppressError(message: string): boolean {
  return isNetworkError(message) || 
         isDocumentNullError(message) || 
         isReadOnlyPropertyError(message) ||
         isSyntaxErrorFromIncompleteCode(message);
}

/**
 * Check if an element is owned by Sandpack (preview iframe, layout elements, etc.)
 * These elements should NEVER be removed by error overlay suppression logic
 */
export function isSandpackElement(el: Element): boolean {
  if (!el) return true; // Treat null as protected to be safe
  
  // Check for Sandpack-specific attributes and classes
  const className = el.className || '';
  const id = el.id || '';
  const src = el.getAttribute?.('src') || '';
  
  // Check for data attributes containing 'sandpack'
  const dataAttributes = Array.from(el.attributes || []).some(attr => 
    attr.name.startsWith('data-') && attr.value.includes('sandpack')
  );
  
  // Sandpack preview iframes and components have specific patterns
  if (
    className.includes('sandpack') ||
    className.includes('sp-') ||
    id.includes('sandpack') ||
    src.includes('sandpack') ||
    src.includes('csb') ||
    dataAttributes ||
    el.closest?.('[class*="sandpack"]') ||
    el.closest?.('[class*="sp-"]')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Error suppression script to inject into Sandpack preview
 * This script runs inside the Sandpack iframe and suppresses document null errors
 */
export const ERROR_SUPPRESSION_SCRIPT = `
// Error overlay suppression - runs immediately
(function suppressErrorOverlay() {
  // Guard: ensure document exists before proceeding
  if (typeof document === 'undefined' || !document) return;
  
  // CSS injection - with null check
  if (document.head) {
    var style = document.createElement('style');
    style.textContent = 'body > iframe[style*="position: fixed"]:not([class*="sp-"]):not([class*="sandpack"]), body > iframe[style*="z-index"]:not([class*="sp-"]):not([class*="sandpack"]), iframe[style*="z-index: 2147483646"]:not([class*="sp-"]), iframe[style*="z-index: 2147483647"]:not([class*="sp-"]) { display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important; }';
    document.head.appendChild(style);
  }
  
  // Helper: Check if element is Sandpack-owned (should NOT be removed)
  function isSandpackElement(el) {
    if (!el) return true; // Treat null as protected
    var cls = el.className || '';
    var src = el.getAttribute && el.getAttribute('src') || '';
    return cls.includes('sp-') || cls.includes('sandpack') || src.includes('sandpack') || src.includes('csb');
  }
  
  // Remove existing overlays - but protect Sandpack iframes
  function removeOverlays() {
    if (!document.body) return;
    document.querySelectorAll('body > iframe').forEach(function(el) {
      if (isSandpackElement(el)) return; // CRITICAL: Protect Sandpack
      var s = el.getAttribute('style') || '';
      if (s.includes('fixed') && s.includes('z-index')) el.remove();
    });
  }
  
  // Watch for new overlays - only if body exists
  if (document.body) {
    var obs = new MutationObserver(removeOverlays);
    obs.observe(document.body, { childList: true });
    setInterval(removeOverlays, 100);
    removeOverlays();
  }
  
  // Suppress specific error events related to document access
  window.addEventListener('error', function(e) {
    if (e.message && (
      e.message.includes('document') ||
      e.message.includes('Cannot read properties of null') ||
      e.message.includes('null (reading')
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return false;
    }
  }, true);
  
  // Also suppress unhandled rejections related to document
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && (
      e.reason.message.includes('document') ||
      e.reason.message.includes('Cannot read properties of null')
    )) {
      e.preventDefault();
      return false;
    }
  }, true);
})();
`;
