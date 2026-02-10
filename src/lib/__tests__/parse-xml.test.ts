/**
 * Tests for parse-xml.ts JSX validation and parsing utilities
 * 
 * These tests verify that AI-generated code is properly validated
 * to prevent "Unterminated JSX contents" and similar syntax errors in Sandpack.
 */

import {
  validateJsxSyntax,
  hasBalancedBrackets,
  detectIncompletePatterns,
  parseXmlToFiles,
  parseXmlToFilesWithValidation,
  type ValidationResult,
} from '../parse-xml';

describe('validateJsxSyntax', () => {
  describe('valid code', () => {
    it('should validate a simple React component', () => {
      const code = `
export default function App() {
  return (
    <div className="container">
      <h1>Hello World</h1>
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.isComplete).toBe(true);
    });

    it('should validate component with map function', () => {
      const code = `
export default function App() {
  const items = ['a', 'b', 'c'];
  return (
    <ul>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate component with ternary operator', () => {
      const code = `
export default function App() {
  const isLoggedIn = true;
  return (
    <div>
      {isLoggedIn ? <span>Welcome!</span> : <span>Please log in</span>}
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate component with self-closing tags', () => {
      const code = `
export default function App() {
  return (
    <div>
      <img src="test.jpg" alt="Test" />
      <input type="text" placeholder="Enter text" />
      <br />
      <hr />
      <CustomComponent />
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
    });

    it('should validate component with template literals', () => {
      const code = `
export default function App() {
  const name = "World";
  return (
    <div className={\`text-\${name} font-bold\`}>
      Hello {name}
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
    });

    it('should validate component with comments', () => {
      const code = `
export default function App() {
  // This is a comment
  /* Multi-line
     comment */
  return (
    <div>
      {/* JSX comment */}
      <h1>Hello</h1>
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
    });

    it('should validate component with nested objects and arrays', () => {
      const code = `
export default function App() {
  const data = {
    items: [1, 2, 3],
    nested: { a: 'b', c: [4, 5] }
  };
  return (
    <div>
      {JSON.stringify(data)}
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid code - unclosed brackets', () => {
    it('should detect unclosed curly brace', () => {
      const code = `
export default function App() {
  return (
    <div>
      {items.map(item => <span>{item}</span>
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('{') || e.includes('Unclosed'))).toBe(true);
    });

    it('should detect unclosed parenthesis', () => {
      const code = `
export default function App() {
  return (
    <div>
      {items.map(item => (
        <span>{item}</span>
      }
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
    });

    it('should detect unclosed square bracket', () => {
      const code = `
const items = [1, 2, 3;
export default function App() {
  return <div />;
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
    });
  });

  describe('invalid code - unclosed JSX tags', () => {
    it('should detect unclosed div tag', () => {
      const code = `
export default function App() {
  return (
    <div className="container">
      <h1>Hello World</h1>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('div') || e.includes('JSX'))).toBe(true);
    });

    it('should detect mismatched JSX tags', () => {
      const code = `
export default function App() {
  return (
    <div>
      <span>Text</div>
    </span>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
    });

    it('should detect unclosed span tag', () => {
      const code = `
export default function App() {
  return (
    <div>
      <span>Incomplete
    </div>
  );
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
    });
  });

  describe('invalid code - unterminated strings', () => {
    it('should detect unterminated double quote string', () => {
      const code = `
export default function App() {
  const text = "Hello World;
  return <div>{text}</div>;
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('string') || e.includes('"'))).toBe(true);
    });

    it('should detect unterminated single quote string', () => {
      const code = `
export default function App() {
  const text = 'Hello World;
  return <div>{text}</div>;
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
    });

    it('should detect unterminated template literal', () => {
      const code = `
export default function App() {
  const text = \`Hello \${name}
  return <div>{text}</div>;
}`;
      const result = validateJsxSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('template'))).toBe(true);
    });
  });

  describe('incomplete code detection', () => {
    it('should detect incomplete code ending with opening bracket', () => {
      const code = `
export default function App() {
  return (
    <div className="container">
      {`;
      const result = validateJsxSyntax(code);
      expect(result.isComplete).toBe(false);
    });

    it('should detect incomplete code ending with arrow function', () => {
      const code = `
export default function App() {
  const handleClick = () =>`;
      const result = validateJsxSyntax(code);
      expect(result.isComplete).toBe(false);
    });

    it('should detect incomplete code ending with return', () => {
      const code = `
export default function App() {
  return`;
      const result = validateJsxSyntax(code);
      expect(result.isComplete).toBe(false);
    });
  });
});

describe('hasBalancedBrackets', () => {
  it('should return true for balanced brackets', () => {
    expect(hasBalancedBrackets('{ a: { b: [1, 2, 3] } }')).toBe(true);
    expect(hasBalancedBrackets('function() { return (a + b); }')).toBe(true);
    expect(hasBalancedBrackets('const arr = [1, [2, [3]]]')).toBe(true);
  });

  it('should return false for unbalanced brackets', () => {
    expect(hasBalancedBrackets('{ a: { b: [1, 2, 3] }')).toBe(false);
    expect(hasBalancedBrackets('function() { return (a + b; }')).toBe(false);
    expect(hasBalancedBrackets('const arr = [1, [2, [3]]')).toBe(false);
  });

  it('should ignore brackets inside strings', () => {
    expect(hasBalancedBrackets('const s = "{ not a bracket }"')).toBe(true);
    expect(hasBalancedBrackets("const s = '[ not a bracket ]'")).toBe(true);
  });

  it('should ignore brackets inside comments', () => {
    expect(hasBalancedBrackets('// { comment\nconst x = 1;')).toBe(true);
    expect(hasBalancedBrackets('/* { multi-line } */const x = 1;')).toBe(true);
  });
});

describe('detectIncompletePatterns', () => {
  it('should detect incomplete return statement', () => {
    const issues = detectIncompletePatterns('return ');
    expect(issues).toContain('Incomplete return statement');
  });

  it('should detect incomplete arrow function', () => {
    const issues = detectIncompletePatterns('const fn = () => ');
    expect(issues).toContain('Incomplete arrow function');
  });

  it('should detect incomplete array method', () => {
    const issues = detectIncompletePatterns('items.map(item =>');
    expect(issues).toContain('Incomplete array method callback');
  });

  it('should detect incomplete object literal', () => {
    const issues = detectIncompletePatterns('const obj = {');
    expect(issues).toContain('Incomplete object or array literal');
  });

  it('should detect dangling operator', () => {
    const issues = detectIncompletePatterns('const x = a +');
    expect(issues).toContain('Dangling operator');
  });

  it('should detect incomplete className', () => {
    const issues = detectIncompletePatterns('className="bg-blue-500 text-');
    expect(issues).toContain('Incomplete className string');
  });

  it('should return empty array for complete code', () => {
    const issues = detectIncompletePatterns('const x = 1;');
    expect(issues).toHaveLength(0);
  });
});

describe('parseXmlToFiles', () => {
  it('should parse single file', () => {
    const content = '<file path="/App.tsx">export default function App() { return <div>Hello</div>; }</file>';
    const result = parseXmlToFiles(content, {});
    expect(result['/App.tsx']).toBe('export default function App() { return <div>Hello</div>; }');
  });

  it('should parse multiple files', () => {
    const content = `
<file path="/App.tsx">
export default function App() { return <div>Hello</div>; }
</file>
<file path="/components/Button.tsx">
export const Button = () => <button>Click</button>;
</file>`;
    const result = parseXmlToFiles(content, {});
    expect(result['/App.tsx']).toBeDefined();
    expect(result['/components/Button.tsx']).toBeDefined();
  });

  it('should preserve existing files', () => {
    const content = '<file path="/App.tsx">new content</file>';
    const result = parseXmlToFiles(content, { '/utils.ts': 'existing' });
    expect(result['/utils.ts']).toBe('existing');
    expect(result['/App.tsx']).toBe('new content');
  });

  it('should handle streaming (unclosed tags)', () => {
    const content = '<file path="/App.tsx">export default function App() { retu';
    const result = parseXmlToFiles(content, {});
    expect(result['/App.tsx']).toBe('export default function App() { retu');
  });

  it('should trim content only when tag is closed', () => {
    const closedTag = '<file path="/App.tsx">\nconst x = 1;\n</file>';
    const openTag = '<file path="/App.tsx">\nconst x = 1;\n';
    
    const closedResult = parseXmlToFiles(closedTag, {});
    const openResult = parseXmlToFiles(openTag, {});
    
    expect(closedResult['/App.tsx']).toBe('const x = 1;');
    expect(openResult['/App.tsx']).toBe('const x = 1;\n');
  });
});

describe('parseXmlToFilesWithValidation', () => {
  it('should include valid files in validFiles', () => {
    const content = '<file path="/App.tsx">export default function App() { return <div>Hello</div>; }</file>';
    const result = parseXmlToFilesWithValidation(content, {});
    
    expect(result.files['/App.tsx']).toBeDefined();
    expect(result.validFiles['/App.tsx']).toBeDefined();
    expect(result.fileValidation['/App.tsx'].isValid).toBe(true);
  });

  it('should exclude invalid files from validFiles', () => {
    const content = '<file path="/App.tsx">export default function App() { return <div>Hello</div>; </file>';
    // Note: missing closing } for function
    const invalidContent = '<file path="/Broken.tsx">export default function App() { return <div>Unclosed</file>';
    
    const result = parseXmlToFilesWithValidation(invalidContent, {});
    
    expect(result.files['/Broken.tsx']).toBeDefined();
    // validFiles should NOT include the broken file
    expect(result.validFiles['/Broken.tsx']).toBeUndefined();
    expect(result.fileValidation['/Broken.tsx'].isValid).toBe(false);
  });

  it('should keep previous valid version when current is invalid', () => {
    const initialFiles = {
      '/App.tsx': 'export default function App() { return <div>Original</div>; }'
    };
    
    // Incomplete streaming content
    const streamingContent = '<file path="/App.tsx">export default function App() { return <div>New content';
    
    const result = parseXmlToFilesWithValidation(streamingContent, initialFiles);
    
    // files should have the new (broken) content
    expect(result.files['/App.tsx']).toContain('New content');
    // validFiles should keep the original valid content
    expect(result.validFiles['/App.tsx']).toContain('Original');
  });

  it('should mark streaming content as incomplete', () => {
    const content = '<file path="/App.tsx">export default function App() { return';
    
    const result = parseXmlToFilesWithValidation(content, {});
    
    expect(result.fileValidation['/App.tsx'].isComplete).toBe(false);
  });

  it('should handle non-JS files without validation', () => {
    const content = '<file path="/styles.css">.container { display: flex; }</file>';
    
    const result = parseXmlToFilesWithValidation(content, {});
    
    expect(result.validFiles['/styles.css']).toBe('.container { display: flex; }');
    expect(result.fileValidation['/styles.css'].isValid).toBe(true);
  });

  it('should detect common AI mistakes', () => {
    // Missing closing parenthesis in map
    const mapError = '<file path="/App.tsx">export default function App() { return <div>{items.map(i => <span>{i}</span>}</div>; }</file>';
    
    const result = parseXmlToFilesWithValidation(mapError, {});
    
    expect(result.fileValidation['/App.tsx'].isValid).toBe(false);
  });
});

describe('Real-world AI output scenarios', () => {
  it('should handle typical AI component output', () => {
    const aiOutput = `
<file path="/App.tsx">
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white p-8"
    >
      <h1 className="text-4xl font-bold mb-4">Счётчик</h1>
      <p className="text-xl mb-4">Текущее значение: {count}</p>
      <button
        onClick={() => setCount(count + 1)}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
      >
        Увеличить
      </button>
    </motion.div>
  );
}
</file>`;

    const result = parseXmlToFilesWithValidation(aiOutput, {});
    
    expect(result.fileValidation['/App.tsx'].isValid).toBe(true);
    expect(result.fileValidation['/App.tsx'].isComplete).toBe(true);
    expect(result.validFiles['/App.tsx']).toBeDefined();
  });

  it('should catch truncated AI output (common error)', () => {
    // This simulates AI being cut off mid-generation
    const truncatedOutput = `
<file path="/App.tsx">
import { useState } from 'react';

export default function App() {
  const [items, setItems] = useState(['a', 'b', 'c']);

  return (
    <div className="container">
      <ul>
        {items.map((item, index) => (
          <li key={index} className="text-`;

    const result = parseXmlToFilesWithValidation(truncatedOutput, {});
    
    expect(result.fileValidation['/App.tsx'].isValid).toBe(false);
    expect(result.fileValidation['/App.tsx'].isComplete).toBe(false);
  });

  it('should handle streaming with progressive validation', () => {
    const initialFiles = {
      '/App.tsx': 'export default function App() { return <div>Initial</div>; }'
    };

    // Simulate streaming chunks
    const chunk1 = '<file path="/App.tsx">export default function App() {';
    const chunk2 = '<file path="/App.tsx">export default function App() { return (';
    const chunk3 = '<file path="/App.tsx">export default function App() { return (<div>Hello</div>);';
    const chunk4 = '<file path="/App.tsx">export default function App() { return (<div>Hello</div>); }</file>';

    // Each chunk should be validated
    const result1 = parseXmlToFilesWithValidation(chunk1, initialFiles);
    const result2 = parseXmlToFilesWithValidation(chunk2, initialFiles);
    const result3 = parseXmlToFilesWithValidation(chunk3, initialFiles);
    const result4 = parseXmlToFilesWithValidation(chunk4, initialFiles);

    // During streaming, validFiles should keep initial valid content
    expect(result1.validFiles['/App.tsx']).toContain('Initial');
    expect(result2.validFiles['/App.tsx']).toContain('Initial');
    expect(result3.validFiles['/App.tsx']).toContain('Initial');
    
    // Final complete chunk should update validFiles
    expect(result4.validFiles['/App.tsx']).toContain('Hello');
    expect(result4.fileValidation['/App.tsx'].isValid).toBe(true);
    expect(result4.fileValidation['/App.tsx'].isComplete).toBe(true);
  });
});
// =============================================================================
// TARGETED EDIT TESTS
// =============================================================================

import {
  applyEdit,
  applyMultipleEdits,
  parseEdits,
  hasEditTags,
  hasFileTags,
  type EditOperation,
  type ApplyEditResult,
} from '../parse-xml';

describe('applyEdit', () => {
  const sampleFile = `line 1
line 2
line 3
line 4
line 5`;

  it('should replace a single line', () => {
    const result = applyEdit(sampleFile, 3, 3, 'new line 3');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1
line 2
new line 3
line 4
line 5`);
  });

  it('should replace multiple lines', () => {
    const result = applyEdit(sampleFile, 2, 4, 'replaced content');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1
replaced content
line 5`);
  });

  it('should replace with multi-line content', () => {
    const result = applyEdit(sampleFile, 3, 3, 'new line 3a\nnew line 3b\nnew line 3c');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1
line 2
new line 3a
new line 3b
new line 3c
line 4
line 5`);
  });

  it('should replace first line', () => {
    const result = applyEdit(sampleFile, 1, 1, 'new first line');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`new first line
line 2
line 3
line 4
line 5`);
  });

  it('should replace last line', () => {
    const result = applyEdit(sampleFile, 5, 5, 'new last line');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1
line 2
line 3
line 4
new last line`);
  });

  it('should handle endLine exceeding file length', () => {
    const result = applyEdit(sampleFile, 4, 100, 'new content');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1
line 2
line 3
new content`);
  });

  it('should fail for invalid startLine (0)', () => {
    const result = applyEdit(sampleFile, 0, 3, 'new content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('startLine');
  });

  it('should fail when startLine > endLine', () => {
    const result = applyEdit(sampleFile, 4, 2, 'new content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('endLine');
  });

  it('should fail when startLine exceeds file length', () => {
    const result = applyEdit(sampleFile, 100, 105, 'new content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds file length');
  });

  it('should handle empty replacement (deleting lines)', () => {
    const result = applyEdit(sampleFile, 2, 4, '');
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1

line 5`);
  });
});

describe('applyMultipleEdits', () => {
  const sampleFile = `line 1
line 2
line 3
line 4
line 5
line 6
line 7`;

  it('should apply multiple non-overlapping edits', () => {
    const edits = [
      { startLine: 2, endLine: 2, newContent: 'edited line 2' },
      { startLine: 5, endLine: 5, newContent: 'edited line 5' },
    ];
    const result = applyMultipleEdits(sampleFile, edits);
    expect(result.success).toBe(true);
    expect(result.content).toBe(`line 1
edited line 2
line 3
line 4
edited line 5
line 6
line 7`);
  });

  it('should apply edits in correct order (bottom-to-top)', () => {
    // Even if provided in wrong order, should work correctly
    const edits = [
      { startLine: 6, endLine: 6, newContent: 'edited line 6' },
      { startLine: 2, endLine: 3, newContent: 'edited lines 2-3' },
    ];
    const result = applyMultipleEdits(sampleFile, edits);
    expect(result.success).toBe(true);
    expect(result.content).toContain('edited line 6');
    expect(result.content).toContain('edited lines 2-3');
  });

  it('should fail for overlapping edits', () => {
    const edits = [
      { startLine: 2, endLine: 4, newContent: 'first edit' },
      { startLine: 3, endLine: 5, newContent: 'overlapping edit' },
    ];
    const result = applyMultipleEdits(sampleFile, edits);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Overlapping');
  });

  it('should handle empty edits array', () => {
    const result = applyMultipleEdits(sampleFile, []);
    expect(result.success).toBe(true);
    expect(result.content).toBe(sampleFile);
  });

  it('should handle single edit', () => {
    const edits = [{ startLine: 3, endLine: 3, newContent: 'single edit' }];
    const result = applyMultipleEdits(sampleFile, edits);
    expect(result.success).toBe(true);
    expect(result.content).toContain('single edit');
  });
});

describe('parseEdits', () => {
  it('should parse a single edit tag', () => {
    const content = `<edit path="/App.tsx" start="10" end="15">
const newCode = true;
</edit>`;
    const edits = parseEdits(content);
    expect(edits.has('/App.tsx')).toBe(true);
    expect(edits.get('/App.tsx')).toHaveLength(1);
    expect(edits.get('/App.tsx')![0].startLine).toBe(10);
    expect(edits.get('/App.tsx')![0].endLine).toBe(15);
    expect(edits.get('/App.tsx')![0].isComplete).toBe(true);
  });

  it('should parse multiple edits for same file', () => {
    const content = `<edit path="/App.tsx" start="5" end="10">
first edit
</edit>
Some text between
<edit path="/App.tsx" start="20" end="25">
second edit
</edit>`;
    const edits = parseEdits(content);
    expect(edits.get('/App.tsx')).toHaveLength(2);
    expect(edits.get('/App.tsx')![0].startLine).toBe(5);
    expect(edits.get('/App.tsx')![1].startLine).toBe(20);
  });

  it('should parse edits for different files', () => {
    const content = `<edit path="/App.tsx" start="1" end="5">
app edit
</edit>
<edit path="/components/Header.tsx" start="10" end="15">
header edit
</edit>`;
    const edits = parseEdits(content);
    expect(edits.has('/App.tsx')).toBe(true);
    expect(edits.has('/components/Header.tsx')).toBe(true);
    expect(edits.get('/App.tsx')).toHaveLength(1);
    expect(edits.get('/components/Header.tsx')).toHaveLength(1);
  });

  it('should detect incomplete edit (streaming)', () => {
    const content = `<edit path="/App.tsx" start="10" end="15">
const partialCode = `;
    const edits = parseEdits(content);
    expect(edits.get('/App.tsx')![0].isComplete).toBe(false);
  });

  it('should return empty map for content without edits', () => {
    const content = `<file path="/App.tsx">some content</file>`;
    const edits = parseEdits(content);
    expect(edits.size).toBe(0);
  });
});

describe('hasEditTags and hasFileTags', () => {
  it('should detect edit tags', () => {
    expect(hasEditTags('<edit path="/App.tsx" start="1" end="5">content</edit>')).toBe(true);
    expect(hasEditTags('<file path="/App.tsx">content</file>')).toBe(false);
    expect(hasEditTags('no tags here')).toBe(false);
  });

  it('should detect file tags', () => {
    expect(hasFileTags('<file path="/App.tsx">content</file>')).toBe(true);
    expect(hasFileTags('<edit path="/App.tsx" start="1" end="5">content</edit>')).toBe(false);
    expect(hasFileTags('no tags here')).toBe(false);
  });
});

describe('parseXmlToFilesWithValidation with edits', () => {
  it('should apply targeted edit to existing file', () => {
    const currentFiles = {
      '/App.tsx': `import React from 'react';

export default function App() {
  const message = "Hello";
  return <div>{message}</div>;
}`
    };

    const content = `<edit path="/App.tsx" start="4" end="4">
  const message = "Hello World";
</edit>`;

    const result = parseXmlToFilesWithValidation(content, currentFiles);
    expect(result.files['/App.tsx']).toContain('Hello World');
    expect(result.files['/App.tsx']).toContain('import React');
    expect(result.files['/App.tsx']).toContain('export default function');
  });

  it('should handle mixed file and edit tags', () => {
    const currentFiles = {
      '/components/Header.tsx': `export function Header() {
  return <h1>Old Header</h1>;
}`
    };

    const content = `<file path="/App.tsx">
import { Header } from './components/Header';

export default function App() {
  return <Header />;
}
</file>

<edit path="/components/Header.tsx" start="2" end="2">
  return <h1>New Header</h1>;
</edit>`;

    const result = parseXmlToFilesWithValidation(content, currentFiles);
    
    // New file should be created
    expect(result.files['/App.tsx']).toContain('import { Header }');
    
    // Existing file should be edited
    expect(result.files['/components/Header.tsx']).toContain('New Header');
    expect(result.files['/components/Header.tsx']).toContain('export function Header');
  });

  it('should fail edit on non-existent file', () => {
    const currentFiles = {};

    const content = `<edit path="/non-existent.tsx" start="1" end="5">
new content
</edit>`;

    const result = parseXmlToFilesWithValidation(content, currentFiles);
    expect(result.fileValidation['/non-existent.tsx'].isValid).toBe(false);
    expect(result.fileValidation['/non-existent.tsx'].errors[0]).toContain('does not exist');
  });

  it('should validate file after applying edit', () => {
    const currentFiles = {
      '/App.tsx': `export default function App() {
  return (
    <div>
      <p>Hello</p>
    </div>
  );
}`
    };

    // This edit would create invalid JSX (unclosed tag)
    const content = `<edit path="/App.tsx" start="3" end="5">
    <div>
      <p>Unclosed
</edit>`;

    const result = parseXmlToFilesWithValidation(content, currentFiles);
    expect(result.fileValidation['/App.tsx'].isValid).toBe(false);
    // validFiles should keep the original valid version
    expect(result.validFiles['/App.tsx']).toContain('Hello');
  });

  it('should apply multiple edits to same file correctly', () => {
    const currentFiles = {
      '/App.tsx': `line 1
line 2
line 3
line 4
line 5
line 6
line 7`
    };

    const content = `<edit path="/App.tsx" start="2" end="2">
edited line 2
</edit>
<edit path="/App.tsx" start="6" end="6">
edited line 6
</edit>`;

    const result = parseXmlToFilesWithValidation(content, currentFiles);
    expect(result.files['/App.tsx']).toContain('edited line 2');
    expect(result.files['/App.tsx']).toContain('edited line 6');
    expect(result.files['/App.tsx']).toContain('line 1');
    expect(result.files['/App.tsx']).toContain('line 3');
  });
});