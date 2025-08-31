import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface DtsToCjsOptions {
  /** Output directory where .d.ts files are located (default: 'dist') */
  outDir?: string;
  /** Pattern to match .d.ts files (default: "**\/*.d.ts") */
  pattern?: string;
  /** Custom namespace name generator */
  getNamespaceName?: (fileName: string) => string;
}

function convertDtsToCommonJS(content: string, fileName: string, options: DtsToCjsOptions = {}): string {
  const { getNamespaceName } = options;
  
  // Extract all exported declarations
  const exportedDeclarations: string[] = [];
  const exportDefaultMatch = content.match(/^export\s+default\s+/m);
  
  // Find all named exports
  const namedExportMatches = content.matchAll(/^export\s+declare\s+(?:function|const|let|var|class|interface|type|enum)\s+(\w+)/gm);
  for (const match of namedExportMatches) {
    exportedDeclarations.push(match[1]);
  }
  
  // Find export statements like "export { foo, bar }"
  const exportStatementMatches = content.matchAll(/^export\s+\{\s*([^}]+)\s*\}/gm);
  for (const match of exportStatementMatches) {
    const items = match[1].split(',').map(item => {
      const trimmed = item.trim();
      // Handle "foo as bar" syntax
      const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
      return asMatch ? asMatch[2] : trimmed;
    }).filter(Boolean);
    exportedDeclarations.push(...items);
  }
  
  // Remove export keywords from declarations
  let result = content
    .replace(/^export\s+declare\s+/gm, 'declare ')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '') // Remove export {} statements
    .replace(/^export\s+/gm, ''); // Remove any remaining export keywords
  
  // Handle default export case
  if (exportDefaultMatch) {
    // For default exports, just use export = syntax
    const defaultExportContent = content.match(/^export\s+default\s+(.+)$/m)?.[1];
    if (defaultExportContent) {
      result = result.replace(defaultExportContent, '');
      result += `\n\nexport = ${defaultExportContent.replace(/;$/, '')};`;
      return result.trim();
    }
  }
  
  // Handle named exports
  if (exportedDeclarations.length > 0) {
    // Generate namespace name
    const defaultNamespaceName = path.basename(fileName, '.d.ts')
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^(\d)/, '_$1') // Ensure it doesn't start with a number
      || 'Library';
    
    const namespaceName = getNamespaceName ? getNamespaceName(fileName) : defaultNamespaceName;
    
    // Create namespace with exports
    const uniqueExports = [...new Set(exportedDeclarations)];
    result += `\n\ndeclare namespace ${namespaceName} {\n`;
    result += `  export { ${uniqueExports.join(', ')} };\n`;
    result += `}\n\nexport = ${namespaceName};`;
  } else if (!exportDefaultMatch) {
    // If no exports found but also no default, create empty module
    result += '\n\nexport {};';
  }
  
  return result.trim();
}

export function dtsToCjs(options: DtsToCjsOptions = {}): Plugin {
  const {
    outDir = 'dist',
    pattern = '**/*.d.ts',
  } = options;
  
  return {
    name: 'dts-to-cjs',
    apply: 'build',
    writeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        try {
          const searchPattern = path.join(outDir, pattern);
          const dtsFiles = await glob(searchPattern, { 
            ignore: ['**/*.d.cts', '**/*.d.mts'],
            absolute: true 
          });
          
          console.log(`\n🔄 Converting ${dtsFiles.length} .d.ts files to CommonJS format...`);
          
          for (const dtsFile of dtsFiles) {
            try {
              const content = fs.readFileSync(dtsFile, 'utf8');
              
              // Skip if file is empty or only has comments
              const meaningfulContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
              if (!meaningfulContent) {
                continue;
              }
              
              const convertedContent = convertDtsToCommonJS(content, dtsFile, options);
              const cjsFile = dtsFile.replace(/\.d\.ts$/, '.d.cts');
              
              fs.writeFileSync(cjsFile, convertedContent, 'utf8');
              console.log(`   ✅ ${path.relative(process.cwd(), dtsFile)} → ${path.relative(process.cwd(), cjsFile)}`);
            } catch (error) {
              console.error(`   ❌ Failed to convert ${dtsFile}:`, error);
            }
          }
          
          console.log(`✨ CommonJS declaration files generated successfully!\n`);
        } catch (error) {
          console.error('❌ Error during DTS to CJS conversion:', error);
        }
      }
    }
  };
}

export default dtsToCjs;