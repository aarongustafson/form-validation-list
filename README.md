# form-validation-list Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-validation-list.svg)](https://www.npmjs.com/package/@aarongustafson/form-validation-list)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-validation-list/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/form-validation-list/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/form-validation-list?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/form-validation-list)
[![License](https://img.shields.io/npm/l/@aarongustafson/form-validation-list)](https://github.com/aarongustafson/form-validation-list/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/form-validation-list)](https://github.com/aarongustafson/form-validation-list/blob/main/form-validation-list.d.ts)

A web component that checks a field against a list of regular expression rules.
Each rule shows a checkmark (✓) or cross (✗), with localized hidden state text
once the field has a value. The component uses light DOM and the browser’s
built-in form validation. Without JavaScript, the authored fields and
requirements remain visible, but these extra rules are not enforced. Always
validate submitted values on the server.

## Features

- **Light DOM** - Uses light DOM for better accessibility and SEO
- **Pattern-based validation** - Define rules using regular expressions
- **Accessible** - Single live summary while typing, with full criteria state restored on blur
- **Customizable** - Configure classes, icons, and localized rule state strings
- **Browser validation integration** - Participates in native form validation using `setCustomValidity`
- **Event-driven** - Fires custom events for programmatic interaction
- **Visual feedback** - Animated cascade effect when validating rules

## TypeScript & Framework Support

- Ships with bundled `.d.ts` definitions so editors and TypeScript builds understand `FormValidationListElement` and `defineFormValidationList`.
- `for`, `trigger-event`, `input-throttle`, `each-delay`, the icon/state text attributes, and every class-related attribute reflect between properties and attributes, keeping reactive frameworks and declarative templates in sync with DOM state.
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
<script
  src="./node_modules/@aarongustafson/form-validation-list/define.js"
  type="module"
></script>
```

### Basic Example

```html
<form>
  <label for="username">Username:</label>
  <input type="text" id="username" name="username" required />

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

### Validation Flow

1. Add a `for` attribute to the `<form-validation-list>` element with the ID of the input field you want to validate
2. Inside the element, add list items (or any elements) with a `data-pattern` attribute containing a regular expression
3. Matched rules get the `validation-matched` class and show a checkmark; unmatched rules get `validation-unmatched` and show an X
4. Once the field has a value, each rule also includes visually hidden localized state text such as "Criteria met" or "Criteria not met"
5. The component uses `setCustomValidity()` to participate in the browser's form validation

### Trigger Event Behavior

#### With `trigger-event="input"` (default)

- Validation runs on input events with a configurable delay (see `input-throttle`)
- While typing, the field temporarily stops referencing the full criteria list via `aria-describedby` to avoid duplicate announcements
- A single polite live region announces the localized summary using the `announcement` template
- When the user blurs (leaves) the field:
  - Any pending validation timeouts are cleared to prevent cascading updates
  - The field's `aria-describedby` is restored after a brief delay so returning to the field reads the full criteria state again

#### With `trigger-event="blur"`

- Validation runs immediately (without throttling) when the user leaves the field
- The `input-throttle` attribute is ignored
- No aria-describedby suspension occurs, so the full criteria list remains visible while typing
- No live region announcements occur during typing

## Attributes

| Attribute              | Type     | Default                                                             | Description                                                                                                                                   |
| ---------------------- | -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `for`                  | `string` | `""`                                                                | **Required.** The ID of the input field to validate                                                                                           |
| `trigger-event`        | `string` | `"input"`                                                           | When to trigger validation: `"input"` (with throttle) or `"blur"` (immediate, no announcements while typing)                                  |
| `input-throttle`       | `number` | `250`                                                               | Delay in milliseconds before running validation for `input` events. Only used when `trigger-event="input"`. Set to `0` to disable throttling. |
| `each-delay`           | `number` | `150`                                                               | Delay in milliseconds between each rule being classified (creates cascade effect)                                                             |
| `field-invalid-class`  | `string` | `"validation-invalid"`                                              | Class to apply to the field when invalid                                                                                                      |
| `field-valid-class`    | `string` | `"validation-valid"`                                                | Class to apply to the field when valid                                                                                                        |
| `rule-unmatched-class` | `string` | `"validation-unmatched"`                                            | Class to apply to unmatched rules                                                                                                             |
| `rule-matched-class`   | `string` | `"validation-matched"`                                              | Class to apply to matched rules                                                                                                               |
| `rule-matched-icon`    | `string` | `"✓"`                                                               | Override the matched icon glyph for this instance                                                                                             |
| `rule-unmatched-icon`  | `string` | `"✗"`                                                               | Override the unmatched icon glyph for this instance                                                                                           |
| `rule-matched-alt`     | `string` | `"Criteria met"`                                                    | Localized hidden state text inserted for matched rules once the field has a value                                                             |
| `rule-unmatched-alt`   | `string` | `"Criteria not met"`                                                | Localized hidden state text inserted for unmatched rules once the field has a value                                                           |
| `announcement`         | `string` | `"Criteria met: {matched} of {total}"`                              | Live region summary while typing. Use `{matched}` and `{total}` placeholders.                                                                 |
| `validation-message`   | `string` | `"Please match all validation requirements ({matched} of {total})"` | Custom validation message template. Use `{matched}` and `{total}` as placeholders for internationalization                                    |

### Example with Custom Attributes

```html
<form-validation-list
  for="password"
  trigger-event="input"
  input-throttle="0"
  rule-matched-alt="Requirement met"
  rule-unmatched-alt="Requirement not met"
  announcement="{matched} of {total} requirements met"
  each-delay="100"
  field-valid-class="is-valid"
  field-invalid-class="is-invalid"
>
  <ul>
    <li data-pattern=".{8,}">At least 8 characters</li>
    <li data-pattern="[A-Z]+">At least one uppercase letter</li>
    <li data-pattern="[\d]+">At least one number</li>
  </ul>
</form-validation-list>
```

## Generated Markup

The component automatically enhances your markup with additional elements and IDs:

**Your HTML:**

```html
<form-validation-list for="password">
  <ul>
    <li data-pattern=".{8,}">At least 8 characters</li>
  </ul>
</form-validation-list>
```

**Generated DOM (simplified):**

```html
<form-validation-list for="password">
  <ul id="form-validation-list-abc123xyz">
    <li data-pattern=".{8,}" class="validation-unmatched" aria-atomic="true">
      <span class="form-validation-list-rule-icon" aria-hidden="true"></span>
      <span class="form-validation-list-rule-state">Criteria not met </span>
      At least 8 characters
    </li>
  </ul>
  <span
    aria-live="polite"
    aria-atomic="true"
    class="form-validation-list-live-region"
  ></span>
</form-validation-list>
```

**What gets added:**

- **List ID**: A unique ID is assigned to your `<ul>` or `<ol>` element and linked to the input via `aria-describedby`
- **Rule icon span**: A `<span class="form-validation-list-rule-icon">` is prepended to each rule showing ✓ or ✗
  - `aria-hidden="true"` prevents screen readers from announcing the icon
  - Content controlled via the `rule-matched-icon` and `rule-unmatched-icon` attributes or the `--rule-matched-icon` and `--rule-unmatched-icon` CSS properties
- **Rule state span**: A `<span class="form-validation-list-rule-state">` is inserted after the icon with visually hidden state text
  - Hidden with `clip: rect(0 0 0 0)` and `position: absolute`
  - Contains localized state text (default: “Criteria met ” or “Criteria not met ”, configurable via `rule-matched-alt` and `rule-unmatched-alt` attributes)
  - Only populated when the field has a value (`.has-value` class on the component)
- **Live region**: A `<span class="form-validation-list-live-region">` with `aria-live="polite"` is added as a sibling to your list
  - Only updated while typing with `trigger-event="input"`
  - Cleared on blur and during programmatic validation

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

| Event                            | Description                      | Detail                                         |
| -------------------------------- | -------------------------------- | ---------------------------------------------- |
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

| Property                 | Default        | Description                                                                                 |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `--rule-matched-icon`    | `"✓"`          | Content for the matched state icon. Legacy alias: `--validation-icon-matched`               |
| `--rule-unmatched-icon`  | `"✗"`          | Content for the unmatched state icon. Legacy alias: `--validation-icon-unmatched`           |
| `--rule-icon-size`       | `1em`          | Size of the validation icons. Legacy alias: `--validation-icon-size`                        |
| `--rule-matched-color`   | `currentColor` | Matched icon color, inherited from its rule. Legacy alias: `--validation-matched-color`     |
| `--rule-unmatched-color` | `currentColor` | Unmatched icon color, inherited from its rule. Legacy alias: `--validation-unmatched-color` |

Default icons inherit each rule’s foreground, so they follow an authored
reading, field, or control surface without imposing a component palette.
Choose a readable foreground/background pair for the rules. Check and cross
shapes, hidden localized state text, and the live summary distinguish states
without relying on color.

Renaming the rule classes does not change the icon state. The component tracks
that state on its generated icon, independently of your class names.

The canonical CSS property takes precedence over its legacy alias. If neither
is set, the icon inherits the rule’s color. Icon attributes take precedence over
the corresponding CSS glyph properties; removing an attribute restores the CSS
fallback. Color hooks affect icons, not the rule text.

**Migration:** defaults previously used green and red. To retain colored icons,
set both color hooks and test them against the actual surface. Leave automatic
forced-color adjustment enabled. The component does not measure or repair
authored contrast.

### Example Custom Styling

```css
form-validation-list {
  display: block;
  --rule-matched-icon: '✔';
  --rule-unmatched-icon: '✘';
  --rule-icon-size: 1.2em;
  --rule-matched-color: #17652e;
  --rule-unmatched-color: #982b39;
  background: #fff;
  color: #202020;
}

form-validation-list ul {
  list-style: none;
  padding-left: 0;
}

form-validation-list li {
  padding: 0.5rem 0;
}
```

Both custom icon colors above exceed 4.5:1 on the explicit white background.
The authored `display: block` keeps that background behind the list even if
JavaScript is disabled or the module cannot load.
Monochrome glyphs follow the color hooks; color emoji may not. See the
[custom-color demo](./demo/index.html) for the code and working example.

## Internationalization

The component exposes separate templates for browser validation messages, live typing announcements, and per-rule hidden state text:

- `validation-message` supports `{matched}` and `{total}` placeholders for native form validation.
- `announcement` supports `{matched}` and `{total}` placeholders for the live region summary while typing.
- `rule-matched-alt` and `rule-unmatched-alt` provide localized rule state text when the field is revisited.

```html
<!-- Spanish -->
<form-validation-list
  for="contrasena"
  announcement="{matched} de {total} criterios cumplidos"
  rule-matched-alt="Criterio cumplido"
  rule-unmatched-alt="Criterio pendiente"
  validation-message="Por favor, cumple todos los requisitos ({matched} de {total})"
>
  <ul>
    <li data-pattern="[A-Z]+">Al menos una letra mayúscula</li>
    <li data-pattern="[a-z]+">Al menos una letra minúscula</li>
    <li data-pattern="[\d]+">Al menos un número</li>
  </ul>
</form-validation-list>

<!-- French -->
<form-validation-list
  for="mot-de-passe"
  announcement="{matched} critères satisfaits sur {total}"
  rule-matched-alt="Critère satisfait"
  rule-unmatched-alt="Critère non satisfait"
  validation-message="Veuillez satisfaire à toutes les exigences ({matched} sur {total})"
>
  <ul>
    <li data-pattern="[A-Z]+">Au moins une lettre majuscule</li>
    <li data-pattern="[a-z]+">Au moins une lettre minuscule</li>
    <li data-pattern="[\d]+">Au moins un chiffre</li>
  </ul>
</form-validation-list>
```

The message template uses `{matched}` and `{total}` as placeholders that will be replaced with the current count of matched rules and total rules.

## Accessibility

The component supplies the following behavior; authors still need readable
surface pairs, visible keyboard focus, clear field labels, and usable error
recovery. Automated tests do not establish conformance or guarantee a particular
screen reader’s announcements.

- **Native List Semantics**: The component preserves the semantics of your existing `ul`/`li` markup
- **Smart Live Region**: A dedicated polite, atomic live region announces the localized summary only while the user types with `trigger-event="input"`, keeping screen reader chatter minimal
- **ARIA Described-by Management**: The validation list is automatically associated with the input field via `aria-describedby`. With `trigger-event="input"`, the list is temporarily suspended while typing to avoid duplicate announcements, then restored on blur. With `trigger-event="blur"`, the list remains visible at all times.
- **Timeout Cleanup**: Pending validation timeouts are cleared on blur to prevent cascading updates after focus leaves the field
- **Localized Rule State**: Each rule gets visually hidden state text in the DOM once the field has a value, which works better with translation tooling than CSS-only alternative text
- **Existing Descriptions**: If the field already has an `aria-describedby` attribute, the component preserves existing values and appends its own ID

### Screen Reader Experience

#### With `trigger-event="input"` (recommended for complex validation)

When a user focuses on the input field, screen readers announce the field label followed by the validation requirements. While the user types:

- The full validation list is temporarily hidden from the screen reader via aria-describedby suspension
- A concise live announcement summarizes progress using the `announcement` template (e.g., "Criteria met: 2 of 3")
- This prevents overwhelming screen reader users with repetitive rule announcements on every keystroke

On blur (when leaving the field):

- Pending validations are cancelled to prevent stale updates
- The field's `aria-describedby` is restored after a brief delay
- Returning to the field will announce the final criteria state

#### With `trigger-event="blur"` (for simple or expensive validation)

- The full validation requirements remain visible via `aria-describedby` at all times
- Validation only occurs when leaving the field
- Validation happens immediately without throttling
- Screen readers will read the full criteria only once on focus, then again on return if changes occurred

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

| jQuery Version                         | Web Component Version          |
| -------------------------------------- | ------------------------------ |
| `data-validation-rules="id"`           | `for="id"`                     |
| `data-validation-rules-rule="pattern"` | `data-pattern="pattern"`       |
| `trigger_event: "keyup"`               | `trigger-event="input"`        |
| `each_delay: 150`                      | `each-delay="150"`             |
| `field_invalid_class: "class"`         | `field-invalid-class="class"`  |
| `field_valid_class: "class"`           | `field-valid-class="class"`    |
| `rule_unmatched_class: "class"`        | `rule-unmatched-class="class"` |
| `rule_matched_class: "class"`          | `rule-matched-class="class"`   |

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

# Run Chromium, Firefox, and WebKit checks (install browsers once)
npx playwright install
npm run test:browser

# Serve the demo from the repository root
npx serve .
```

## License

MIT © [Aaron Gustafson](https://www.aaron-gustafson.com/)
