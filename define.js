import { FormValidationListElement } from './form-validation-list.js';

export function defineFormValidationList(tagName = 'form-validation-list') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, FormValidationListElement);
	}

	return true;
}

defineFormValidationList();
