/**
 * FormValidationListElement - A web component comprising a list of validation rules for a field.
 *
 * @element form-validation-list
 *
 * @attr {string} example-attribute - Description of the attribute
 *
 * @fires form-validation-list:event-name - Description of the event
 *
 * @slot - Default slot for content
 *
 * @cssprop --component-name-color - Description of CSS custom property
 */
export class FormValidationListElement extends HTMLElement {
	static get observedAttributes() {
		return ['example-attribute'];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}

	connectedCallback() {
		this.render();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			this.render();
		}
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}
			</style>
			<slot></slot>
		`;
	}
}
