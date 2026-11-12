import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const demoCSS = await readFile(
	new URL('../../demo/styles.css', import.meta.url),
	'utf8',
);
const componentSource = await readFile(
	new URL('../../form-validation-list.js', import.meta.url),
	'utf8',
);
const definitionSource = await readFile(
	new URL('../../define.js', import.meta.url),
	'utf8',
);

// These 19 token palettes represent the study's 62 scheme observations.
// Substitution tests authored CSS, not actual OS forced-color repainting.
const tokens = [
	'Canvas',
	'CanvasText',
	'ButtonFace',
	'ButtonText',
	'Field',
	'FieldText',
];
const palettes = [
	['#ffffff', '#000000', '#efefef', '#000000', '#ffffff', '#000000'],
	['#121212', '#ffffff', '#6b6b6b', '#ffffff', '#3b3b3b', '#ffffff'],
	['#ffffff', '#000000', '#e9e9ed', '#000000', '#ffffff', '#000000'],
	['#1c1b22', '#fbfbfe', '#2b2a33', '#fbfbfe', '#2b2a33', '#fbfbfe'],
	['#ffffff', '#000000', '#c0c0c0', '#000000d8', '#ffffff', '#000000d8'],
	['#1e1e1e', '#ffffff', '#ffffff3f', '#ffffffd8', '#ffffff3f', '#ffffffd8'],
	['#ffffff', '#000000', '#f0f0f0', '#000000', '#ffffff', '#000000'],
	['#202020', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#3d3d3d'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffee32'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#b6f6f0'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#202020'],
	['#ffffff', '#000000', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#000000', '#ffffff', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#ffffff', '#000000', '#ffffff', '#000000d8', '#ffffff', '#000000d8'],
	['#282828', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#202020', '#ffffff', '#00000000', '#ffffff', '#00000000', '#ffffff'],
];

function substitute(css, palette) {
	const colors = Object.fromEntries(
		tokens.map((token, index) => [token, palette[index]]),
	);
	return css.replace(
		/\b(CanvasText|Canvas|ButtonFace|ButtonText|FieldText|Field)\b/g,
		(token) => colors[token],
	);
}

async function measurements(locator, pseudo = null) {
	return locator.evaluate((element, selector) => {
		const context = document.createElement('canvas').getContext('2d');
		if (!context) throw new Error('Canvas color measurement unavailable.');
		const pixel = () => [...context.getImageData(0, 0, 1, 1).data];
		const paint = (color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return pixel();
		};
		const background = (node) => {
			context.clearRect(0, 0, 1, 1);
			const ancestors = [];
			for (; node; node = node.parentElement) ancestors.unshift(node);
			for (const ancestor of ancestors) {
				const style = getComputedStyle(ancestor);
				paint(style.backgroundColor);
				if (style.backgroundImage !== 'none') {
					const wash = style.backgroundImage.match(
						/^linear-gradient\((.+), \1\)$/,
					);
					if (!wash)
						throw new Error(
							`Unsupported measurement background: ${style.backgroundImage}`,
						);
					paint(wash[1]);
				}
			}
			if (pixel()[3] !== 255)
				throw new Error('Expected opaque measurement surface.');
			return pixel();
		};
		const luminance = (rgb) =>
			rgb.slice(0, 3).reduce((sum, channel, index) => {
				const value = channel / 255;
				return (
					sum +
					(value <= 0.04045
						? value / 12.92
						: ((value + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][index]
				);
			}, 0);
		const ratio = (a, b) => {
			const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
			return (values[0] + 0.05) / (values[1] + 0.05);
		};
		const style = getComputedStyle(element, selector);
		const fill = background(element);
		const foreground = paint(style.color);
		const surround = background(element.parentElement);
		const border = paint(style.borderTopColor);
		const paintsBorder =
			parseFloat(style.borderTopWidth) > 0 &&
			!['none', 'hidden'].includes(style.borderTopStyle);
		return {
			text: ratio(foreground, fill),
			boundary: Math.max(
				ratio(fill, surround),
				paintsBorder ? ratio(border, surround) : 1,
			),
		};
	}, pseudo);
}

async function fixture(page) {
	await page.goto('/test/browser/fixture.html');
	await expect(page.locator('.form-validation-list-rule-icon')).toHaveCount(
		2,
	);
	return page.locator('form-validation-list');
}

async function iconStyle(icon, property) {
	return icon.evaluate(
		(element, key) => getComputedStyle(element, '::before')[key],
		property,
	);
}

test('default status icons follow their rule foreground, with distinct shapes and localized text', async ({
	page,
}) => {
	const host = await fixture(page);
	const icons = host.locator('.form-validation-list-rule-icon');
	await host.evaluate((element) => {
		element.style.color = 'rgb(35, 67, 89)';
	});
	await expect
		.poll(() => iconStyle(icons.first(), 'color'))
		.toBe('rgb(35, 67, 89)');
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"✗"');
	await expect(host.locator('.form-validation-list-rule-state')).toHaveText([
		'',
		'',
	]);
	await host.evaluate((element) => {
		element.ruleMatchedAlt = 'Criterio cumplido';
		element.ruleUnmatchedAlt = 'Criterio pendiente';
	});
	await page.locator('input').fill('A');
	await expect(host.locator('.validation-matched')).toHaveCount(1);
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"✓"');
	await expect.poll(() => iconStyle(icons.last(), 'content')).toBe('"✗"');
	await expect
		.poll(() => iconStyle(icons.first(), 'color'))
		.toBe('rgb(35, 67, 89)');
	await expect
		.poll(() => iconStyle(icons.last(), 'color'))
		.toBe('rgb(35, 67, 89)');
	await expect(host.locator('.form-validation-list-rule-state')).toHaveText([
		'Criterio cumplido',
		'Criterio pendiente',
	]);
	await expect(icons.first()).toHaveAttribute('aria-hidden', 'true');
	await host
		.locator('li')
		.first()
		.evaluate((element) => {
			element.style.color = 'rgb(80, 40, 100)';
		});
	await expect
		.poll(() => iconStyle(icons.first(), 'color'))
		.toBe('rgb(80, 40, 100)');
});

test('canonical and legacy color hooks, custom glyphs and attribute precedence remain supported', async ({
	page,
}) => {
	const host = await fixture(page);
	await page.locator('input').fill('A');
	const icons = host.locator('.form-validation-list-rule-icon');
	await host.evaluate((element) => {
		element.style.cssText =
			'--validation-matched-color: rgb(10, 70, 30); --validation-unmatched-color: rgb(90, 20, 40); --rule-matched-icon: "M"; --rule-unmatched-icon: "U";';
	});
	await expect
		.poll(() => iconStyle(icons.first(), 'color'))
		.toBe('rgb(10, 70, 30)');
	await expect
		.poll(() => iconStyle(icons.last(), 'color'))
		.toBe('rgb(90, 20, 40)');
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"M"');
	await host.evaluate((element) => {
		element.style.setProperty('--rule-matched-color', 'rgb(20, 80, 40)');
		element.style.setProperty('--rule-unmatched-color', 'rgb(100, 30, 50)');
		element.ruleMatchedIcon = '+';
		element.ruleUnmatchedIcon = '-';
	});
	await expect
		.poll(() => iconStyle(icons.first(), 'color'))
		.toBe('rgb(20, 80, 40)');
	await expect
		.poll(() => iconStyle(icons.last(), 'color'))
		.toBe('rgb(100, 30, 50)');
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"+"');
	await expect.poll(() => iconStyle(icons.last(), 'content')).toBe('"-"');
});

test('custom rule classes retain matched and unmatched icon states', async ({
	page,
}) => {
	const host = await fixture(page);
	await host.evaluate((element) => {
		element.ruleMatchedClass = 'rule-pass';
		element.ruleUnmatchedClass = 'rule-fail';
	});
	await page.locator('input').fill('A');
	await expect(host.locator('.rule-pass')).toHaveCount(1);
	await expect(host.locator('.rule-fail')).toHaveCount(1);
	const icons = host.locator('.form-validation-list-rule-icon');
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"✓"');
	await expect.poll(() => iconStyle(icons.last(), 'content')).toBe('"✗"');
	await host.evaluate((element) => {
		element.ruleMatchedClass = 'passed';
	});
	await expect(host.locator('.passed')).toHaveCount(1);
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"✓"');
	await page.locator('input').fill('a');
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"✗"');
});

for (const scheme of ['light', 'dark']) {
	test(`${scheme}: custom-class demo preserves readable rule text and distinct field boundaries`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto('/demo/index.html');
		const field = page.locator('#custom-classes');
		const host = page.locator('form-validation-list[for=custom-classes]');
		for (const [value, state] of [
			['a', 'rule-fail'],
			['abcdef!', 'rule-pass'],
		]) {
			await field.fill(value);
			await expect(host.locator(`.${state}`)).toHaveCount(2);
			for (const rule of await host.locator('[data-pattern]').all()) {
				expect((await measurements(rule)).text).toBeGreaterThanOrEqual(
					4.5,
				);
				const icon = rule.locator('.form-validation-list-rule-icon');
				expect(
					(await measurements(icon, '::before')).text,
				).toBeGreaterThanOrEqual(4.5);
			}
			expect((await measurements(field)).boundary).toBeGreaterThanOrEqual(
				3,
			);
		}
	});
}

test('contrast measurement ignores unpainted boundaries and composites translucent foregrounds', async ({
	page,
}) => {
	await page.setContent(
		'<body style="background:white"><input style="appearance:none;background:white;color:black;border:none"></body>',
	);
	const field = page.locator('input');
	expect(await measurements(field)).toEqual({ text: 21, boundary: 1 });
	for (const border of [
		'2px hidden black',
		'0px solid black',
		'2px solid transparent',
	]) {
		await field.evaluate((element, value) => {
			element.style.border = value;
		}, border);
		expect((await measurements(field)).boundary).toBe(1);
	}
	await field.evaluate((element) => {
		element.style.border = '2px solid black';
		element.style.color = 'rgb(0 0 0 / 50%)';
	});
	expect((await measurements(field)).boundary).toBe(21);
	expect((await measurements(field)).text).toBeGreaterThan(3.9);
	expect((await measurements(field)).text).toBeLessThan(4.1);
});

test('19 study palettes retain readable default status icons and paired demo surfaces', async ({
	page,
}) => {
	await fixture(page);
	await page.locator('input').fill('A');
	await page.locator('form').evaluate((element) => {
		element.className = 'demo';
		const panel = document.createElement('section');
		panel.className = 'demo-section';
		element.before(panel);
		panel.append(element);
		const description = document.createElement('p');
		description.textContent = 'Supporting panel text';
		panel.prepend(description);
		const code = document.createElement('pre');
		code.textContent = 'Example code';
		panel.append(code);
		const footer = document.createElement('footer');
		footer.textContent = 'Author credit';
		document.body.append(footer);
	});
	for (const [index, palette] of palettes.entries()) {
		const style = await page.addStyleTag({
			content: substitute(demoCSS, palette),
		});
		for (const selector of [
			'.demo-section > p',
			'.demo',
			'pre',
			'footer',
			'input',
			'button',
		]) {
			expect(
				(await measurements(page.locator(selector))).text,
				`palette ${index}: ${selector}`,
			).toBeGreaterThanOrEqual(4.5);
		}
		for (const icon of await page
			.locator('.form-validation-list-rule-icon')
			.all())
			expect(
				(await measurements(icon, '::before')).text,
				`palette ${index}: status icon`,
			).toBeGreaterThanOrEqual(4.5);
		for (const selector of ['input', 'button'])
			expect(
				(await measurements(page.locator(selector))).boundary,
				`palette ${index}: ${selector}`,
			).toBeGreaterThanOrEqual(3);
		await page.locator('button').hover();
		expect(
			(await measurements(page.locator('button'))).text,
			`palette ${index}: hover`,
		).toBeGreaterThanOrEqual(4.5);
		await style.evaluate((element) => element.remove());
	}
});

for (const scheme of ['light', 'dark']) {
	test(`${scheme}: icons inherit readable text on ordinary reading and control surfaces`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: scheme });
		const host = await fixture(page);
		await page.locator('input').fill('A');
		for (const pair of [
			'CanvasText; background:Canvas',
			'FieldText; background:Field',
			'ButtonText; background:ButtonFace',
		]) {
			test.fail(
				pair.startsWith('ButtonText') &&
					scheme === 'dark' &&
					process.platform === 'linux' &&
					test.info().project.name === 'webkit',
				'Bundled Ubuntu WebKit dark native button pair limitation, outside the study palettes.',
			);
			await host.evaluate((element, value) => {
				element.style.cssText = `color:${value}`;
			}, pair);
			for (const icon of await host
				.locator('.form-validation-list-rule-icon')
				.all())
				expect(
					(await measurements(icon, '::before')).text,
				).toBeGreaterThanOrEqual(4.5);
		}
	});
}

test('keyboard validation, localized announcements, descriptions, submission and cleanup remain intact', async ({
	page,
	browserName,
}) => {
	const host = await fixture(page);
	await host.evaluate((element) => {
		element.announcement = '{matched} de {total}';
	});
	const field = page.getByRole('textbox', { name: 'Username' });
	await page.keyboard.press('Tab');
	await expect(field).toBeFocused();
	await expect(field).toHaveAttribute(
		'aria-describedby',
		/form-validation-list/,
	);
	await page.keyboard.type('A');
	await expect(host.locator('[aria-live]')).toHaveText('1 de 2');
	await expect(field).not.toHaveAttribute(
		'aria-describedby',
		/form-validation-list/,
	);
	await expect
		.poll(() => field.evaluate((element) => element.validity.customError))
		.toBe(true);
	// macOS Safari uses Option-Tab to include buttons in native keyboard navigation.
	await page.keyboard.press(
		browserName === 'webkit' && process.platform === 'darwin'
			? 'Alt+Tab'
			: 'Tab',
	);
	await expect(page.getByRole('button', { name: 'Submit' })).toBeFocused();
	await expect(field).toHaveAttribute(
		'aria-describedby',
		/form-validation-list/,
	);
	await field.fill('A1');
	await expect(host.locator('.validation-matched')).toHaveCount(2);
	await expect(field).toHaveJSProperty('validationMessage', '');
	await page.locator('form').evaluate((form) => {
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			form.dataset.submitted = new FormData(form).get('username');
		});
	});
	await page.getByRole('button', { name: 'Submit' }).click();
	await expect(page.locator('form')).toHaveAttribute('data-submitted', 'A1');
	await host.evaluate((element) => element.remove());
	await expect(field).not.toHaveAttribute(
		'aria-describedby',
		/form-validation-list/,
	);
	await expect(page.locator('.form-validation-list-live-region')).toHaveCount(
		0,
	);
	await expect(field).toHaveValue('A1');
});

test('forced colors retain automatic adjustment, distinct states and native keyboard focus', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName !== 'chromium',
		'Forced-color emulation is available only in Chromium.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	const host = await fixture(page);
	await page.locator('input').fill('A');
	await page.locator('input').press('Tab');
	await expect(page.getByRole('button')).toBeFocused();
	await expect(host).toHaveCSS('forced-color-adjust', 'auto');
	const icons = host.locator('.form-validation-list-rule-icon');
	await expect.poll(() => iconStyle(icons.first(), 'content')).toBe('"✓"');
	await expect.poll(() => iconStyle(icons.last(), 'content')).toBe('"✗"');
	for (const icon of await icons.all()) {
		await expect(icon).toHaveCSS('forced-color-adjust', 'auto');
		expect(
			(await measurements(icon, '::before')).text,
		).toBeGreaterThanOrEqual(4.5);
	}
});

for (const mode of ['dark', 'increased contrast', 'forced colors']) {
	test(`${mode}: custom icon pairs retain readable states without suppressing user colors`, async ({
		page,
		browserName,
	}) => {
		test.skip(
			mode === 'forced colors' && browserName !== 'chromium',
			'Forced-color emulation is available only in Chromium.',
		);
		await page.emulateMedia({
			colorScheme: 'dark',
			contrast: mode === 'increased contrast' ? 'more' : 'no-preference',
			forcedColors: mode === 'forced colors' ? 'active' : 'none',
		});
		await page.goto('/demo/index.html');
		const host = page.locator('.custom-styled');
		await expect(
			host.locator('.form-validation-list-rule-icon'),
		).toHaveCount(3);
		for (const [value, state, glyph] of [
			['a', 'unmatched', '"✘"'],
			['a@b.co', 'matched', '"✔"'],
		]) {
			await page.locator('#email').fill(value);
			await expect(host.locator(`.validation-${state}`)).toHaveCount(3);
			for (const icon of await host
				.locator('.form-validation-list-rule-icon')
				.all()) {
				expect(
					(await measurements(icon, '::before')).text,
				).toBeGreaterThanOrEqual(4.5);
				await expect.poll(() => iconStyle(icon, 'content')).toBe(glyph);
				if (mode === 'forced colors')
					await expect(icon).toHaveCSS('forced-color-adjust', 'auto');
			}
		}
		if (mode === 'increased contrast') {
			await expect(page.locator('footer')).toHaveCSS(
				'color',
				await page
					.locator('body')
					.evaluate((element) => getComputedStyle(element).color),
			);
			await page.locator('button').first().hover();
			await expect(page.locator('button').first()).toHaveCSS(
				'text-decoration-line',
				'underline',
			);
		}
	});
}

async function localCDN(page) {
	// Exercise each demo's import contract using this branch, not an old release or network availability.
	await page.route(/https:\/\/(?:esm\.sh|unpkg\.com)\//, async (route) => {
		const definition = new URL(route.request().url()).pathname.endsWith(
			'/define.js',
		);
		await route.fulfill({
			contentType: 'text/javascript',
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: definition
				? definitionSource.replaceAll(
						"'./form-validation-list.js'",
						"'/form-validation-list.js'",
					)
				: componentSource,
		});
	});
}

for (const demo of ['index.html', 'esm.html', 'unpkg.html']) {
	test(`${demo}: code/live layout, native focus, custom colors and validation work at wide and narrow widths`, async ({
		page,
	}) => {
		await localCDN(page);
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`/demo/${demo}`);
		await expect(
			page.locator('.form-validation-list-rule-icon').first(),
		).toBeAttached();
		for (const width of [1280, 320]) {
			await page.setViewportSize({ width, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
			const pairs = page.locator('.code-demo-pair');
			expect(await pairs.count()).toBeGreaterThan(0);
			for (const pair of await pairs.all()) {
				const code = await pair.locator('pre').boundingBox();
				const live = await pair.locator('.demo').boundingBox();
				expect(code).not.toBeNull();
				expect(live).not.toBeNull();
				if (width === 1280) {
					expect(code.x + code.width).toBeLessThanOrEqual(live.x);
					expect(Math.abs(code.y - live.y)).toBeLessThan(2);
				} else expect(code.y + code.height).toBeLessThanOrEqual(live.y);
			}
		}
		for (const field of await page.locator('input:visible').all()) {
			expect((await measurements(field)).text).toBeGreaterThanOrEqual(
				4.5,
			);
			expect((await measurements(field)).boundary).toBeGreaterThanOrEqual(
				3,
			);
		}
		const firstField = page.locator('input').first();
		await firstField.focus();
		await firstField.fill('Abc12345!');
		await expect(
			page
				.locator('form-validation-list')
				.first()
				.locator('.validation-matched'),
		).toHaveCount(3);
		await expect(firstField).toBeFocused();
		await expect(firstField).toHaveCSS('outline-style', 'auto');
		if (demo === 'index.html') {
			await page.locator('#email').fill('a@b.co');
			const icons = page.locator(
				'.custom-styled .form-validation-list-rule-icon',
			);
			await expect(
				page.locator('.custom-styled .validation-matched'),
			).toHaveCount(3);
			for (const icon of await icons.all())
				expect(
					(await measurements(icon, '::before')).text,
				).toBeGreaterThanOrEqual(4.5);
			await page.locator('#email').fill('a');
			await expect(
				page.locator('.custom-styled .validation-unmatched'),
			).toHaveCount(3);
			for (const icon of await icons.all())
				expect(
					(await measurements(icon, '::before')).text,
				).toBeGreaterThanOrEqual(4.5);
		}
		expect(errors).toEqual([]);
	});
}

for (const mode of ['no JavaScript', 'module failure']) {
	test(`${mode}: authored fields and rule text remain usable`, async ({
		browser,
	}) => {
		const context = await browser.newContext({
			javaScriptEnabled: mode !== 'no JavaScript',
		});
		try {
			const page = await context.newPage();
			if (mode === 'module failure')
				await page.route('**/define.js', (route) => route.abort());
			await page.goto('/demo/index.html');
			await expect(
				page.getByLabel('Username:', { exact: true }),
			).toBeVisible();
			await expect(
				page.locator('form-validation-list').first(),
			).toContainText('At least one capital letter');
			await page.getByLabel('Username:', { exact: true }).fill('Abc1');
			await expect(
				page.locator('.form-validation-list-rule-icon'),
			).toHaveCount(0);
		} finally {
			await context.close();
		}
	});
}
