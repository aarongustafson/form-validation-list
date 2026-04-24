import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('should not force role="list" on host', () => {
    expect(element.hasAttribute('role')).toBe(false);
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
      localElement.triggerEvent = 'blur';
      expect(localElement.getAttribute('trigger-event')).toBe('blur');
    });

    it('should normalize unsupported trigger events to input', () => {
      const localElement = document.createElement('form-validation-list');
      localElement.triggerEvent = 'change';
      expect(localElement.getAttribute('trigger-event')).toBe('input');
      expect(localElement.triggerEvent).toBe('input');
    });

    it('should upgrade properties set before connecting', async () => {
      const upgradeInput = document.createElement('input');
      upgradeInput.id = 'upgrade-input';
      document.body.appendChild(upgradeInput);

      const localElement = document.createElement('form-validation-list');
      localElement.fieldId = 'upgrade-input';
      localElement.triggerEvent = 'blur';
      localElement.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital</li></ul>`;
      localElement.setAttribute('each-delay', '0');
      document.body.appendChild(localElement);

      upgradeInput.value = 'TEST';
      upgradeInput.dispatchEvent(new Event('blur'));

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

    it('should not force role="listitem" on rule elements', () => {
      const rules = element.querySelectorAll('[data-pattern]');
      rules.forEach((rule) => {
        expect(rule.hasAttribute('role')).toBe(false);
      });
    });

    it('should set aria-atomic on rule elements (not aria-live)', () => {
      const rules = element.querySelectorAll('[data-pattern]');
      rules.forEach((rule) => {
        expect(rule.getAttribute('aria-atomic')).toBe('true');
        expect(rule.hasAttribute('aria-live')).toBe(false);
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

    it('should replace all placeholders in validation-message template', async () => {
      element.setAttribute(
        'validation-message',
        'Matched {matched}/{matched} of {total}/{total}',
      );
      element.setAttribute('each-delay', '0');
      element.setAttribute('input-throttle', '0');
      element.disconnectedCallback();
      element.connectedCallback();

      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      await waitFor(() => {
        expect(input.validationMessage).toBe('Matched 1/1 of 3/3');
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

    it('should create a live region with aria-live and aria-atomic', () => {
      const liveRegion = document.querySelector(
        '.form-validation-list-live-region',
      );
      expect(liveRegion).toBeTruthy();
      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
    });

    it('should update the live region with the announcement after validation', async () => {
      element.setAttribute('each-delay', '0');
      element.setAttribute('input-throttle', '0');
      element.disconnectedCallback();
      element.connectedCallback();

      input.value = 'Test123';
      input.dispatchEvent(new Event('input'));

      await waitFor(() => {
        const liveRegion = document.querySelector(
          '.form-validation-list-live-region',
        );
        expect(liveRegion.textContent).toContain('3');
      });
    });

    it('should replace all matched and total placeholders in announcement', async () => {
      element.setAttribute(
        'announcement',
        'Matched {matched}/{matched} of {total}/{total}',
      );
      element.setAttribute('each-delay', '0');
      element.setAttribute('input-throttle', '0');
      element.disconnectedCallback();
      element.connectedCallback();

      input.value = 'Test123';
      input.dispatchEvent(new Event('input'));

      await waitFor(() => {
        const liveRegion = document.querySelector(
          '.form-validation-list-live-region',
        );
        expect(liveRegion.textContent).toBe('Matched 3/3 of 3/3');
      });
    });

    it('should suspend aria-describedby on input and restore on blur', () => {
      vi.useFakeTimers();

      try {
        element.setAttribute('each-delay', '0');
        element.setAttribute('input-throttle', '0');
        element.disconnectedCallback();
        element.connectedCallback();

        const listId = element.id;
        expect(input.getAttribute('aria-describedby')).toContain(
          listId,
        );

        input.value = 'A';
        input.dispatchEvent(new Event('input'));
        const describedByDuringTyping =
          input.getAttribute('aria-describedby');
        expect(
          describedByDuringTyping === null ||
          !describedByDuringTyping.includes(listId),
        ).toBe(true);

        input.dispatchEvent(new Event('blur'));
        const describedByAfterBlur =
          input.getAttribute('aria-describedby');
        expect(
          describedByAfterBlur === null ||
          !describedByAfterBlur.includes(listId),
        ).toBe(true);

        vi.advanceTimersByTime(200);
        expect(input.getAttribute('aria-describedby')).toContain(
          listId,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should toggle has-value class based on field content', async () => {
      element.setAttribute('each-delay', '0');
      element.setAttribute('input-throttle', '0');
      element.disconnectedCallback();
      element.connectedCallback();

      expect(element.classList.contains('has-value')).toBe(false);

      input.value = 'A';
      input.dispatchEvent(new Event('input'));

      await waitFor(() => {
        expect(element.classList.contains('has-value')).toBe(true);
      });

      input.value = '';
      input.dispatchEvent(new Event('input'));

      await waitFor(() => {
        expect(element.classList.contains('has-value')).toBe(false);
      });
    });
  });

  describe('configuration attributes', () => {
    it('should use default trigger event', () => {
      expect(element.triggerEvent).toBe('input');
    });

    it('should allow custom trigger event', () => {
      element.setAttribute('trigger-event', 'blur');
      expect(element.triggerEvent).toBe('blur');
    });

    it('should use default each-delay', () => {
      expect(element.eachDelay).toBe(150);
    });

    it('should use default input-throttle', () => {
      expect(element.inputThrottle).toBe(250);
    });

    it('should allow custom input-throttle', () => {
      element.setAttribute('input-throttle', '40');
      expect(element.inputThrottle).toBe(40);
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

    it('should use default icon alt text', () => {
      expect(element.ruleMatchedAlt).toBe('Criteria met');
      expect(element.ruleUnmatchedAlt).toBe('Criteria not met');
    });

    it('should allow custom icon alt text', () => {
      element.setAttribute('rule-matched-alt', 'Met');
      element.setAttribute('rule-unmatched-alt', 'Not met');
      expect(element.ruleMatchedAlt).toBe('Met');
      expect(element.ruleUnmatchedAlt).toBe('Not met');
    });

    it('should use default announcement template', () => {
      expect(element.announcement).toBe(
        'Criteria met: {matched} of {total}',
      );
    });

    it('should allow custom announcement template', () => {
      element.setAttribute('announcement', '{matched}/{total} ok');
      expect(element.announcement).toBe('{matched}/{total} ok');
    });

    it('should allow custom icons via attribute', () => {
      element.setAttribute('rule-matched-icon', '✅');
      element.setAttribute('rule-unmatched-icon', '❌');
      expect(element.ruleMatchedIcon).toBe('✅');
      expect(element.ruleUnmatchedIcon).toBe('❌');
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

      element.setAttribute('trigger-event', 'blur');
      input.value = 'TEST';
      input.dispatchEvent(new Event('blur'));

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

    it('should throttle input-triggered validation and use latest value', () => {
      vi.useFakeTimers();

      try {
        element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital letter</li></ul>`;
        element.setAttribute('each-delay', '0');
        element.setAttribute('input-throttle', '100');
        element.disconnectedCallback();
        element.connectedCallback();

        const rule = element.querySelector('[data-pattern]');

        input.value = 'abc';
        input.dispatchEvent(new Event('input'));

        input.value = 'ABC';
        input.dispatchEvent(new Event('input'));

        expect(rule.classList.contains('validation-matched')).toBe(
          false,
        );
        expect(rule.classList.contains('validation-unmatched')).toBe(
          false,
        );

        vi.advanceTimersByTime(100);

        expect(rule.classList.contains('validation-matched')).toBe(
          true,
        );
        expect(rule.classList.contains('validation-unmatched')).toBe(
          false,
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not throttle blur trigger events', () => {
      element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital letter</li></ul>`;
      element.setAttribute('trigger-event', 'blur');
      element.setAttribute('input-throttle', '1000');
      element.setAttribute('each-delay', '0');
      element.disconnectedCallback();
      element.connectedCallback();

      const rule = element.querySelector('[data-pattern]');
      input.value = 'ABC';
      input.dispatchEvent(new Event('blur'));

      expect(rule.classList.contains('validation-matched')).toBe(true);
      expect(rule.classList.contains('validation-unmatched')).toBe(false);
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
    it('should remove only this id from aria-describedby when disconnected', () => {
      input.setAttribute('aria-describedby', 'existing-id');
      element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital</li></ul>`;
      element.disconnectedCallback();
      element.connectedCallback();

      const listId = element.id;
      expect(input.getAttribute('aria-describedby')).toContain(
        'existing-id',
      );
      expect(input.getAttribute('aria-describedby')).toContain(listId);

      element.disconnectedCallback();

      expect(input.getAttribute('aria-describedby')).toBe('existing-id');
    });

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
      const nextInput = document.createElement('input');
      nextInput.type = 'text';
      nextInput.id = 'next-input';
      document.body.appendChild(nextInput);

      element.innerHTML = `<ul><li data-pattern="[A-Z]+">Capital</li></ul>`;
      element.disconnectedCallback();
      element.connectedCallback();

      const oldField = element._field;
      oldField.setAttribute('aria-describedby', 'existing-id');
      element._setupAccessibility();

      element.setAttribute('for', 'next-input');

      expect(element._field).not.toBe(oldField);
      expect(oldField.getAttribute('aria-describedby')).toBe(
        'existing-id',
      );
    });
  });
});
