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
		return [
			'for',
			'trigger-event',
			'each-delay',
			'field-invalid-class',
			'field-valid-class',
			'rule-unmatched-class',
			'rule-matched-class',
			'validation-message',
		];
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
		this._pendingTimeouts = new Set();
		this._currentTriggerEvent = null;
	}

	connectedCallback() {
		this.__upgradeProperty('for');
		this.__upgradeProperty('fieldId');
		this.__upgradeProperty('triggerEvent');
		this.__upgradeProperty('eachDelay');
		this.__upgradeProperty('fieldInvalidClass');
		this.__upgradeProperty('fieldValidClass');
		this.__upgradeProperty('ruleUnmatchedClass');
		this.__upgradeProperty('ruleMatchedClass');
		this.__upgradeProperty('validationMessage');
		this.setAttribute('role', 'list');
		FormValidationListElement.#injectStyles();
		this._setupValidation();
	}

	disconnectedCallback() {
		this._cleanup();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) {
			return;
		}

		switch (name) {
			case 'for':
				if (this.isConnected) {
					this._cleanup();
					this._setupValidation();
				}
				break;
			case 'validation-message':
				if (this._field) {
					this._validateField();
				}
				break;
			case 'trigger-event':
				this.__rebindValidationHandler(oldValue);
				break;
			case 'each-delay':
				this._clearPendingTimeouts();
				if (this._field) {
					this._validateField();
				}
				break;
			case 'field-invalid-class':
				this.__handleFieldClassChange(
					oldValue,
					'validation-invalid',
					'_invalidClasses',
				);
				break;
			case 'field-valid-class':
				this.__handleFieldClassChange(
					oldValue,
					'validation-valid',
					'_validClasses',
				);
				break;
			case 'rule-unmatched-class':
				this.__handleRuleClassChange(
					oldValue,
					'validation-unmatched',
					'_unmatchedClasses',
				);
				break;
			case 'rule-matched-class':
				this.__handleRuleClassChange(
					oldValue,
					'validation-matched',
					'_matchedClasses',
				);
				break;
			default:
				break;
		}
	}

	get ['for']() {
		return this.fieldId;
	}

	set ['for'](value) {
		this.fieldId = value;
	}

	get fieldId() {
		return this.getAttribute('for');
	}

	set fieldId(value) {
		if (value === null || value === undefined || value === '') {
			this.removeAttribute('for');
		} else {
			this.setAttribute('for', String(value));
		}
	}

	// Getters for configuration with cached class names
	get triggerEvent() {
		return this.getAttribute('trigger-event') || 'input';
	}

	set triggerEvent(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value).trim();
		if (normalized) {
			this.setAttribute('trigger-event', normalized);
		} else {
			this.removeAttribute('trigger-event');
		}
	}

	get eachDelay() {
		const attrValue = this.getAttribute('each-delay');
		if (attrValue === null || attrValue === undefined || attrValue === '') {
			return 150;
		}
		const parsed = Number(attrValue);
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : 150;
	}

	set eachDelay(value) {
		const parsed = Number(value);
		if (Number.isFinite(parsed) && parsed >= 0) {
			this.setAttribute('each-delay', String(parsed));
		} else {
			this.removeAttribute('each-delay');
		}
	}

	get fieldInvalidClass() {
		if (this._invalidClasses === null) {
			const attr = this.getAttribute('field-invalid-class');
			this._invalidClasses = attr || 'validation-invalid';
		}
		return this._invalidClasses;
	}

	set fieldInvalidClass(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value).trim();
		if (normalized) {
			this.setAttribute('field-invalid-class', normalized);
		} else {
			this.removeAttribute('field-invalid-class');
		}
	}

	get fieldValidClass() {
		if (this._validClasses === null) {
			const attr = this.getAttribute('field-valid-class');
			this._validClasses = attr || 'validation-valid';
		}
		return this._validClasses;
	}

	set fieldValidClass(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value).trim();
		if (normalized) {
			this.setAttribute('field-valid-class', normalized);
		} else {
			this.removeAttribute('field-valid-class');
		}
	}

	get ruleUnmatchedClass() {
		if (this._unmatchedClasses === null) {
			const attr = this.getAttribute('rule-unmatched-class');
			this._unmatchedClasses = attr || 'validation-unmatched';
		}
		return this._unmatchedClasses;
	}

	set ruleUnmatchedClass(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value).trim();
		if (normalized) {
			this.setAttribute('rule-unmatched-class', normalized);
		} else {
			this.removeAttribute('rule-unmatched-class');
		}
	}

	get ruleMatchedClass() {
		if (this._matchedClasses === null) {
			const attr = this.getAttribute('rule-matched-class');
			this._matchedClasses = attr || 'validation-matched';
		}
		return this._matchedClasses;
	}

	set ruleMatchedClass(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value).trim();
		if (normalized) {
			this.setAttribute('rule-matched-class', normalized);
		} else {
			this.removeAttribute('rule-matched-class');
		}
	}

	get validationMessage() {
		return this.getAttribute('validation-message');
	}

	set validationMessage(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value);
		if (normalized) {
			this.setAttribute('validation-message', normalized);
		} else {
			this.removeAttribute('validation-message');
		}
	}

	__upgradeProperty(prop) {
		if (Object.prototype.hasOwnProperty.call(this, prop)) {
			const value = this[prop];
			delete this[prop];
			this[prop] = value;
		}
	}

	_setupValidation() {
		this._clearPendingTimeouts();
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

		this._isValid = false;

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
		if (!this._validationHandler) {
			this._validationHandler = () => {
				this._validateField();
			};
		}

		// Attach event listener
		this._currentTriggerEvent = this.triggerEvent;
		this._field.addEventListener(
			this._currentTriggerEvent,
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

	__handleFieldClassChange(oldValue, defaultClass, cacheKey) {
		const previousClass =
			oldValue === null ? defaultClass : oldValue || null;
		this[cacheKey] = null;
		if (this._field && previousClass) {
			this._field.classList.remove(previousClass);
		}
		if (this._field) {
			this._validateField();
		}
	}

	__handleRuleClassChange(oldValue, defaultClass, cacheKey) {
		const previousClass =
			oldValue === null ? defaultClass : oldValue || null;
		this[cacheKey] = null;
		if (previousClass) {
			for (let i = 0; i < this._rules.length; i++) {
				this._rules[i].element.classList.remove(previousClass);
			}
		}
		if (this._field) {
			this._validateField();
		}
	}

	__rebindValidationHandler(oldValue) {
		if (!this._field || !this._validationHandler) {
			return;
		}
		const previousEvent = this._currentTriggerEvent || oldValue || 'input';
		const nextEvent = this.triggerEvent;
		if (previousEvent === nextEvent) {
			return;
		}
		this._field.removeEventListener(previousEvent, this._validationHandler);
		this._currentTriggerEvent = nextEvent;
		this._field.addEventListener(nextEvent, this._validationHandler);
	}

	_clearPendingTimeouts() {
		if (!this._pendingTimeouts.size) {
			return;
		}
		for (const timeoutId of this._pendingTimeouts) {
			clearTimeout(timeoutId);
		}
		this._pendingTimeouts.clear();
	}

	_validateField() {
		if (!this._field) return;

		this._clearPendingTimeouts();

		const value = this._field.value;
		const rulesCount = this._rules.length;
		let matchedRules = 0;
		const delay = this.eachDelay;

		// Validate each rule
		for (let i = 0; i < rulesCount; i++) {
			const { element, regex } = this._rules[i];
			const matched = regex.test(value);

			if (matched) {
				matchedRules++;
			}

			const applyClasses = () => {
				this._toggleMatchedClasses(element, matched);
			};

			// Apply class changes with delay for visual cascade effect
			if (delay > 0) {
				const timeoutId = setTimeout(() => {
					this._pendingTimeouts.delete(timeoutId);
					applyClasses();
				}, i * delay);
				this._pendingTimeouts.add(timeoutId);
			} else {
				applyClasses();
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
				this.validationMessage ||
				'Please match all validation requirements ({matched} of {total})';
			const message = template
				.replace('{matched}', matchedRules)
				.replace('{total}', this._rules.length);
			this._field.setCustomValidity(message);
		}
	}

	_cleanup() {
		this._clearPendingTimeouts();
		// Remove event listener
		if (this._field && this._validationHandler) {
			const listenerType =
				this._currentTriggerEvent || this.triggerEvent || 'input';
			this._field.removeEventListener(
				listenerType,
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
		this._currentTriggerEvent = null;
		this._isValid = false;
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
