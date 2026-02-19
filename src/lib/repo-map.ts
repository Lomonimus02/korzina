/**
 * Repo Map Generator - Creates a visual ASCII tree structure of the project
 * with exported component detection for better AI context awareness.
 */

interface TreeNode {
  name: string;
  isFile: boolean;
  exports: string[];
  children: Map<string, TreeNode>;
}

/**
 * Extract exported names from file content using regex patterns.
 * Detects: export default, export const/function/class, export { named }
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  
  // Match: export default function/class Name or export default Name
  const defaultFunctionMatch = content.match(/export\s+default\s+(?:function|class)\s+(\w+)/g);
  if (defaultFunctionMatch) {
    defaultFunctionMatch.forEach(match => {
      const name = match.match(/export\s+default\s+(?:function|class)\s+(\w+)/)?.[1];
      if (name) exports.push(name);
    });
  }
  
  // Match: export default ComponentName (for React components)
  const defaultExportMatch = content.match(/export\s+default\s+(\w+)\s*;?$/gm);
  if (defaultExportMatch) {
    defaultExportMatch.forEach(match => {
      const name = match.match(/export\s+default\s+(\w+)/)?.[1];
      if (name && !['function', 'class', 'async'].includes(name)) {
        exports.push(name);
      }
    });
  }
  
  // Match: export const/let/var Name or export function Name or export class Name
  const namedExports = content.match(/export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g);
  if (namedExports) {
    namedExports.forEach(match => {
      const name = match.match(/export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/)?.[1];
      if (name) exports.push(name);
    });
  }
  
  // Match: export { Name1, Name2 } or export { Name as Alias }
  const bracketExports = content.match(/export\s*\{([^}]+)\}/g);
  if (bracketExports) {
    bracketExports.forEach(match => {
      const inner = match.match(/export\s*\{([^}]+)\}/)?.[1];
      if (inner) {
        // Split by comma and extract names (handle "Name as Alias" -> use Alias)
        inner.split(',').forEach(item => {
          const trimmed = item.trim();
          if (trimmed) {
            // Check for "as" alias
            const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
            if (asMatch) {
              exports.push(asMatch[2]); // Use the alias
            } else {
              const name = trimmed.match(/^(\w+)/)?.[1];
              if (name) exports.push(name);
            }
          }
        });
      }
    });
  }
  
  // Match: export type/interface Name (TypeScript)
  const typeExports = content.match(/export\s+(?:type|interface)\s+(\w+)/g);
  if (typeExports) {
    typeExports.forEach(match => {
      const name = match.match(/export\s+(?:type|interface)\s+(\w+)/)?.[1];
      if (name) exports.push(name);
    });
  }
  
  // Remove duplicates and return
  return [...new Set(exports)];
}

/**
 * Build a tree structure from file paths
 */
function buildTree(files: Record<string, string>): TreeNode {
  const root: TreeNode = {
    name: '/',
    isFile: false,
    exports: [],
    children: new Map()
  };
  
  for (const [filePath, content] of Object.entries(files)) {
    // Normalize path: remove leading slash/dot, use forward slashes
    const normalizedPath = filePath
      .replace(/^[./\\]+/, '')
      .replace(/\\/g, '/');
    
    const parts = normalizedPath.split('/').filter(Boolean);
    let currentNode = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;
      
      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          isFile: isLastPart,
          exports: isLastPart ? extractExports(content) : [],
          children: new Map()
        });
      }
      
      currentNode = currentNode.children.get(part)!;
      
      // If this is the file, update exports
      if (isLastPart) {
        currentNode.isFile = true;
        currentNode.exports = extractExports(content);
      }
    }
  }
  
  return root;
}

/**
 * Render the tree to ASCII art format
 */
function renderTree(node: TreeNode, prefix: string = '', isLast: boolean = true, isRoot: boolean = true): string {
  let result = '';
  
  if (isRoot) {
    result = '/\n';
  }
  
  // Sort children: directories first, then files, alphabetically within each group
  const sortedChildren = Array.from(node.children.entries()).sort((a, b) => {
    const aIsDir = !a[1].isFile;
    const bIsDir = !b[1].isFile;
    
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a[0].localeCompare(b[0]);
  });
  
  sortedChildren.forEach(([name, childNode], index) => {
    const isLastChild = index === sortedChildren.length - 1;
    const connector = isLastChild ? '└── ' : '├── ';
    const childPrefix = prefix + (isLastChild ? '    ' : '│   ');
    
    // Format exports annotation
    let exportAnnotation = '';
    if (childNode.isFile && childNode.exports.length > 0) {
      // Limit to first 3 exports to keep it concise
      const displayExports = childNode.exports.slice(0, 3);
      const suffix = childNode.exports.length > 3 ? ', ...' : '';
      exportAnnotation = ` [Exp: ${displayExports.join(', ')}${suffix}]`;
    }
    
    // Add directory indicator
    const dirIndicator = !childNode.isFile ? '/' : '';
    
    result += `${prefix}${connector}${name}${dirIndicator}${exportAnnotation}\n`;
    
    // Recursively render children
    if (!childNode.isFile) {
      result += renderTree(childNode, childPrefix, isLastChild, false);
    }
  });
  
  return result;
}

/**
 * Generate a visual ASCII tree map of the project structure.
 * Analyzes file paths and extracts exported component/function names.
 * 
 * @param files - Record of file paths to file contents
 * @returns Formatted ASCII tree string with export annotations
 * 
 * @example
 * const map = generateRepoMap({
 *   '/App.tsx': 'export default function App() {...}',
 *   '/components/Header.tsx': 'export const Header = () => {...}'
 * });
 * // Returns:
 * // /
 * // ├── components/
 * // │   └── Header.tsx [Exp: Header]
 * // └── App.tsx [Exp: App]
 */
export function generateRepoMap(files: Record<string, string>): string {
  if (!files || Object.keys(files).length === 0) {
    return '/\n└── (empty project)\n';
  }
  
  const tree = buildTree(files);
  return renderTree(tree);
}

/**
 * Generate the full PROJECT MAP section for the system prompt
 */
export function generateRepoMapSection(files: Record<string, string>): string {
  const repoMap = generateRepoMap(files);
  
  return `=== PROJECT MAP (Smart Context) ===
Use this tree to understand the project structure and avoid duplicates:

${repoMap}
CONTEXT INSTRUCTIONS:
1. ALWAYS check this PROJECT MAP before creating a new component to avoid duplicates.
2. If you see an existing component (e.g., \`components/ui/button.tsx\`), USE IT instead of creating a new one.
3. Import components based on their location in the map (e.g., \`import { Button } from "@/components/ui/button"\`).
4. Files marked with [Exp: Name] export those components - use them directly.
5. Follow the existing project structure when adding new files.

`;
}
