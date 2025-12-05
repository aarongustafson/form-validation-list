import { beforeAll } from 'vitest';
import { FormValidationListElement } from '../form-validation-list.js';

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get('form-validation-list')) {
		customElements.define(
			'form-validation-list',
			FormValidationListElement,
		);
	}

	// Make the class available globally for testing static methods
	globalThis.FormValidationListElement = FormValidationListElement;
});
