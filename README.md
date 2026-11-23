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

## Demo

[Live Demo](https://aarongustafson.github.io/form-validation-list/demo/) ([Source](./demo/index.html))

Additional examples:

- [ESM CDN (esm.sh)](https://aarongustafson.github.io/form-validation-list/demo/esm.html) ([Source](./demo/esm.html))
- [unpkg CDN](https://aarongustafson.github.io/form-validation-list/demo/unpkg.html) ([Source](./demo/unpkg.html))
- [Blur timing](https://aarongustafson.github.io/form-validation-list/demo/#validate-on-blur), [Spanish messages](https://aarongustafson.github.io/form-validation-list/demo/#spanish-validation-messages), and [custom styling](https://aarongustafson.github.io/form-validation-list/demo/#custom-icons-and-colors) ([Source](./demo/index.html))

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

The native `required` attribute rejects an empty username. After registration,
the component adds the three regex checks through
[`setCustomValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity).
Matching these illustrative rules doesn’t establish that a username is available
or a password is strong. The password and email patterns in the demos aren’t
comprehensive validation; choose requirements for your application and check
submitted values on the server.

## How It Works

### Validation Flow

1. Add a `for` attribute to the `<form-validation-list>` element with the ID of the input field you want to validate
2. Inside the element, add list items (or any elements) with a `data-pattern` attribute containing a regular expression
3. Matched rules get the `validation-matched` class and show a checkmark; unmatched rules get `validation-unmatched` and show an X
4. Once the field has a value, each rule also includes visually hidden localized state text such as “Criteria met” or “Criteria not met”
5. The component sets a custom validity message when any rule is unmatched and clears it when all rules match. Native constraints such as `required`, `type`, and `pattern` still apply.

The component checks an existing value on connection. For an initially empty
field, it waits for an event or `validate()` before classifying rules. Rule
counts and custom validity update before the optional visual cascade finishes.

### Setup and cleanup

Use `for` to reference an existing field in the document. A missing `for`
leaves the element inactive; an unresolved field ID or an empty rule set logs
a warning and does not attach validation listeners. Correct `for` after the
field exists, or reconnect the element, to set it up again.

Rules must contain valid JavaScript regular expressions. The component calls
`new RegExp()` without flags, and an invalid expression throws during setup.
It captures rules at setup; editing `data-pattern` later does not update the
compiled regex until setup runs again. Match anywhere by default; use `^` and
`$` when the whole value must match. Keep patterns trusted and bounded:
expensive regexes can block the browser’s main thread.

Changing `for` or disconnecting clears timers and listeners, removes this
component’s description reference, field/rule classes, live region, and custom
validity. Other description IDs remain. Authored requirements, generated list
IDs, and icon/state spans remain in the DOM, including their last hidden state
text. Don’t share control of the field’s
custom validity with another validator without coordinating those updates.

### Trigger Event Behavior

#### With `trigger-event="input"` (default)

- Validation runs after the configured delay from the most recent input event (see `input-throttle`)
- While typing, the component removes only its own reference from the field’s `aria-describedby`; other descriptions and the visible list remain
- A polite, atomic live region receives the localized summary using the `announcement` template
- When the user blurs (leaves) the field:
  - Pending input and rule timers are cleared, then a final validation pass runs and clears the live summary
  - That pass can schedule new per-rule timers using `each-delay`
  - The component restores its description reference after 200 milliseconds; resumed typing cancels pending restoration

#### With `trigger-event="blur"`

- Validation runs immediately (without throttling) when the user leaves the field
- The `input-throttle` attribute is ignored
- No `aria-describedby` suspension occurs; the list remains associated with the field
- The live summary stays empty during typing and blur validation

The component does not move focus. These DOM updates supply descriptions and
live-region semantics, not a guarantee about what any screen reader will say.

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

## Validation Rules

Rules are defined using the `data-pattern` attribute on any element inside the `<form-validation-list>`. The value should be a valid regular expression pattern.

### Example Patterns

```html
<form-validation-list for="password">
  <ul>
    <!-- Length requirements -->
    <li data-pattern=".{8,}">At least 8 characters</li>
    <li data-pattern="^.{8,32}$">Between 8 and 32 characters</li>

    <!-- Character type requirements -->
    <li data-pattern="[A-Z]+">At least one uppercase letter</li>
    <li data-pattern="[a-z]+">At least one lowercase letter</li>
    <li data-pattern="[\d]+">At least one number</li>
    <li data-pattern="[!@#$%^&*]+">At least one special character</li>

    <!-- Format requirements -->
    <li data-pattern=".+@.+\..+">Contains @ followed by a dot</li>
    <li data-pattern="^[a-zA-Z0-9]+$">Only letters and numbers</li>
  </ul>
</form-validation-list>
```

## Events

The component fires a bubbling, composed custom event after updating rule
counts and field validity, before delayed rule presentation necessarily finishes.

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

Check the field’s current value and return whether all regex rules match.
This does not call `reportValidity()` or submit the form. It does not include
native constraints such as `required` in its return value.

```javascript
const validationList = document.querySelector('form-validation-list');
const isValid = validationList.validate();
console.log('Is valid:', isValid);
```

### Properties

#### `isValid` (getter)

Returns whether all rules matched at the last validation pass, not the field’s
full native validity. Assigning `field.value` does not dispatch an input event;
call `validate()` to check a programmatic change. Manual validation updates the
live summary if typing has already suspended the description reference;
otherwise the summary stays empty.

```javascript
const validationList = document.querySelector('form-validation-list');
console.log('Current state:', validationList.isValid);
```

### Reflected properties and TypeScript

The package includes declarations for `FormValidationListElement`,
`defineFormValidationList`, and `HTMLElementTagNameMap`. It preserves public
properties assigned before the element upgrades.

| Attribute                                    | Property                                 |
| -------------------------------------------- | ---------------------------------------- |
| `for`                                        | `for`, `fieldId`                         |
| `trigger-event`                              | `triggerEvent`                           |
| `input-throttle`, `each-delay`               | `inputThrottle`, `eachDelay`             |
| `field-invalid-class`, `field-valid-class`   | `fieldInvalidClass`, `fieldValidClass`   |
| `rule-unmatched-class`, `rule-matched-class` | `ruleUnmatchedClass`, `ruleMatchedClass` |
| `rule-matched-icon`, `rule-unmatched-icon`   | `ruleMatchedIcon`, `ruleUnmatchedIcon`   |
| `rule-matched-alt`, `rule-unmatched-alt`     | `ruleMatchedAlt`, `ruleUnmatchedAlt`     |
| `announcement`, `validation-message`         | `announcement`, `validationMessage`      |

These properties reflect to attributes. Unsupported trigger values normalize
to `input`. Timing values must be finite, nonnegative numbers; invalid values
use their defaults. Class attributes accept one class token each, not a
space-separated list. See the [declarations](./form-validation-list.d.ts) and
[source](./form-validation-list.js) for the full interface.

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
[custom-color demo](./demo/index.html#custom-icons-and-colors) for the code and working example.

## Internationalization

The component exposes separate templates for browser validation messages, live typing announcements, and per-rule hidden state text:

- `validation-message` supports `{matched}` and `{total}` placeholders for native form validation.
- `announcement` supports `{matched}` and `{total}` placeholders for the live region summary while typing.
- `rule-matched-alt` and `rule-unmatched-alt` provide hidden rule state text once the field has a value.

Use these attributes for application vocabulary as well as translation.
Set all four on each instance; the component has no shared translation object
and does not choose strings from `lang`. Translate authored labels and rule
text too, and set the appropriate language on their containing element.
Attributes override the defaults independently. Empty state or announcement
attributes suppress that text; an empty `validation-message` uses the default
message. Setting an empty string through a message property removes the
attribute and restores its default.

```html
<!-- Spanish -->
<form-validation-list
  lang="es"
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
  lang="fr"
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
- **Descriptions**: The component associates the first `ul` or `ol` with the field through `aria-describedby`, using the component itself if no list exists.
- **Rule states**: Each rule gets a decorative icon with `aria-hidden="true"` and visually hidden localized text once the field has a value.
- **Typing summaries**: A polite, atomic live region supplies rule counts while the description reference is suspended. See [trigger event behavior](#trigger-event-behavior) for timing and blur updates.
- **Existing Descriptions**: If the field already has an `aria-describedby` attribute, the component preserves existing values and appends its own ID

## Browser Validation Integration

The component participates in the browser's native form validation using the `setCustomValidity()` API:

- When all rules are matched, the custom validity is cleared (`setCustomValidity('')`)
- When any rule is unmatched, a custom validity message is set
- Native constraint validation can block submission while the custom message is set; `novalidate` and direct `form.submit()` bypass interactive validation
- `:valid`, `:invalid`, and the Constraint Validation API include that custom validity alongside native constraints

Before checking or submitting a programmatically changed value, call
`validate()`. Native checks cannot run additional regex rules before the
component initializes. Keep server checks even when the browser reports success.

```javascript
const form = document.querySelector('form');
const field = document.getElementById('username');
const validationList = document.querySelector('form-validation-list');

// After assigning a value programmatically:
validationList.validate();
console.log('Browser validity:', form.checkValidity());
console.log('Validation message:', field.validationMessage);
```

## Browser Support

This component uses modern web standards:

- Custom Elements v1
- ES Modules
- CSS Custom Properties

Without these features or if the module fails to load, the native fields and
authored requirements remain usable, but the additional rules are not enforced.
The guarded helper avoids duplicate registration and returns `false` if no
browser registry is available. Its imported class still needs `HTMLElement`
when the module evaluates; the guard is not a server-side rendering shim.
Node.js 22 or later is required for package development.

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
