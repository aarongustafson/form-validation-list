/**
 * FormValidationListElement - A web component comprising a list of validation rules for a field.
 *
 * @element form-validation-list
 *
 * @attr {string} for - The ID of the input field to validate
 * @attr {string} trigger-event - The event to trigger validation on (default: "input")
 * @attr {number} each-delay - Delay in milliseconds between each rule being classified (default: 150)
 * @attr {string} field-invalid-class - The class to apply when the field is invalid (default: "validation-invalid")
 * @attr {string} field-valid-class - The class to apply when the field is valid (default: "validation-valid")
 * @attr {string} rule-unmatched-class - The class to apply when the rule's requirement are not met (default: "validation-unmatched")
 * @attr {string} rule-matched-class - The class to apply when the rule's requirement are met (default: "validation-matched")
 * @attr {string} validation-message - Custom validation message template with {matched} and {total} placeholders (default: "Please match all validation requirements ({matched} of {total})")
 *
 * @fires form-validation-list:validated - Fired when validation completes with details about matched/total rules
 *
 * @slot - Default slot for list items with data-pattern attributes
 *
 * @cssprop --validation-icon-matched - Content for the matched state icon (default: "✓")
 * @cssprop --validation-icon-unmatched - Content for the unmatched state icon (default: "✗")
 * @cssprop --validation-icon-size - Size of the validation icons (default: 1em)
 * @cssprop --validation-matched-color - Color for matched rules (default: green)
 * @cssprop --validation-unmatched-color - Color for unmatched rules (default: red)
 */
export class FormValidationListElement extends HTMLElement {
	static #stylesInjected = false;
	static #styleId = 'form-validation-list-styles';

	static get observedAttributes() {
		return ['for', 'validation-message'];
	}

	static #injectStyles() {
		if (FormValidationListElement.#stylesInjected) {
			return;
		}

		const style = document.createElement('style');
		style.id = FormValidationListElement.#styleId;
		style.textContent = `
			form-validation-list {
				display: block;
			}

			form-validation-list [data-pattern]::before {
				content: var(--validation-icon-unmatched, "✗");
				display: inline-block;
				width: var(--validation-icon-size, 1em);
				font-size: var(--validation-icon-size, 1em);
				color: var(--validation-unmatched-color, red);
			}

			form-validation-list [data-pattern].validation-matched::before {
				content: var(--validation-icon-matched, "✓");
				color: var(--validation-matched-color, green);
			}

			form-validation-list [data-pattern].validation-unmatched::before {
				content: var(--validation-icon-unmatched, "✗");
				color: var(--validation-unmatched-color, red);
			}
		`;

		document.head.appendChild(style);
		FormValidationListElement.#stylesInjected = true;
	}

	static #generateId() {
		return `form-validation-list-${Math.random().toString(36).substr(2, 9)}`;
	}

	constructor() {
		super();
		// Use light DOM instead of shadow DOM
		this._field = null;
		this._rules = [];
		this._validationHandler = null;
		this._isValid = false;
		this._validClasses = null;
		this._invalidClasses = null;
		this._matchedClasses = null;
		this._unmatchedClasses = null;
	}

	connectedCallback() {
		this.setAttribute('role', 'list');
		FormValidationListElement.#injectStyles();
		this._setupValidation();
	}

	disconnectedCallback() {
		this._cleanup();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (name === 'for' && oldValue !== newValue) {
			this._cleanup();
			this._setupValidation();
		} else if (
			name === 'validation-message' &&
			oldValue !== newValue &&
			this._field
		) {
			// Re-validate to update the message
			this._validateField();
		}
	}

	// Getters for configuration with cached class names
	get triggerEvent() {
		return this.getAttribute('trigger-event') || 'input';
	}

	get eachDelay() {
		return parseInt(this.getAttribute('each-delay') || '150', 10);
	}

	get fieldInvalidClass() {
		if (!this._invalidClasses) {
			this._invalidClasses =
				this.getAttribute('field-invalid-class') ||
				'validation-invalid';
		}
		return this._invalidClasses;
	}

	get fieldValidClass() {
		if (!this._validClasses) {
			this._validClasses =
				this.getAttribute('field-valid-class') || 'validation-valid';
		}
		return this._validClasses;
	}

	get ruleUnmatchedClass() {
		if (!this._unmatchedClasses) {
			this._unmatchedClasses =
				this.getAttribute('rule-unmatched-class') ||
				'validation-unmatched';
		}
		return this._unmatchedClasses;
	}

	get ruleMatchedClass() {
		if (!this._matchedClasses) {
			this._matchedClasses =
				this.getAttribute('rule-matched-class') || 'validation-matched';
		}
		return this._matchedClasses;
	}

	get fieldId() {
		return this.getAttribute('for');
	}

	_setupValidation() {
		const fieldId = this.fieldId;
		if (!fieldId) return;

		// Find the field
		this._field = document.getElementById(fieldId);
		if (!this._field) {
			console.warn(
				`form-validation-list: Could not find field with id="${fieldId}"`,
			);
			return;
		}

		// Find all rules (elements with data-pattern attribute)
		this._rules = Array.from(this.querySelectorAll('[data-pattern]')).map(
			(element) => ({
				element,
				pattern: element.getAttribute('data-pattern'),
				regex: new RegExp(element.getAttribute('data-pattern')),
			}),
		);

		if (this._rules.length === 0) {
			console.warn(
				'form-validation-list: No rules found with data-pattern attribute',
			);
			return;
		}

		// Set up ARIA relationship
		this._setupAccessibility();

		// Add role to rule items
		this._rules.forEach(({ element }) => {
			element.setAttribute('role', 'listitem');
			element.setAttribute('aria-live', 'polite');
		});

		// Create validation handler
		this._validationHandler = (event) => {
			this._validateField();
		};

		// Attach event listener
		this._field.addEventListener(
			this.triggerEvent,
			this._validationHandler,
		);

		// Run initial validation if field has a value
		if (this._field.value) {
			this._validateField();
		}
	}

	_setupAccessibility() {
		if (!this._field) return;

		// Ensure this element has an ID
		const listId = this.id || FormValidationListElement.#generateId();
		if (!this.id) {
			this.id = listId;
		}

		// Add this list to the field's aria-describedby
		const existingDescribedBy =
			this._field.getAttribute('aria-describedby');
		if (existingDescribedBy) {
			const describedByIds = existingDescribedBy.split(' ');
			if (!describedByIds.includes(listId)) {
				this._field.setAttribute(
					'aria-describedby',
					`${existingDescribedBy} ${listId}`,
				);
			}
		} else {
			this._field.setAttribute('aria-describedby', listId);
		}
	}

	_validateField() {
		if (!this._field) return;

		const value = this._field.value;
		const rulesCount = this._rules.length;
		let matchedRules = 0;

		// Validate each rule
		for (let i = 0; i < rulesCount; i++) {
			const { element, regex } = this._rules[i];
			const matched = regex.test(value);

			if (matched) {
				matchedRules++;
			}

			// Apply class changes with delay for visual cascade effect
			if (this.eachDelay > 0) {
				setTimeout(() => {
					this._toggleMatchedClasses(element, matched);
				}, i * this.eachDelay);
			} else {
				this._toggleMatchedClasses(element, matched);
			}
		}

		// Update field validity
		const isValid = matchedRules === rulesCount;
		this._isValid = isValid;

		// Cache class names for performance
		const validClass = this.fieldValidClass;
		const invalidClass = this.fieldInvalidClass;

		// Update field classes
		const fieldClassList = this._field.classList;
		if (isValid) {
			fieldClassList.add(validClass);
			fieldClassList.remove(invalidClass);
		} else {
			fieldClassList.add(invalidClass);
			fieldClassList.remove(validClass);
		}

		// Integrate with browser validation
		this._updateFieldValidity(isValid, matchedRules);

		// Fire custom event
		this.dispatchEvent(
			new CustomEvent('form-validation-list:validated', {
				bubbles: true,
				composed: true,
				detail: {
					isValid,
					matchedRules,
					totalRules: rulesCount,
					field: this._field,
				},
			}),
		);
	}

	_toggleMatchedClasses(element, matched) {
		const classList = element.classList;
		if (matched) {
			classList.add(this.ruleMatchedClass);
			classList.remove(this.ruleUnmatchedClass);
		} else {
			classList.add(this.ruleUnmatchedClass);
			classList.remove(this.ruleMatchedClass);
		}
	}

	_updateFieldValidity(isValid, matchedRules) {
		if (!this._field || !this._field.setCustomValidity) return;

		if (isValid) {
			this._field.setCustomValidity('');
		} else {
			const template =
				this.getAttribute('validation-message') ||
				'Please match all validation requirements ({matched} of {total})';
			const message = template
				.replace('{matched}', matchedRules)
				.replace('{total}', this._rules.length);
			this._field.setCustomValidity(message);
		}
	}

	_cleanup() {
		// Remove event listener
		if (this._field && this._validationHandler) {
			this._field.removeEventListener(
				this.triggerEvent,
				this._validationHandler,
			);
		}

		// Clear custom validity
		if (this._field && this._field.setCustomValidity) {
			this._field.setCustomValidity('');
		}

		// Remove classes from field
		if (this._field) {
			this._field.classList.remove(
				this.fieldValidClass,
				this.fieldInvalidClass,
			);
		}

		// Remove classes from rules
		const rulesCount = this._rules.length;
		const matchedClass = this.ruleMatchedClass;
		const unmatchedClass = this.ruleUnmatchedClass;

		for (let i = 0; i < rulesCount; i++) {
			this._rules[i].element.classList.remove(
				matchedClass,
				unmatchedClass,
			);
		}

		this._field = null;
		this._rules = [];
		this._validationHandler = null;
		this._validClasses = null;
		this._invalidClasses = null;
		this._matchedClasses = null;
		this._unmatchedClasses = null;
	}

	/**
	 * Manually trigger validation
	 * @public
	 */
	validate() {
		this._validateField();
		return this._isValid;
	}

	/**
	 * Get the current validation state
	 * @public
	 * @returns {boolean} Whether all rules are currently matched
	 */
	get isValid() {
		return this._isValid;
	}
}
