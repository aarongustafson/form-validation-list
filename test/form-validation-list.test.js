import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/dom';
import { FormValidationListElement } from '../form-validation-list.js';

describe('FormValidationListElement', () => {
	let element;
	let input;

	beforeEach(() => {
		// Create a test input field
		input = document.createElement('input');
		input.type = 'text';
		input.id = 'test-input';
		document.body.appendChild(input);

		// Create the validation list element
		element = document.createElement('form-validation-list');
		element.setAttribute('for', 'test-input');
		document.body.appendChild(element);
	});

	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('should be defined', () => {
		expect(customElements.get('form-validation-list')).toBe(
			FormValidationListElement,
		);
	});

	it('should create an instance', () => {
		expect(element).toBeInstanceOf(FormValidationListElement);
		expect(element).toBeInstanceOf(HTMLElement);
	});

	it('should not have a shadow root (uses light DOM)', () => {
		expect(element.shadowRoot).toBeFalsy();
	});

	it('should have role="list"', () => {
		expect(element.getAttribute('role')).toBe('list');
	});

	it('should find the associated input field', () => {
		expect(element._field).toBe(input);
	});

	it('should set up aria-describedby on the input field', () => {
		// Need to add rules for the element to set up aria-describedby
		element.innerHTML = '<ul><li data-pattern="[A-Z]+">Capital</li></ul>';
		element.disconnectedCallback();
		element.connectedCallback();

		const describedBy = input.getAttribute('aria-describedby');
		expect(describedBy).toBeTruthy();
		expect(describedBy).toContain(element.id);
	});

	it('should preserve existing aria-describedby values', () => {
		// Clean up previous element
		element.remove();

		// Set existing describedby
		input.setAttribute('aria-describedby', 'existing-id');

		// Create new element
		element = document.createElement('form-validation-list');
		element.setAttribute('for', 'test-input');
		document.body.appendChild(element);

		const describedBy = input.getAttribute('aria-describedby');
		expect(describedBy).toContain('existing-id');
		expect(describedBy).toContain(element.id);
	});

	describe('property reflection', () => {
		it('should reflect fieldId property to the for attribute', () => {
			const otherInput = document.createElement('input');
			otherInput.id = 'other-input';
			document.body.appendChild(otherInput);

			const localElement = document.createElement('form-validation-list');
			document.body.appendChild(localElement);

			localElement.fieldId = 'other-input';
			expect(localElement.getAttribute('for')).toBe('other-input');
		});

		it('should reflect triggerEvent property to the attribute', () => {
			const localElement = document.createElement('form-validation-list');
			localElement.triggerEvent = 'change';
			expect(localElement.getAttribute('trigger-event')).toBe('change');
		});

		it('should upgrade properties set before connecting', async () => {
			const upgradeInput = document.createElement('input');
			upgradeInput.id = 'upgrade-input';
			document.body.appendChild(upgradeInput);

			const localElement = document.createElement('form-validation-list');
			localElement.fieldId = 'upgrade-input';
			localElement.triggerEvent = 'change';
			localElement.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital</li></ul>`;
			localElement.setAttribute('each-delay', '0');
			document.body.appendChild(localElement);

			upgradeInput.value = 'TEST';
			upgradeInput.dispatchEvent(new Event('change'));

			await waitFor(() => {
				expect(
					localElement
						.querySelector('[data-pattern]')
						.classList.contains('validation-matched'),
				).toBe(true);
			});
		});
	});

	describe('validation rules', () => {
		beforeEach(() => {
			element.innerHTML = `
				<ul>
					<li data-pattern="[A-Z]+">At least one capital letter</li>
					<li data-pattern="[a-z]+">At least one lowercase letter</li>
					<li data-pattern="[0-9]+">At least one number</li>
				</ul>
			`;
			element.setAttribute('each-delay', '0');

			// Trigger connectedCallback again to pick up new rules
			element.disconnectedCallback();
			element.connectedCallback();
		});

		it('should find all validation rules', () => {
			expect(element._rules.length).toBe(3);
		});

		it('should set role="listitem" on rule elements', () => {
			const rules = element.querySelectorAll('[data-pattern]');
			rules.forEach((rule) => {
				expect(rule.getAttribute('role')).toBe('listitem');
			});
		});

		it('should validate input value against rules', async () => {
			input.value = 'Test123';
			input.dispatchEvent(new Event('input'));

			await waitFor(() => {
				const rules = element.querySelectorAll('[data-pattern]');
				expect(rules[0].classList.contains('validation-matched')).toBe(
					true,
				);
				expect(rules[1].classList.contains('validation-matched')).toBe(
					true,
				);
				expect(rules[2].classList.contains('validation-matched')).toBe(
					true,
				);
			});
		});

		it('should mark unmatched rules', async () => {
			input.value = 'test'; // Only lowercase
			input.dispatchEvent(new Event('input'));

			await waitFor(() => {
				const rules = element.querySelectorAll('[data-pattern]');
				expect(
					rules[0].classList.contains('validation-unmatched'),
				).toBe(true);
				expect(rules[1].classList.contains('validation-matched')).toBe(
					true,
				);
				expect(
					rules[2].classList.contains('validation-unmatched'),
				).toBe(true);
			});
		});

		it('should add validation classes to the input field', async () => {
			input.value = 'Test123';
			input.dispatchEvent(new Event('input'));

			await waitFor(() => {
				expect(input.classList.contains('validation-valid')).toBe(true);
				expect(input.classList.contains('validation-invalid')).toBe(
					false,
				);
			});
		});

		it('should update field custom validity', async () => {
			input.value = 'test'; // Invalid
			input.dispatchEvent(new Event('input'));

			await waitFor(() => {
				expect(input.validationMessage).toBeTruthy();
			});

			input.value = 'Test123'; // Valid
			input.dispatchEvent(new Event('input'));

			await waitFor(() => {
				expect(input.validationMessage).toBe('');
			});
		});

		it('should fire validation event', () => {
			return new Promise((resolve) => {
				element.addEventListener(
					'form-validation-list:validated',
					(e) => {
						expect(e.detail.isValid).toBeDefined();
						expect(e.detail.matchedRules).toBeDefined();
						expect(e.detail.totalRules).toBe(3);
						expect(e.detail.field).toBe(input);
						resolve();
					},
				);

				input.value = 'Test123';
				input.dispatchEvent(new Event('input'));
			});
		});
	});

	describe('configuration attributes', () => {
		it('should use default trigger event', () => {
			expect(element.triggerEvent).toBe('input');
		});

		it('should allow custom trigger event', () => {
			element.setAttribute('trigger-event', 'keyup');
			expect(element.triggerEvent).toBe('keyup');
		});

		it('should use default each-delay', () => {
			expect(element.eachDelay).toBe(150);
		});

		it('should allow custom each-delay', () => {
			element.setAttribute('each-delay', '200');
			expect(element.eachDelay).toBe(200);
		});

		it('should use default class names', () => {
			expect(element.fieldInvalidClass).toBe('validation-invalid');
			expect(element.fieldValidClass).toBe('validation-valid');
			expect(element.ruleUnmatchedClass).toBe('validation-unmatched');
			expect(element.ruleMatchedClass).toBe('validation-matched');
		});

		it('should allow custom class names', () => {
			element.setAttribute('field-invalid-class', 'custom-invalid');
			element.setAttribute('field-valid-class', 'custom-valid');
			element.setAttribute('rule-unmatched-class', 'custom-unmatched');
			element.setAttribute('rule-matched-class', 'custom-matched');

			expect(element.fieldInvalidClass).toBe('custom-invalid');
			expect(element.fieldValidClass).toBe('custom-valid');
			expect(element.ruleUnmatchedClass).toBe('custom-unmatched');
			expect(element.ruleMatchedClass).toBe('custom-matched');
		});

			it('should rebind validation handler when trigger-event changes', async () => {
				element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital letter</li></ul>`;
				element.setAttribute('each-delay', '0');
				element.disconnectedCallback();
				element.connectedCallback();

				element.setAttribute('trigger-event', 'change');
				input.value = 'TEST';
				input.dispatchEvent(new Event('change'));

				await waitFor(() => {
					expect(
						element
							.querySelector('[data-pattern]')
							.classList.contains('validation-matched'),
					).toBe(true);
				});
			});

			it('should refresh field classes when field-valid-class changes', async () => {
				element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital letter</li></ul>`;
				element.setAttribute('each-delay', '0');
				element.disconnectedCallback();
				element.connectedCallback();

				input.value = 'TEST';
				input.dispatchEvent(new Event('input'));
				await waitFor(() => {
					expect(input.classList.contains('validation-valid')).toBe(true);
				});

				element.setAttribute('field-valid-class', 'custom-good');
				await waitFor(() => {
					expect(input.classList.contains('custom-good')).toBe(true);
					expect(input.classList.contains('validation-valid')).toBe(
						false,
					);
				});
			});

			it('should refresh rule classes when rule-matched-class changes', async () => {
				element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital letter</li></ul>`;
				element.setAttribute('each-delay', '0');
				element.disconnectedCallback();
				element.connectedCallback();

				input.value = 'TEST';
				input.dispatchEvent(new Event('input'));
				await waitFor(() => {
					expect(
						element
							.querySelector('[data-pattern]')
							.classList.contains('validation-matched'),
					).toBe(true);
				});

				element.setAttribute('rule-matched-class', 'custom-match');
				await waitFor(() => {
					const rule = element.querySelector('[data-pattern]');
					expect(rule.classList.contains('custom-match')).toBe(true);
					expect(rule.classList.contains('validation-matched')).toBe(
						false,
					);
				});
			});
	});

	describe('public API', () => {
		beforeEach(() => {
			element.innerHTML = `
				<ul>
					<li data-pattern="[A-Z]+">Capital letter</li>
					<li data-pattern="[0-9]+">Number</li>
				</ul>
			`;
			element.disconnectedCallback();
			element.connectedCallback();
		});

		it('should provide validate() method', () => {
			expect(typeof element.validate).toBe('function');
		});

		it('validate() should return validation state', () => {
			input.value = 'Test123';
			const isValid = element.validate();
			expect(typeof isValid).toBe('boolean');
		});

		it('should provide isValid getter', () => {
			input.value = 'Test123';
			element.validate();
			expect(typeof element.isValid).toBe('boolean');
		});
	});

	describe('cleanup', () => {
		it('should cleanup when disconnected', async () => {
			element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital</li></ul>`;
			element.setAttribute('each-delay', '0');
			element.disconnectedCallback();
			element.connectedCallback();

			input.value = 'Test';
			input.dispatchEvent(new Event('input'));
			await waitFor(() => {
				expect(input.classList.contains('validation-valid')).toBe(true);
			});

			element.disconnectedCallback();

			// Field should not have validation classes after cleanup
			expect(input.classList.contains('validation-valid')).toBe(false);
			expect(input.classList.contains('validation-invalid')).toBe(false);
		});

		it('should cleanup when for attribute changes', () => {
			element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital</li></ul>`;
			element.disconnectedCallback();
			element.connectedCallback();

			const oldField = element._field;
			element.setAttribute('for', 'non-existent');

			expect(element._field).not.toBe(oldField);
		});
	});
});
