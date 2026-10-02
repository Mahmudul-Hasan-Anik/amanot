/**
 * check-tokens.js
 * Scans code files for:
 * 1. Hardcoded hex color codes (e.g. #0F5E4A, #FFF) outside src/theme/
 * 2. Raw fontSize numbers (e.g. fontSize: 16)
 *
 * Usage:
 *   node scripts/check-tokens.js                      # Audit entire app
 *   node scripts/check-tokens.js app/(auth)/login.tsx # Strict verify single file (fails if count > 0)
 */

const fs = require('fs');
const path = require('path');

const targetArg = process.argv[2];

const HEX_REGEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FONT_SIZE_REGEX = /fontSize\s*:\s*(\d+)/g;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const hexMatches = [];
  const fontMatches = [];

  lines.forEach((line, index) => {
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    let match;
    const lineHex = new RegExp(HEX_REGEX);
    while ((match = lineHex.exec(line)) !== null) {
      hexMatches.push({ line: index + 1, value: match[0], content: line.trim() });
    }

    const lineFont = new RegExp(FONT_SIZE_REGEX);
    while ((match = lineFont.exec(line)) !== null) {
      fontMatches.push({ line: index + 1, value: match[1], content: line.trim() });
    }
  });

  return { hexMatches, fontMatches };
}

function walkDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.expo' && entry.name !== '.git') {
        files = files.concat(walkDir(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      // Exclude theme files from hex check
      if (!fullPath.includes(path.join('src', 'theme'))) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

if (targetArg) {
  const fullTarget = path.resolve(process.cwd(), targetArg);
  if (!fs.existsSync(fullTarget)) {
    console.error(`Target file does not exist: ${targetArg}`);
    process.exit(1);
  }

  const { hexMatches, fontMatches } = checkFile(fullTarget);
  console.log(`\n======================================================`);
  console.log(`Token Check: ${targetArg}`);
  console.log(`======================================================`);
  console.log(`Hardcoded Hex Colors: ${hexMatches.length}`);
  console.log(`Raw Font Sizes:       ${fontMatches.length}`);

  if (hexMatches.length > 0) {
    console.log(`\n[!] Hardcoded Hex Matches:`);
    hexMatches.forEach(m => console.log(`  Line ${m.line}: ${m.value} -> "${m.content}"`));
  }

  if (fontMatches.length > 0) {
    console.log(`\n[!] Raw Font Size Matches:`);
    fontMatches.forEach(m => console.log(`  Line ${m.line}: fontSize: ${m.value} -> "${m.content}"`));
  }

  if (hexMatches.length > 0 || fontMatches.length > 0) {
    console.error(`\nFAIL: Found hardcoded tokens. Replace with theme tokens before marking screen done.`);
    process.exit(1);
  } else {
    console.log(`\nPASS: 0 hardcoded hex colors and 0 raw font sizes! Screen is token-compliant.`);
    process.exit(0);
  }
} else {
  console.log(`\nScanning all app screen files for hardcoded tokens...\n`);
  const appDir = path.join(process.cwd(), 'app');
  const files = walkDir(appDir);

  let totalHex = 0;
  let totalFonts = 0;

  console.log(`File`.padEnd(42) + `Hex Colors`.padEnd(14) + `Raw FontSizes`);
  console.log(`-`.repeat(70));

  files.forEach(f => {
    const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
    const { hexMatches, fontMatches } = checkFile(f);
    totalHex += hexMatches.length;
    totalFonts += fontMatches.length;
    if (hexMatches.length > 0 || fontMatches.length > 0) {
      console.log(`${rel.padEnd(42)} ${String(hexMatches.length).padStart(8)}      ${String(fontMatches.length).padStart(10)}`);
    }
  });

  console.log(`-`.repeat(70));
  console.log(`TOTAL`.padEnd(42) + ` ${String(totalHex).padStart(8)}      ${String(totalFonts).padStart(10)}\n`);
}
