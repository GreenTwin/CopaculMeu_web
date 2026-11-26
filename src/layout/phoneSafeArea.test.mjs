import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const tokens = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
const components = readFileSync(new URL('../styles/components.css', import.meta.url), 'utf8');

function mediaBlock(source, header) {
  const start = source.indexOf(header);
  assert.notEqual(start, -1, `missing ${header}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  assert.fail(`unclosed ${header}`);
}

function declaration(block, selector) {
  const pattern = new RegExp(`${selector.replaceAll('.', '\\.')}\\s*\\{([^}]*)\\}`);
  const match = block.match(pattern);
  assert.ok(match, `missing ${selector}`);
  return match[1];
}

const phone = mediaBlock(components, '@media (max-width: 768px)');
const desktop = components.slice(0, components.indexOf('@media (max-width: 768px)'));

test('phone sheet and bottom controls sit 8px above the system nav', () => {
  assert.match(tokens, /--safe-area-bottom:\s*env\(safe-area-inset-bottom,\s*0px\)/);
  assert.match(tokens, /--above-system-nav:\s*calc\(var\(--safe-area-bottom\) \+ 8px\)/);

  const sheet = declaration(phone, '.tree-drawer');
  assert.match(sheet, /bottom:\s*var\(--above-system-nav\)/);
  assert.match(sheet, /max-height:\s*calc\(82vh - var\(--above-system-nav\)\)/);
  assert.doesNotMatch(sheet, /bottom:\s*\d+px/);

  const body = declaration(phone, '.drawer-body');
  assert.match(body, /min-height:\s*0/);
  assert.match(body, /flex:\s*1 1 auto/);

  assert.match(declaration(phone, '.floating-hud'), /bottom:\s*calc\(16px \+ var\(--above-system-nav\)\)/);
  assert.match(declaration(phone, '.legend-card'), /bottom:\s*calc\(80px \+ var\(--above-system-nav\)\)/);
});

test('a zero inset keeps the 8px margin and the desktop sidebar unchanged', () => {
  assert.match(tokens, /env\(safe-area-inset-bottom,\s*0px\)/);
  assert.doesNotMatch(tokens, /--safe-area-bottom:\s*\d+px/);
  assert.match(tokens, /--above-system-nav:\s*calc\(var\(--safe-area-bottom\) \+ 8px\)/);

  const sidebar = declaration(desktop, '.tree-drawer');
  assert.match(sidebar, /bottom:\s*24px/);
  assert.doesNotMatch(sidebar, /safe-area-bottom/);
  assert.match(declaration(desktop, '.floating-hud'), /bottom:\s*24px/);
  assert.doesNotMatch(declaration(desktop, '.floating-hud'), /safe-area-bottom/);
  assert.match(declaration(desktop, '.legend-card'), /bottom:\s*80px/);
  assert.doesNotMatch(declaration(desktop, '.legend-card'), /safe-area-bottom/);
});
