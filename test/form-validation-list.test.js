import { describe, it, expect, beforeEach } from 'vitest';
import { FormValidationListElement } from '../form-validation-list.js';

describe('FormValidationListElement', () => {
	let element;

	beforeEach(() => {
		element = document.createElement('form-validation-list');
		document.body.appendChild(element);
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

	it('should have a shadow root', () => {
		expect(element.shadowRoot).toBeTruthy();
	});

	// Add more tests here
});
