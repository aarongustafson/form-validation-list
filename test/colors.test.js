import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

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
