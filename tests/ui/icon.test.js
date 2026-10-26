import { test, expect } from 'vitest';
import { icon } from '../../src/ui/icon.js';
import { Trophy } from 'lucide';

test('lucide ikon düğümünü SVG metnine çevirir', () => {
  const s = icon(Trophy);
  expect(s.startsWith('<svg ')).toBe(true);
  expect(s).toContain('viewBox="0 0 24 24"');
  expect(s).toContain('stroke="currentColor"');
  expect(s).toContain('aria-hidden="true"');
  expect(s.match(/<path /g)).toHaveLength(Trophy.length);
  expect(s.endsWith('</svg>')).toBe(true);
});

test('boyut, çizgi kalınlığı ve sınıf ayarlanır', () => {
  const s = icon(Trophy, { size: 28, stroke: 2.5, cls: 'x' });
  expect(s).toContain('width="28"');
  expect(s).toContain('stroke-width="2.5"');
  expect(s).toContain('class="ic x"');
});

test('öznitelik değerleri kaçışlanır', () => {
  const s = icon([['path', { d: 'M0 0"><script>' }]]);
  expect(s).not.toContain('<script>');
});
