/**
 * FormValidationListElement - A web component comprising a list of validation rules for a field.
 *
 * @element form-validation-list
 *
 * @attr {string} for - The ID of the input field to validate
 * @attr {string} trigger-event - The event to trigger validation on ("input" or "blur", default: "input")
 * @attr {number} input-throttle - Delay in milliseconds before running validation on input events (default: 250)
 * @attr {number} each-delay - Delay in milliseconds between each rule being classified (default: 150)
 * @attr {string} field-invalid-class - The class to apply when the field is invalid (default: "validation-invalid")
 * @attr {string} field-valid-class - The class to apply when the field is valid (default: "validation-valid")
 * @attr {string} rule-unmatched-class - The class to apply when the rule's requirement are not met (default: "validation-unmatched")
 * @attr {string} rule-matched-class - The class to apply when the rule's requirement are met (default: "validation-matched")
 * @attr {string} rule-matched-icon - Icon character for matched rules (default: "✓"); also configurable via --rule-matched-icon CSS custom property
 * @attr {string} rule-unmatched-icon - Icon character for unmatched rules (default: "✗"); also configurable via --rule-unmatched-icon CSS custom property
 * @attr {string} rule-matched-alt - Localized hidden state text for matched rules, used once the field has a value (default: "Criteria met")
 * @attr {string} rule-unmatched-alt - Localized hidden state text for unmatched rules, used once the field has a value (default: "Criteria not met")
 * @attr {string} announcement - Live region announcement template with {matched} and {total} placeholders (default: "Criteria met: {matched} of {total}")
 * @attr {string} validation-message - Custom validation message template with {matched} and {total} placeholders (default: "Please match all validation requirements ({matched} of {total})")
 *
 * @fires form-validation-list:validated - Fired when validation completes with details about matched/total rules
 *
 * @slot - Default slot for list items with data-pattern attributes
 *
 * @cssprop --rule-matched-icon - Icon for matched state (default: "✓"). Alias: --validation-icon-matched
 * @cssprop --rule-unmatched-icon - Icon for unmatched state (default: "✗"). Alias: --validation-icon-unmatched
 * @cssprop --rule-icon-size - Size of the validation icons (default: 1em). Alias: --validation-icon-size
 * @cssprop --rule-matched-color - Color for matched rules (default: green). Alias: --validation-matched-color
 * @cssprop --rule-unmatched-color - Color for unmatched rules (default: red). Alias: --validation-unmatched-color
 */
export class FormValidationListElement extends HTMLElement {
	static #stylesInjected = false;
	static #styleId = 'form-validation-list-styles';
	static #describedByRestoreDelay = 200;
	static #normalizeTriggerEvent(value) {
		return value === 'blur' ? 'blur' : 'input';
	}

	static get observedAttributes() {
		return [
			'for',
			'trigger-event',
			'input-throttle',
			'each-delay',
			'field-invalid-class',
			'field-valid-class',
			'rule-unmatched-class',
			'rule-matched-class',
			'rule-matched-icon',
			'rule-unmatched-icon',
			'rule-matched-alt',
			'rule-unmatched-alt',
			'announcement',
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

			.form-validation-list-rule-icon {
				display: inline-block;
				width: var(--rule-icon-size, var(--validation-icon-size, 1em));
				font-size: var(--rule-icon-size, var(--validation-icon-size, 1em));
			}

			.form-validation-list-rule-icon::before {
				content: var(
					--form-validation-list-rule-unmatched-icon,
					var(--rule-unmatched-icon, var(--validation-icon-unmatched, "✗"))
				);
				display: inline-block;
				color: var(--rule-unmatched-color, var(--validation-unmatched-color, red));
			}

			form-validation-list [data-pattern].validation-matched > .form-validation-list-rule-icon::before {
				content: var(
					--form-validation-list-rule-matched-icon,
					var(--rule-matched-icon, var(--validation-icon-matched, "✓"))
				);
				color: var(--rule-matched-color, var(--validation-matched-color, green));
			}

			.form-validation-list-rule-state {
				clip: rect(0 0 0 0);
				clip-path: inset(50%);
				height: 1px;
				margin: -1px;
				overflow: hidden;
				padding: 0;
				position: absolute;
				white-space: nowrap;
				width: 1px;
			}

			.form-validation-list-live-region {
				clip: rect(0 0 0 0);
				clip-path: inset(50%);
				height: 1px;
				overflow: hidden;
				position: absolute;
				white-space: nowrap;
				width: 1px;
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
		this._pendingInputThrottleTimeout = null;
		this._pendingBlurRestoreTimeout = null;
		this._currentTriggerEvent = null;
		this._liveRegion = null;
		this._blurHandler = null;
		this._describedBySuspended = false;
		this._describedByTargetId = null;
		this._hasValue = false;
	}

	connectedCallback() {
		this.__upgradeProperty('for');
		this.__upgradeProperty('fieldId');
		this.__upgradeProperty('triggerEvent');
		this.__upgradeProperty('inputThrottle');
		this.__upgradeProperty('eachDelay');
		this.__upgradeProperty('fieldInvalidClass');
		this.__upgradeProperty('fieldValidClass');
		this.__upgradeProperty('ruleUnmatchedClass');
		this.__upgradeProperty('ruleMatchedClass');
		this.__upgradeProperty('ruleMatchedIcon');
		this.__upgradeProperty('ruleUnmatchedIcon');
		this.__upgradeProperty('ruleMatchedAlt');
		this.__upgradeProperty('ruleUnmatchedAlt');
		this.__upgradeProperty('announcement');
		this.__upgradeProperty('validationMessage');
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
				if (newValue !== null) {
					const normalizedTriggerEvent =
						FormValidationListElement.#normalizeTriggerEvent(
							newValue,
						);
					if (newValue !== normalizedTriggerEvent) {
						this.setAttribute(
							'trigger-event',
							normalizedTriggerEvent,
						);
						break;
					}
				}
				this.__rebindValidationHandler(oldValue);
				break;
			case 'input-throttle':
				this._clearPendingInputThrottle();
				if (this._field) {
					this._validateField();
				}
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
			case 'rule-matched-icon':
			case 'rule-unmatched-icon':
			case 'rule-matched-alt':
			case 'rule-unmatched-alt':
				this._updateRulePresentation();
				break;
			case 'announcement':
				// No immediate action needed; next validation pass will use new template
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
		return FormValidationListElement.#normalizeTriggerEvent(
			this.getAttribute('trigger-event'),
		);
	}

	set triggerEvent(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value).trim();
		if (normalized) {
			this.setAttribute(
				'trigger-event',
				FormValidationListElement.#normalizeTriggerEvent(normalized),
			);
		} else {
			this.removeAttribute('trigger-event');
		}
	}

	get inputThrottle() {
		const attrValue = this.getAttribute('input-throttle');
		if (attrValue === null || attrValue === undefined || attrValue === '') {
			return 250;
		}
		const parsed = Number(attrValue);
		return Number.isFinite(parsed) && parsed >= 0 ? parsed : 250;
	}

	set inputThrottle(value) {
		const parsed = Number(value);
		if (Number.isFinite(parsed) && parsed >= 0) {
			this.setAttribute('input-throttle', String(parsed));
		} else {
			this.removeAttribute('input-throttle');
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

	get ruleMatchedIcon() {
		return this.getAttribute('rule-matched-icon');
	}

	set ruleMatchedIcon(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value);
		if (normalized) {
			this.setAttribute('rule-matched-icon', normalized);
		} else {
			this.removeAttribute('rule-matched-icon');
		}
	}

	get ruleUnmatchedIcon() {
		return this.getAttribute('rule-unmatched-icon');
	}

	set ruleUnmatchedIcon(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value);
		if (normalized) {
			this.setAttribute('rule-unmatched-icon', normalized);
		} else {
			this.removeAttribute('rule-unmatched-icon');
		}
	}

	get ruleMatchedAlt() {
		const attr = this.getAttribute('rule-matched-alt');
		return attr !== null ? attr : 'Criteria met';
	}

	set ruleMatchedAlt(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value);
		if (normalized) {
			this.setAttribute('rule-matched-alt', normalized);
		} else {
			this.removeAttribute('rule-matched-alt');
		}
	}

	get ruleUnmatchedAlt() {
		const attr = this.getAttribute('rule-unmatched-alt');
		return attr !== null ? attr : 'Criteria not met';
	}

	set ruleUnmatchedAlt(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value);
		if (normalized) {
			this.setAttribute('rule-unmatched-alt', normalized);
		} else {
			this.removeAttribute('rule-unmatched-alt');
		}
	}

	get announcement() {
		const attr = this.getAttribute('announcement');
		return attr !== null ? attr : 'Criteria met: {matched} of {total}';
	}

	set announcement(value) {
		const normalized =
			value === null || value === undefined ? '' : String(value);
		if (normalized) {
			this.setAttribute('announcement', normalized);
		} else {
			this.removeAttribute('announcement');
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

		// Only add aria-atomic to list items; live announcements go through the live region
		this._rules.forEach(({ element }) => {
			FormValidationListElement.#ensureRulePresentation(element);
			element.setAttribute('aria-atomic', 'true');
		});

		// Create the visually-hidden live region as a sibling to the list within the component.
		if (!this._liveRegion) {
			this._liveRegion = document.createElement('span');
			this._liveRegion.setAttribute('aria-live', 'polite');
			this._liveRegion.setAttribute('aria-atomic', 'true');
			this._liveRegion.className = 'form-validation-list-live-region';
			this.appendChild(this._liveRegion);
		}

		// Sync icon glyphs and rule state text for this instance
		this._updateRulePresentation();

		// Attach blur handler to restore aria-describedby
		if (!this._blurHandler) {
			this._blurHandler = () => {
				// Cancel any pending throttle / per-rule delay timeouts and run
				// a final synchronous validation (without live announcement)
				// so rule state is up-to-date before restoring aria-describedby.
				this._clearPendingInputThrottle();
				this._clearPendingTimeouts();
				if (this._field) {
					this._validateField();
				}

				if (this._liveRegion) {
					this._liveRegion.textContent = '';
				}

				this._clearPendingBlurRestore();
				this._pendingBlurRestoreTimeout = setTimeout(() => {
					this._pendingBlurRestoreTimeout = null;
					this._restoreDescribedBy();
				}, FormValidationListElement.#describedByRestoreDelay);
			};
			this._field.addEventListener('blur', this._blurHandler);
		}

		// Create validation handler
		if (!this._validationHandler) {
			this._validationHandler = () => {
				this._scheduleValidation();
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

		const describedByTarget = this.querySelector('ul, ol') || this;
		if (!describedByTarget.id) {
			describedByTarget.id = FormValidationListElement.#generateId();
		}
		const listId = describedByTarget.id;
		this._describedByTargetId = listId;

		// Add this list to the field's aria-describedby
		const existingDescribedBy =
			this._field.getAttribute('aria-describedby');
		if (existingDescribedBy) {
			const describedByIds =
				FormValidationListElement.#parseIdRefs(existingDescribedBy);
			if (!describedByIds.includes(listId)) {
				describedByIds.push(listId);
				this._field.setAttribute(
					'aria-describedby',
					describedByIds.join(' '),
				);
			}
		} else {
			this._field.setAttribute('aria-describedby', listId);
		}
	}

	_suspendDescribedBy() {
		if (
			this._describedBySuspended ||
			!this._field ||
			!this._describedByTargetId
		)
			return;
		this._removeOwnDescribedBy();
		this._describedBySuspended = true;
	}

	_restoreDescribedBy() {
		this._clearPendingBlurRestore();
		if (
			!this._describedBySuspended ||
			!this._field ||
			!this._describedByTargetId
		)
			return;
		const current = this._field.getAttribute('aria-describedby');
		if (current) {
			const ids = FormValidationListElement.#parseIdRefs(current);
			if (!ids.includes(this._describedByTargetId)) {
				ids.push(this._describedByTargetId);
				this._field.setAttribute('aria-describedby', ids.join(' '));
			}
		} else {
			this._field.setAttribute(
				'aria-describedby',
				this._describedByTargetId,
			);
		}
		this._describedBySuspended = false;
	}

	_removeOwnDescribedBy(field = this._field) {
		if (!field || !this._describedByTargetId) return;
		const current = field.getAttribute('aria-describedby');
		if (!current) return;
		const ids = FormValidationListElement.#parseIdRefs(current).filter(
			(id) => id !== this._describedByTargetId,
		);
		if (ids.length > 0) {
			field.setAttribute('aria-describedby', ids.join(' '));
		} else {
			field.removeAttribute('aria-describedby');
		}
	}

	static #parseIdRefs(value) {
		if (!value) return [];
		return value.trim().split(/\s+/).filter(Boolean);
	}

	static #expandCountTemplate(template, matched, total) {
		return String(template)
			.replace(/\{matched\}/g, String(matched))
			.replace(/\{total\}/g, String(total));
	}

	static #ensureRulePresentation(element) {
		let iconElement = element.querySelector(
			':scope > .form-validation-list-rule-icon',
		);
		if (!iconElement) {
			iconElement = document.createElement('span');
			iconElement.className = 'form-validation-list-rule-icon';
			iconElement.setAttribute('aria-hidden', 'true');
			element.prepend(iconElement);
		}

		let stateElement = element.querySelector(
			':scope > .form-validation-list-rule-state',
		);
		if (!stateElement) {
			stateElement = document.createElement('span');
			stateElement.className = 'form-validation-list-rule-state';
			iconElement.insertAdjacentElement('afterend', stateElement);
		}

		return { iconElement, stateElement };
	}

	_updateRulePresentation() {
		if (this.ruleMatchedIcon) {
			this.style.setProperty(
				'--form-validation-list-rule-matched-icon',
				JSON.stringify(this.ruleMatchedIcon),
			);
		} else {
			this.style.removeProperty(
				'--form-validation-list-rule-matched-icon',
			);
		}

		if (this.ruleUnmatchedIcon) {
			this.style.setProperty(
				'--form-validation-list-rule-unmatched-icon',
				JSON.stringify(this.ruleUnmatchedIcon),
			);
		} else {
			this.style.removeProperty(
				'--form-validation-list-rule-unmatched-icon',
			);
		}

		for (let i = 0; i < this._rules.length; i++) {
			const { element } = this._rules[i];
			const { stateElement } =
				FormValidationListElement.#ensureRulePresentation(element);
			const isMatched = element.classList.contains(this.ruleMatchedClass);
			stateElement.textContent = this._hasValue
				? `${isMatched ? this.ruleMatchedAlt : this.ruleUnmatchedAlt} `
				: '';
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
		this._clearPendingInputThrottle();
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

	_clearPendingInputThrottle() {
		if (this._pendingInputThrottleTimeout === null) {
			return;
		}
		clearTimeout(this._pendingInputThrottleTimeout);
		this._pendingInputThrottleTimeout = null;
	}

	_clearPendingBlurRestore() {
		if (this._pendingBlurRestoreTimeout === null) {
			return;
		}
		clearTimeout(this._pendingBlurRestoreTimeout);
		this._pendingBlurRestoreTimeout = null;
	}

	_scheduleValidation() {
		if (!this._field) {
			return;
		}

		const listenerType = this._currentTriggerEvent || this.triggerEvent;
		if (listenerType !== 'input') {
			this._validateField();
			return;
		}

		// Cancel pending restore when typing resumes.
		this._clearPendingBlurRestore();

		// Suspend aria-describedby as soon as the user starts typing
		this._suspendDescribedBy();

		const throttleDelay = this.inputThrottle;
		if (throttleDelay <= 0) {
			this._validateField();
			return;
		}

		this._clearPendingInputThrottle();
		this._pendingInputThrottleTimeout = setTimeout(() => {
			this._pendingInputThrottleTimeout = null;
			this._validateField();
		}, throttleDelay);
	}

	_validateField() {
		if (!this._field) return;

		this._clearPendingTimeouts();

		const value = this._field.value;
		const rulesCount = this._rules.length;
		let matchedRules = 0;
		const delay = this.eachDelay;

		// Track whether the field has a value to expose localized rule state text
		const hasValue = value.length > 0;
		if (hasValue !== this._hasValue) {
			this._hasValue = hasValue;
			this.classList.toggle('has-value', hasValue);
		}

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

		// Update live region with summary announcement only while typing
		// (i.e. while aria-describedby is suspended). Keep it clear for
		// blur-triggered or programmatic validation to avoid extra chatter.
		if (this._liveRegion) {
			if (this._describedBySuspended) {
				this._liveRegion.textContent =
					FormValidationListElement.#expandCountTemplate(
						this.announcement,
						matchedRules,
						rulesCount,
					);
			} else {
				this._liveRegion.textContent = '';
			}
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
		const { stateElement } =
			FormValidationListElement.#ensureRulePresentation(element);
		const classList = element.classList;
		if (matched) {
			classList.add(this.ruleMatchedClass);
			classList.remove(this.ruleUnmatchedClass);
		} else {
			classList.add(this.ruleUnmatchedClass);
			classList.remove(this.ruleMatchedClass);
		}
		stateElement.textContent = this._hasValue
			? `${matched ? this.ruleMatchedAlt : this.ruleUnmatchedAlt} `
			: '';
	}

	_updateFieldValidity(isValid, matchedRules) {
		if (!this._field || !this._field.setCustomValidity) return;

		if (isValid) {
			this._field.setCustomValidity('');
		} else {
			const template =
				this.validationMessage ||
				'Please match all validation requirements ({matched} of {total})';
			const message = FormValidationListElement.#expandCountTemplate(
				template,
				matchedRules,
				this._rules.length,
			);
			this._field.setCustomValidity(message);
		}
	}

	_cleanup() {
		this._clearPendingBlurRestore();
		this._clearPendingInputThrottle();
		this._clearPendingTimeouts();

		// Remove event listeners
		if (this._field && this._validationHandler) {
			const listenerType =
				this._currentTriggerEvent || this.triggerEvent || 'input';
			this._field.removeEventListener(
				listenerType,
				this._validationHandler,
			);
		}
		if (this._field && this._blurHandler) {
			this._field.removeEventListener('blur', this._blurHandler);
		}

		// Remove this element from the field's aria-describedby on cleanup
		this._removeOwnDescribedBy();

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

		// Remove live region
		if (this._liveRegion && this._liveRegion.parentNode) {
			this._liveRegion.remove();
		}

		// Remove has-value class
		this.classList.remove('has-value');
		this.style.removeProperty('--form-validation-list-rule-matched-icon');
		this.style.removeProperty('--form-validation-list-rule-unmatched-icon');

		this._field = null;
		this._rules = [];
		this._validationHandler = null;
		this._blurHandler = null;
		this._liveRegion = null;
		this._pendingBlurRestoreTimeout = null;
		this._validClasses = null;
		this._invalidClasses = null;
		this._matchedClasses = null;
		this._unmatchedClasses = null;
		this._currentTriggerEvent = null;
		this._describedBySuspended = false;
		this._describedByTargetId = null;
		this._hasValue = false;
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
