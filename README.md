# form-validation-list Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-validation-list.svg)](https://www.npmjs.com/package/@aarongustafson/form-validation-list) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-validation-list/ci.yml?branch=main)](https://github.com/aarongustafson/form-validation-list/actions)

A web component comprising a list of validation rules for a field.

## Demo

[Live Demo](https://aarongustafson.github.io/form-validation-list/demo/) ([Source](./demo/index.html))

## Installation

```bash
npm install @aarongustafson/form-validation-list
```

## Usage

### Option 1: Auto-define the custom element (easiest)

Import the package to automatically define the `<form-validation-list>` custom element:

```javascript
import '@aarongustafson/form-validation-list';
```

Or use the define-only script in HTML:

```html
<script src="./node_modules/@aarongustafson/form-validation-list/define.js" type="module"></script>
```

### Option 2: Import the class and define manually

Import the class and define the custom element with your preferred tag name:

```javascript
import { FormValidationListElement } from '@aarongustafson/form-validation-list/form-validation-list.js';

customElements.define('my-custom-name', FormValidationListElement);
```

### Basic Example

```html
<form-validation-list>
  <!-- Your content here -->
</form-validation-list>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `example-attribute` | `string` | `""` | Description of the attribute |

## Events

The component fires custom events that you can listen to:

| Event | Description | Detail |
|-------|-------------|--------|
| `form-validation-list:event` | Fired when something happens | `{ data }` |

### Example Event Handling

```javascript
const element = document.querySelector('form-validation-list');

element.addEventListener('form-validation-list:event', (event) => {
  console.log('Event fired:', event.detail);
});
```

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--example-color` | `#000` | Example color property |

### Example Styling

```css
form-validation-list {
  --example-color: #ff0000;
}
```

## Browser Support

This component uses modern web standards:
- Custom Elements v1
- Shadow DOM v1
- ES Modules

For older browsers, you may need polyfills.

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
