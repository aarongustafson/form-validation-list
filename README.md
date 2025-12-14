# form-validation-list Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-validation-list.svg)](https://www.npmjs.com/package/@aarongustafson/form-validation-list) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-validation-list/ci.yml?branch=main)](https://github.com/aarongustafson/form-validation-list/actions)

A web component that provides visual validation feedback for form fields using a list of validation rules. As users type, each rule is checked against a regular expression pattern and displays a checkmark (✓) or X (✗) to indicate whether the requirement is met. The component integrates with the browser's built-in form validation and is fully accessible.

## Features

- **Light DOM** - Uses light DOM for better accessibility and SEO
- **Pattern-based validation** - Define rules using regular expressions
- **Accessible** - Proper ARIA attributes and screen reader support
- **Customizable** - Configure classes and icons via CSS custom properties
- **Browser validation integration** - Participates in native form validation using `setCustomValidity`
- **Event-driven** - Fires custom events for programmatic interaction
- **Visual feedback** - Animated cascade effect when validating rules

## TypeScript & Framework Support

- Ships with bundled `.d.ts` definitions so editors and TypeScript builds understand `FormValidationListElement` and `defineFormValidationList`.
- `for`, `trigger-event`, `each-delay`, and every class-related attribute now reflect between properties and attributes, keeping reactive frameworks and declarative templates in sync with DOM state.
- An internal `_upgradeProperty` helper captures properties that were assigned before the element upgraded, ensuring early property sets (common in SSR or JSX) are not lost.
- The `HTMLElementTagNameMap` is augmented so `document.querySelector('form-validation-list')` is strongly typed in TS/JSX projects.

## Demo

[Live Demo](https://aarongustafson.github.io/form-validation-list/demo/) ([Source](./demo/index.html))

Additional examples:
- [ESM CDN (esm.sh)](https://aarongustafson.github.io/form-validation-list/demo/esm.html) ([Source](./demo/esm.html))
- [unpkg CDN](https://aarongustafson.github.io/form-validation-list/demo/unpkg.html) ([Source](./demo/unpkg.html))

## Installation

```bash
npm install @aarongustafson/form-validation-list
```

## Usage

### Option 1: Import the class and define manually

Import the class and define the custom element with your preferred tag name:

```javascript
import { FormValidationListElement } from '@aarongustafson/form-validation-list';

customElements.define('my-custom-name', FormValidationListElement);
```

### Option 2: Auto-define the custom element (browser environments only)

Use the guarded definition helper to register the element when `customElements` is available:

```javascript
import '@aarongustafson/form-validation-list/define.js';
```

If you prefer to control when the element is registered, call the helper directly:

```javascript
import { defineFormValidationList } from '@aarongustafson/form-validation-list/define.js';

defineFormValidationList();
```

You can also include the guarded script from HTML:

```html
<script src="./node_modules/@aarongustafson/form-validation-list/define.js" type="module"></script>
```

### Basic Example

```html
<form>
  <label for="username">Username:</label>
  <input type="text" id="username" name="username" required>

  <form-validation-list for="username">
    <ul>
      <li data-pattern="[A-Z]+">At least one capital letter</li>
      <li data-pattern="[a-z]+">At least one lowercase letter</li>
      <li data-pattern="[\d]+">At least one number</li>
    </ul>
  </form-validation-list>

  <button type="submit">Submit</button>
</form>
```

## How It Works

1. Add a `for` attribute to the `<form-validation-list>` element with the ID of the input field you want to validate
2. Inside the element, add list items (or any elements) with a `data-pattern` attribute containing a regular expression
3. As the user types, the component will test the input value against each pattern
4. Matched rules get the `validation-matched` class and show a checkmark
5. Unmatched rules get the `validation-unmatched` class and show an X
6. When all rules are matched, the field gets the `validation-valid` class
7. The component uses `setCustomValidity()` to participate in the browser's form validation

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `for` | `string` | `""` | **Required.** The ID of the input field to validate |
| `trigger-event` | `string` | `"input"` | The event to trigger validation on (e.g., "input", "keyup", "change") |
| `each-delay` | `number` | `150` | Delay in milliseconds between each rule being classified (creates cascade effect) |
| `field-invalid-class` | `string` | `"validation-invalid"` | Class to apply to the field when invalid |
| `field-valid-class` | `string` | `"validation-valid"` | Class to apply to the field when valid |
| `rule-unmatched-class` | `string` | `"validation-unmatched"` | Class to apply to unmatched rules |
| `rule-matched-class` | `string` | `"validation-matched"` | Class to apply to matched rules |
| `validation-message` | `string` | `"Please match all validation requirements ({matched} of {total})"` | Custom validation message template. Use `{matched}` and `{total}` as placeholders for internationalization |

### Example with Custom Attributes

```html
<form-validation-list
  for="password"
  trigger-event="keyup"
  each-delay="100"
  field-valid-class="is-valid"
  field-invalid-class="is-invalid">
  <ul>
    <li data-pattern=".{8,}">At least 8 characters</li>
    <li data-pattern="[A-Z]+">At least one uppercase letter</li>
    <li data-pattern="[\d]+">At least one number</li>
  </ul>
</form-validation-list>
```

## Validation Rules

Rules are defined using the `data-pattern` attribute on any element inside the `<form-validation-list>`. The value should be a valid regular expression pattern.

### Example Patterns

```html
<form-validation-list for="password">
  <ul>
    <!-- Length requirements -->
    <li data-pattern=".{8,}">At least 8 characters</li>
    <li data-pattern=".{8,32}">Between 8 and 32 characters</li>

    <!-- Character type requirements -->
    <li data-pattern="[A-Z]+">At least one uppercase letter</li>
    <li data-pattern="[a-z]+">At least one lowercase letter</li>
    <li data-pattern="[\d]+">At least one number</li>
    <li data-pattern="[!@#$%^&*]+">At least one special character</li>

    <!-- Format requirements -->
    <li data-pattern=".+@.+\..+">Valid email format</li>
    <li data-pattern="^[a-zA-Z0-9]+$">Only letters and numbers</li>
  </ul>
</form-validation-list>
```

## Events

The component fires a custom event when validation completes:

| Event | Description | Detail |
|-------|-------------|--------|
| `form-validation-list:validated` | Fired after validation completes | `{ isValid, matchedRules, totalRules, field }` |

### Example Event Handling

```javascript
const validationList = document.querySelector('form-validation-list');

validationList.addEventListener('form-validation-list:validated', (event) => {
  const { isValid, matchedRules, totalRules, field } = event.detail;
  console.log(`Matched ${matchedRules} of ${totalRules} rules`);
  console.log(`Field is ${isValid ? 'valid' : 'invalid'}`);
});
```

## JavaScript API

### Methods

#### `validate()`

Manually trigger validation and return the current validation state.

```javascript
const validationList = document.querySelector('form-validation-list');
const isValid = validationList.validate();
console.log('Is valid:', isValid);
```

### Properties

#### `isValid` (getter)

Returns the current validation state as a boolean.

```javascript
const validationList = document.querySelector('form-validation-list');
console.log('Current state:', validationList.isValid);
```

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--validation-icon-matched` | `"✓"` | Content for the matched state icon |
| `--validation-icon-unmatched` | `"✗"` | Content for the unmatched state icon |
| `--validation-icon-size` | `1em` | Size of the validation icons |
| `--validation-matched-color` | `green` | Color for matched rules |
| `--validation-unmatched-color` | `red` | Color for unmatched rules |

### Example Custom Styling

```css
form-validation-list {
  --validation-icon-matched: "✅";
  --validation-icon-unmatched: "❌";
  --validation-icon-size: 1.2em;
  --validation-matched-color: #28a745;
  --validation-unmatched-color: #dc3545;
}

form-validation-list ul {
  list-style: none;
  padding-left: 0;
}

form-validation-list li {
  padding: 0.5rem 0;
  transition: all 0.3s ease;
}
```

## Internationalization

The `validation-message` attribute supports customizable error messages with placeholders for easy internationalization:

```html
<!-- Spanish -->
<form-validation-list
  for="contrasena"
  validation-message="Por favor, cumple todos los requisitos ({matched} de {total})">
  <ul>
    <li data-pattern="[A-Z]+">Al menos una letra mayúscula</li>
    <li data-pattern="[a-z]+">Al menos una letra minúscula</li>
    <li data-pattern="[\d]+">Al menos un número</li>
  </ul>
</form-validation-list>

<!-- French -->
<form-validation-list
  for="mot-de-passe"
  validation-message="Veuillez satisfaire à toutes les exigences ({matched} sur {total})">
  <ul>
    <li data-pattern="[A-Z]+">Au moins une lettre majuscule</li>
    <li data-pattern="[a-z]+">Au moins une lettre minuscule</li>
    <li data-pattern="[\d]+">Au moins un chiffre</li>
  </ul>
</form-validation-list>
```

The message template uses `{matched}` and `{total}` as placeholders that will be replaced with the current count of matched rules and total rules.

## Accessibility

The component is built with accessibility in mind:

- **ARIA Roles**: The component has `role="list"` and each rule has `role="listitem"`
- **ARIA Live Regions**: Each rule has `aria-live="polite"` to announce changes to screen readers
- **ARIA Described-by**: The validation list is automatically associated with the input field via `aria-describedby`, providing context to screen readers
- **Existing Descriptions**: If the field already has an `aria-describedby` attribute, the component preserves existing values and appends its own ID

### Screen Reader Experience

When a user focuses on the input field, screen readers will announce the field label followed by the validation requirements. As users type and rules are matched or unmatched, screen readers will announce the changes because of the `aria-live="polite"` attribute on each rule.

## Browser Validation Integration

The component participates in the browser's native form validation using the `setCustomValidity()` API:

- When all rules are matched, the custom validity is cleared (`setCustomValidity('')`)
- When any rule is unmatched, a custom validity message is set
- This prevents form submission until all validation rules are met
- Works seamlessly with the `:valid` and `:invalid` CSS pseudo-classes
- Compatible with the Constraint Validation API

```javascript
const form = document.querySelector('form');
const field = document.getElementById('username');

form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    console.log('Validation failed:', field.validationMessage);
  }
});
```

## Browser Support

This component uses modern web standards:
- Custom Elements v1
- ES Modules
- CSS Custom Properties

For older browsers, you may need polyfills.

## Migrating from jQuery Easy Validation Rules

If you're migrating from the jQuery version:

| jQuery Version | Web Component Version |
|----------------|----------------------|
| `data-validation-rules="id"` | `for="id"` |
| `data-validation-rules-rule="pattern"` | `data-pattern="pattern"` |
| `trigger_event: "keyup"` | `trigger-event="keyup"` |
| `each_delay: 150` | `each-delay="150"` |
| `field_invalid_class: "class"` | `field-invalid-class="class"` |
| `field_valid_class: "class"` | `field-valid-class="class"` |
| `rule_unmatched_class: "class"` | `rule-unmatched-class="class"` |
| `rule_matched_class: "class"` | `rule-matched-class="class"` |

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# View demo
open demo/index.html
```

## License

MIT © [Aaron Gustafson](https://www.aaron-gustafson.com/)
