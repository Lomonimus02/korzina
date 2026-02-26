/**
 * Result of JSX/TSX syntax validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  isComplete: boolean; // Whether the code appears complete (not mid-stream)
}

/**
 * Validates JSX/TSX syntax by checking balanced brackets, tags, and strings
 * This is a fast heuristic check - not a full AST parse
 */
export function validateJsxSyntax(code: string): ValidationResult {
  const errors: string[] = [];
  
  // Track bracket balance
  const brackets: { char: string; line: number }[] = [];
  const bracketPairs: Record<string, string> = { '{': '}', '(': ')', '[': ']', '<': '>' };
  const closingBrackets: Record<string, string> = { '}': '{', ')': '(', ']': '[', '>': '<' };
  
  // Track string state
  let inString: string | null = null;
  let inTemplate = false;
  let templateDepth = 0;
  let inComment = false;
  let inMultiLineComment = false;
  let inJsxTag = false;
  let jsxTagName = '';
  
  // Track JSX tag stack for proper nesting
  const jsxTagStack: string[] = [];
  
  // Track line numbers for error reporting
  let line = 1;
  let col = 0;
  
  // Self-closing HTML/JSX tags that don't need closing
  const selfClosingTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || '';
    const prevChar = code[i - 1] || '';
    
    // Track line numbers
    if (char === '\n') {
      line++;
      col = 0;
      inComment = false; // Single-line comment ends
      continue;
    }
    col++;
    
    // Handle multi-line comments
    if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i++; // Skip /
      }
      continue;
    }
    
    // Check for comment start
    if (!inString && !inTemplate && char === '/') {
      if (nextChar === '/') {
        inComment = true;
        continue;
      }
      if (nextChar === '*') {
        inMultiLineComment = true;
        i++; // Skip *
        continue;
      }
    }
    
    // Skip if in comment
    if (inComment) continue;
    
    // Handle strings
    if (!inTemplate && (char === '"' || char === "'" || char === '`')) {
      if (inString === null) {
        if (char === '`') {
          inTemplate = true;
          templateDepth = 1;
        } else {
          inString = char;
        }
      } else if (char === inString && prevChar !== '\\') {
        inString = null;
      }
      continue;
    }
    
    // Handle template literals with ${} expressions
    if (inTemplate) {
      if (char === '`' && prevChar !== '\\') {
        templateDepth--;
        if (templateDepth === 0) {
          inTemplate = false;
        }
      } else if (char === '$' && nextChar === '{') {
        // Enter expression in template
      }
      continue;
    }
    
    // Skip if in string
    if (inString) continue;
    
    // Track JSX tags
    if (char === '<') {
      // Check if it's a JSX tag (not comparison operator)
      const afterLt = code.slice(i + 1, i + 50);
      const jsxMatch = afterLt.match(/^(\/?)\s*([A-Za-z_][A-Za-z0-9_]*|[a-z][a-z0-9-]*)/);
      
      if (jsxMatch) {
        const isClosing = jsxMatch[1] === '/';
        const tagName = jsxMatch[2];
        
        if (isClosing) {
          // Closing tag
          if (jsxTagStack.length > 0) {
            const expected = jsxTagStack[jsxTagStack.length - 1];
            if (expected.toLowerCase() !== tagName.toLowerCase()) {
              errors.push(`Line ${line}: Expected closing tag </${expected}> but found </${tagName}>`);
            } else {
              jsxTagStack.pop();
            }
          } else {
            errors.push(`Line ${line}: Unexpected closing tag </${tagName}> with no matching opening tag`);
          }
        } else {
          // Opening tag - we'll check for self-closing when we see /> or >
          inJsxTag = true;
          jsxTagName = tagName;
        }
      } else {
        // It's a comparison operator, track as bracket
        brackets.push({ char: '<', line });
      }
      continue;
    }
    
    // Handle JSX tag end
    if (inJsxTag && char === '>') {
      if (prevChar === '/') {
        // Self-closing tag like <Component />
        inJsxTag = false;
        jsxTagName = '';
      } else {
        // Opening tag ends - push to stack unless it's a self-closing HTML tag
        if (!selfClosingTags.has(jsxTagName.toLowerCase())) {
          jsxTagStack.push(jsxTagName);
        }
        inJsxTag = false;
        jsxTagName = '';
      }
      continue;
    }
    
    // Track other brackets (but not > when it's part of JSX)
    if (char in bracketPairs && char !== '<') {
      brackets.push({ char, line });
    } else if (char in closingBrackets && char !== '>') {
      const expected = closingBrackets[char];
      if (brackets.length === 0 || brackets[brackets.length - 1].char !== expected) {
        const lastBracket = brackets.length > 0 ? brackets[brackets.length - 1] : null;
        errors.push(`Line ${line}: Unexpected '${char}', expected '${lastBracket ? bracketPairs[lastBracket.char] : 'none'}'`);
      } else {
        brackets.pop();
      }
    }
  }
  
  // Check for unclosed structures
  if (inString) {
    errors.push(`Unterminated string literal (started with ${inString})`);
  }
  
  if (inTemplate) {
    errors.push('Unterminated template literal');
  }
  
  if (inMultiLineComment) {
    errors.push('Unterminated multi-line comment');
  }
  
  // Check unclosed brackets
  for (const bracket of brackets) {
    errors.push(`Line ${bracket.line}: Unclosed '${bracket.char}'`);
  }
  
  // Check unclosed JSX tags
  for (const tag of jsxTagStack) {
    errors.push(`Unclosed JSX tag <${tag}>`);
  }
  
  // Determine if code looks complete
  const trimmedCode = code.trim();
  const looksComplete = 
    !inString && 
    !inTemplate && 
    !inMultiLineComment &&
    brackets.length === 0 &&
    jsxTagStack.length === 0 &&
    !trimmedCode.endsWith('{') &&
    !trimmedCode.endsWith('(') &&
    !trimmedCode.endsWith('<') &&
    !trimmedCode.endsWith(',') &&
    !trimmedCode.endsWith(':') &&
    !trimmedCode.endsWith('?') &&
    !trimmedCode.endsWith('&&') &&
    !trimmedCode.endsWith('||') &&
    !trimmedCode.endsWith('=>') &&
    !trimmedCode.endsWith('return');

  return {
    isValid: errors.length === 0,
    errors,
    isComplete: looksComplete
  };
}

/**
 * Quick check if code has balanced basic brackets (faster than full validation)
 */
export function hasBalancedBrackets(code: string): boolean {
  // Remove strings and comments first
  const cleaned = code
    .replace(/\/\/.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""') // Replace double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''") // Replace single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '``'); // Replace template literals (simplified)
  
  let curly = 0;
  let paren = 0;
  let square = 0;
  
  for (const char of cleaned) {
    switch (char) {
      case '{': curly++; break;
      case '}': curly--; break;
      case '(': paren++; break;
      case ')': paren--; break;
      case '[': square++; break;
      case ']': square--; break;
    }
    // Early exit if we go negative (more closers than openers)
    if (curly < 0 || paren < 0 || square < 0) return false;
  }
  
  return curly === 0 && paren === 0 && square === 0;
}

/**
 * Attempts to detect common incomplete code patterns
 */
export function detectIncompletePatterns(code: string): string[] {
  const issues: string[] = [];
  const trimmed = code.trim();
  
  // Check for incomplete return statements
  if (/return\s*$/.test(trimmed)) {
    issues.push('Incomplete return statement');
  }
  
  // Check for incomplete arrow functions
  if (/=>\s*$/.test(trimmed)) {
    issues.push('Incomplete arrow function');
  }
  
  // Check for incomplete ternary operators
  const ternaryStarts = (trimmed.match(/\?(?![?.:])/g) || []).length;
  const ternaryColons = (trimmed.match(/:(?!:)/g) || []).length;
  // This is a rough heuristic - ternaries need roughly equal ? and : (outside of types)
  if (ternaryStarts > ternaryColons + 1) {
    issues.push('Possibly incomplete ternary operator');
  }
  
  // Check for incomplete .map(), .filter(), etc.
  if (/\.(map|filter|reduce|forEach|find|some|every)\s*\(\s*[^)]*$/.test(trimmed)) {
    issues.push('Incomplete array method callback');
  }
  
  // Check for incomplete object/array literals at end
  if (/[{[]\s*$/.test(trimmed)) {
    issues.push('Incomplete object or array literal');
  }
  
  // Check for dangling operators
  if (/[+\-*/%&|^]=?\s*$/.test(trimmed) && !/[+-]{2}\s*$/.test(trimmed)) {
    issues.push('Dangling operator');
  }
  
  // Check for incomplete className strings
  if (/className=["'`][^"'`]*$/.test(trimmed)) {
    issues.push('Incomplete className string');
  }
  
  return issues;
}

/**
 * Enhanced validation specifically for App.tsx files
 * App.tsx has stricter requirements as it's the main entry point
 */
export function validateAppTsx(code: string): ValidationResult {
  const baseValidation = validateJsxSyntax(code);
  const incompletePatterns = detectIncompletePatterns(code);
  const errors = [...baseValidation.errors, ...incompletePatterns];
  
  const trimmed = code.trim();
  
  // App.tsx MUST have a default export
  if (!/(export\s+default\s+(function|class|const|let|var|\())|export\s*\{\s*[^}]*\s+as\s+default\s*\}/.test(code)) {
    errors.push('App.tsx must have a default export');
  }
  
  // Check if the default export function/component is complete
  // Look for 'export default function' and ensure it has a closing brace
  const exportDefaultMatch = code.match(/export\s+default\s+function\s+\w+\s*\([^)]*\)/);
  if (exportDefaultMatch) {
    // Count braces after the function declaration
    const afterExport = code.slice(code.indexOf(exportDefaultMatch[0]) + exportDefaultMatch[0].length);
    let braceCount = 0;
    let foundOpenBrace = false;
    
    for (const char of afterExport) {
      if (char === '{') {
        foundOpenBrace = true;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }
    }
    
    if (foundOpenBrace && braceCount > 0) {
      errors.push('Default export function body is incomplete');
    }
  }
  
  // Check for truncated JSX - specific patterns that indicate mid-generation cutoff
  // These are patterns that specifically appear at the END of truncated code
  const lastLine = trimmed.split('\n').pop()?.trim() || '';
  const truncatedEndPatterns = [
    /className="[^"]*$/,              // className with unclosed quote
    /style=\{\{[^}]*$/,               // inline style unclosed
    /<\/\s*$/,                        // incomplete closing tag </
    /=\s*$/,                          // ends with assignment
    /,\s*$/,                          // ends with comma (object/array)
    /<[A-Z][a-zA-Z]*\s+[a-z]+=$/,     // component tag with incomplete prop
  ];
  
  for (const pattern of truncatedEndPatterns) {
    if (pattern.test(lastLine)) {
      errors.push('JSX appears truncated - common AI streaming error');
      break;
    }
  }
  
  // Verify return statement returns JSX (for React components)
  const hasReturn = /return\s*\([\s\S]*\)/.test(code) || /return\s*</.test(code);
  const hasExportWithJsx = /export\s+default\s+function[\s\S]*return[\s\S]*[<(]/.test(code);
  
  if (!hasReturn && !hasExportWithJsx && code.includes('export default function')) {
    // Component declared but no return with JSX detected
    if (!/return\s+null/.test(code) && !/return\s+undefined/.test(code)) {
      errors.push('Component may be missing return statement with JSX');
    }
  }
  
  const isComplete = baseValidation.isComplete && 
    incompletePatterns.length === 0 &&
    !truncatedEndPatterns.some(p => p.test(lastLine));
  
  return {
    isValid: errors.length === 0,
    errors,
    isComplete
  };
}

export interface ParsedFiles {
  files: Record<string, string>;
  validFiles: Record<string, string>;
  fileValidation: Record<string, ValidationResult>;
}

/**
 * Parse XML to files with validation
 * Returns both raw files and only valid files
 */
export function parseXmlToFilesWithValidation(
  content: string,
  currentFiles: Record<string, string>
): ParsedFiles {
  const files: Record<string, string> = { ...currentFiles };
  const validFiles: Record<string, string> = { ...currentFiles };
  const fileValidation: Record<string, ValidationResult> = {};

  const fileRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;
  
  // SAFETY LAYER: Check if AI used markdown instead of XML
  const hasXml = hasXmlFileTags(content);
  const hasMarkdown = hasMarkdownCodeBlocks(content);
  
  // If markdown code blocks exist but no XML tags, use fallback parser
  if (hasMarkdown && !hasXml) {
    console.warn('[Moonely Parser] AI returned markdown code blocks instead of XML. Using fallback parser.');
    const markdownResult = parseMarkdownToFiles(content);
    
    if (markdownResult.detected) {
      console.warn('[Moonely Parser] Extracted files from markdown:', markdownResult.detectedPaths);
      
      // Process markdown-extracted files with validation
      for (const [path, fileContent] of Object.entries(markdownResult.files)) {
        files[path] = fileContent;
        
        // Validate JSX/TSX files
        if (path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.js')) {
          let validation: ValidationResult;
          
          if (path === '/App.tsx' || path.endsWith('/App.tsx')) {
            validation = validateAppTsx(fileContent);
          } else {
            validation = validateJsxSyntax(fileContent);
            const incompletePatterns = detectIncompletePatterns(fileContent);
            if (incompletePatterns.length > 0) {
              validation.errors.push(...incompletePatterns);
              validation.isComplete = false;
            }
          }
          
          fileValidation[path] = validation;
          
          if (validation.isValid && validation.isComplete) {
            validFiles[path] = fileContent;
          }
        } else {
          validFiles[path] = fileContent;
          fileValidation[path] = { isValid: true, errors: [], isComplete: true };
        }
      }
      
      return { files, validFiles, fileValidation };
    }
  }

  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const path = match[1];
    let fileContent = match[2];
    const isTagClosed = match[0].endsWith('</file>');
    
    if (fileContent.startsWith('\n')) {
      fileContent = fileContent.slice(1);
    }
    
    if (isTagClosed) {
      fileContent = fileContent.trimEnd();
    }

    files[path] = fileContent;
    
    // Validate JSX/TSX files
    if (path.endsWith('.tsx') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.js')) {
      // Use enhanced validation for App.tsx (the main entry point)
      let validation: ValidationResult;
      
      if (path === '/App.tsx' || path.endsWith('/App.tsx')) {
        // App.tsx gets stricter validation since it's where most AI errors occur
        validation = validateAppTsx(fileContent);
      } else {
        // Regular validation for other files
        validation = validateJsxSyntax(fileContent);
        const incompletePatterns = detectIncompletePatterns(fileContent);
        
        // Add incomplete patterns to validation
        if (incompletePatterns.length > 0) {
          validation.errors.push(...incompletePatterns);
          validation.isComplete = false;
        }
      }
      
      // If tag isn't closed yet, code is definitely incomplete
      if (!isTagClosed) {
        validation.isComplete = false;
      }
      
      fileValidation[path] = validation;
      
      // Only include in validFiles if valid and complete
      if (validation.isValid && validation.isComplete) {
        validFiles[path] = fileContent;
      }
      // Keep the previous valid version if current is invalid
    } else {
      // Non-JS/TS files - include as-is if tag is closed
      if (isTagClosed) {
        validFiles[path] = fileContent;
      }
      fileValidation[path] = { isValid: true, errors: [], isComplete: isTagClosed };
    }
  }

  return { files, validFiles, fileValidation };
}

/**
 * Original parser for backward compatibility
 */
export function parseXmlToFiles(
  content: string,
  currentFiles: Record<string, string>
): Record<string, string> {
  const newFiles = { ...currentFiles };

  // Regex to find all occurrences of <file path="...">...</file>
  // We use [\s\S]*? to match any character including newlines (non-greedy)
  // We also match if the file tag is not closed yet (streaming)
  const fileRegex = /<file path="([^"]+)">([\s\S]*?)(?:<\/file>|$)/g;

  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const path = match[1];
    // Extract the content and trim whitespace
    // We only trim the start to avoid jumping during streaming if the AI types a space
    let fileContent = match[2];
    
    // Remove the initial newline if it exists (common in XML)
    if (fileContent.startsWith('\n')) {
      fileContent = fileContent.slice(1);
    }
    
    // Only trim the end if the tag is closed (match[0] ends with </file>)
    if (match[0].endsWith('</file>')) {
        fileContent = fileContent.trimEnd();
    }

    newFiles[path] = fileContent;
  }

  return newFiles;
}

/**
 * FALLBACK PARSER: Extracts code from Markdown code blocks when AI fails to use XML format.
 * This is a safety layer to handle rare cases where AI outputs ```tsx instead of <file> tags.
 * 
 * Detects patterns like:
 * - ```tsx followed by // /path/to/file.tsx comment
 * - ```tsx followed by // path: /App.tsx comment  
 * - Plain ```tsx blocks (defaults to /App.tsx)
 * 
 * @param content - The AI response text
 * @returns Object with extracted files and detection metadata
 */
export function parseMarkdownToFiles(content: string): {
  files: Record<string, string>;
  detected: boolean;
  detectedPaths: string[];
} {
  const files: Record<string, string> = {};
  const detectedPaths: string[] = [];
  
  // Regex to find markdown code blocks with optional path comment
  // Matches: ```tsx, ```jsx, ```typescript, ```javascript
  // Looks for path in: // /path.tsx, // path: /path.tsx, or filename.tsx as first comment
  const mdBlockRegex = /```(?:tsx|jsx|typescript|javascript|ts|js)\s*\n([\/\/\s]*(?:path:\s*)?(\/[\w\/.\-]+\.(?:tsx|jsx|ts|js)))?([\s\S]*?)```/gi;
  
  let match;
  let defaultFileIndex = 0;
  
  while ((match = mdBlockRegex.exec(content)) !== null) {
    let codeContent = match[3] || '';
    let filePath = match[2] || null;
    
    // Try to extract path from first line comment if not found in header
    if (!filePath && codeContent) {
      const firstLineMatch = codeContent.match(/^\s*(?:\/\/|{\/\*)\s*(?:path:\s*)?(\/[\w\/.\-]+\.(?:tsx|jsx|ts|js))/i);
      if (firstLineMatch) {
        filePath = firstLineMatch[1];
        // Remove the path comment from code
        codeContent = codeContent.replace(/^\s*(?:\/\/|{\/\*)\s*(?:path:\s*)?\/[\w\/.\-]+\.(?:tsx|jsx|ts|js)\s*(?:\*\/})?\s*\n?/i, '');
      }
    }
    
    // Default path if none found
    if (!filePath) {
      filePath = defaultFileIndex === 0 ? '/App.tsx' : `/components/Component${defaultFileIndex}.tsx`;
      defaultFileIndex++;
    }
    
    // Clean up the code content
    codeContent = codeContent.trim();
    
    if (codeContent.length > 0) {
      files[filePath] = codeContent;
      detectedPaths.push(filePath);
    }
  }
  
  return {
    files,
    detected: detectedPaths.length > 0,
    detectedPaths
  };
}

/**
 * Checks if content contains markdown code blocks with React/TS code
 * Used to detect when AI incorrectly uses markdown instead of XML
 */
export function hasMarkdownCodeBlocks(content: string): boolean {
  const mdCodePattern = /```(?:tsx|jsx|typescript|javascript|ts|js)\s*\n[\s\S]*?```/gi;
  return mdCodePattern.test(content);
}

/**
 * Checks if content contains proper XML file tags
 */
export function hasXmlFileTags(content: string): boolean {
  return /<file path="[^"]+">/.test(content);
}
