#!/usr/bin/env node
/**
 * Smoke test: detects C-style newline-in-string corruption in route pages.
 * Run: node test/smoke-test.js
 * 
 * Corruption occurs when a string literal in html += '...' contains an actual
 * newline byte (0x0A) instead of a \n escape sequence. This breaks the parser
 * and causes SyntaxError or unexpected behavior at runtime.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'src', 'routes');

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const corruptedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/html\s*\+=/.test(line)) continue;

    const lineBytes = Buffer.from(line, 'utf8');
    let inString = false;

    for (let j = 0; j < lineBytes.length; j++) {
      const b = lineBytes[j];
      if (!inString && (b === 39 || b === 34)) {
        inString = true;
      } else if (inString && b === 10) {
        // Actual newline byte found inside a string literal
        corruptedLines.push(i + 1);
        break;
      } else if (inString && (b === 39 || b === 34)) {
        inString = false;
      }
    }
  }

  return corruptedLines;
}

function main() {
  const files = fs.readdirSync(ROUTES_DIR)
    .filter(f => f.endsWith('.ts') && !f.includes('.bak') && !f.includes('.orig'));

  const results = [];
  for (const file of files) {
    const corrupted = scanFile(path.join(ROUTES_DIR, file));
    if (corrupted.length > 0) {
      results.push({ file, lines: corrupted });
    }
  }

  if (results.length === 0) {
    console.log('✅ Smoke test PASSED: No string corruption found in', files.length, 'route files');
    process.exit(0);
  } else {
    console.log('❌ Smoke test FAILED: Corruption detected in:');
    for (const r of results) {
      console.log('  ' + r.file + ': lines', r.lines.join(', '));
    }
    process.exit(1);
  }
}

main();