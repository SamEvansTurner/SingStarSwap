/**
 * URL utility functions for safe URL construction
 * Used across multiple services to avoid code duplication
 */

/**
 * Safely construct URL using URL constructor
 * @param base - Base URL (with or without protocol)
 * @param path - Optional path to append
 * @returns Properly formatted URL string
 */
export function buildSafeUrl(base: string, path?: string): string {
  try {
    // Ensure base has protocol
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = 'http://' + base;
    }
    
    if (path) {
      const url = new URL(path, base);
      return url.toString();
    }
    
    return base;
  } catch (e) {
    console.error('Invalid URL construction:', e);
    // Fallback to string concatenation if URL constructor fails
    return path ? base + path : base;
  }
}

/**
 * Sanitize path to prevent directory traversal attacks
 * @param path - File system path to sanitize
 * @returns Sanitized path with traversal attempts removed
 */
export function sanitizePath(path: string): string {
  if (!path) return '';
  
  // Remove directory traversal attempts (../ and ..\)
  let sanitized = path.replace(/\.\.[\/\\]/g, '');
  
  // Remove URL-encoded traversal attempts (%2e%2e/ and %2e%2e\)
  sanitized = sanitized.replace(/%2e%2e[\/\\]/gi, '');
  
  // Ensure path starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }
  
  return sanitized;
}
