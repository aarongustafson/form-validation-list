import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('displayed demo code', () => {
	it.each(['index.html', 'esm.html', 'unpkg.html'])(
		'%s uses consistent two-space indentation instead of tabs',
		(page) => {
			const blocks = [
				...read(`../demo/${page}`).matchAll(
					/<pre><code>([\s\S]*?)<\/code><\/pre>/g,
				),
			].map((match) => match[1]);
			expect(blocks.length).toBeGreaterThan(0);
			for (const block of blocks) {
				expect(block).not.toContain('\t');
				for (const line of block.split('\n')) {
					expect(line.match(/^ */)[0].length % 2).toBe(0);
				}
			}
		},
	);

	it('aligns the Spanish component attributes with its for attribute', () => {
		const attributes = read('../demo/index.html')
			.match(
				/&lt;form-validation-list\n\s+for="contrasena"[\s\S]*?&gt;/,
			)[0]
			.split('\n')
			.slice(1);
		expect(attributes).toHaveLength(5);
		for (const attribute of attributes)
			expect(attribute).toMatch(/^ {4}\S/);
	});
});

describe('system-color styling contracts', () => {
	it.each(['matched', 'unmatched'])(
		'defaults %s icons to the authored foreground, preserving both color hooks',
		(state) => {
			const source = read('../form-validation-list.js');
			expect(source).toContain(
				`color: var(--rule-${state}-color, var(--validation-${state}-color, currentColor))`,
			);
			const manifest = JSON.parse(read('../custom-elements.json'));
			const property =
				manifest.modules[0].declarations[0].cssProperties.find(
					(entry) => entry.name === `--rule-${state}-color`,
				);
			expect(property.default).toBe('currentColor');
			expect(read('../README.md')).toMatch(
				new RegExp(
					'`--rule-' + state + '-color`\\s*\\|\\s*`currentColor`',
				),
			);
		},
	);

	it('keeps demo surfaces paired, necessary borders visible, and native focus available', () => {
		const css = read('../demo/styles.css');
		expect(css).not.toMatch(
			/GrayText|SelectedItem|HighlightText|ActiveText/,
		);
		expect(css).not.toMatch(/opacity:\s*0\.8|:focus-visible/);
		expect(css + read('../form-validation-list.js')).not.toMatch(
			/forced-color-adjust:\s*none/,
		);
		expect(css).toMatch(/border:\s*1px solid FieldText/);
		expect(css).toMatch(/border:\s*1px solid ButtonText/);
		expect(css).toMatch(/\.demo\s*\{[^}]*color:\s*CanvasText/);
		expect(css).toMatch(/\.demo-section\s*\{[^}]*color:\s*ButtonText/);
	});
});
