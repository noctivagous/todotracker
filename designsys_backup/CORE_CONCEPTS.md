# Core Concepts

Calcite Components are built on web standards and follow web component best practices. Understanding these core concepts is essential for effective development with Calcite.

## Custom Elements

Custom elements are the foundation of web components. They allow you to create your own HTML elements with custom behavior.

### Basic Usage

Calcite components are custom elements that work like any other HTML element:

```html
<!-- Calcite components work like native HTML -->
<calcite-button>Click me</calcite-button>
<calcite-input-text label="Enter text"></calcite-input-text>
<calcite-card>
  <h3 slot="title">Card Title</h3>
  <p>Card content goes here.</p>
</calcite-card>
```

### JavaScript Creation

You can create Calcite components programmatically:

```javascript
// Create elements like any other HTML element
const button = document.createElement('calcite-button');
button.textContent = 'Dynamic Button';

// Append to DOM
document.body.appendChild(button);

// Wait for component to be ready
await button.componentOnReady();
```

## Shadow DOM

Shadow DOM provides encapsulation for web components, keeping their internal structure and styles separate from the main document.

### Benefits

- **Style isolation**: Component styles don't leak out or conflict with global styles
- **DOM isolation**: Internal DOM structure is hidden from global queries
- **Scoped styles**: CSS inside shadow DOM only affects the component

### Working with Shadow DOM

```javascript
// Accessing shadow root (advanced usage)
const button = document.querySelector('calcite-button');
const shadowRoot = button.shadowRoot;

// Query within component's shadow DOM
const internalButton = shadowRoot.querySelector('.internal-button-class');
```

### CSS Variables and Theming

Since styles are encapsulated, Calcite uses CSS custom properties (variables) for theming:

```css
/* Override component colors */
calcite-button {
  --calcite-color-brand: #ff6b35;
  --calcite-color-brand-hover: #e55a2b;
}
```

## Slots

Slots are placeholder elements that allow you to insert your own content into specific parts of a component.

### Default Slots

Most components have a default slot for primary content:

```html
<calcite-card>
  <!-- This content goes into the default slot -->
  <h3>Card Title</h3>
  <p>Card content</p>
</calcite-card>
```

### Named Slots

Named slots allow content placement in specific locations:

```html
<calcite-card>
  <h3 slot="title">Card Title</h3>
  <img slot="thumbnail" src="image.jpg" alt="Card image">
  <p>This is the main content.</p>
  <calcite-button slot="footer-actions">Action</calcite-button>
</calcite-card>
```

### Slot API Reference

Each component documents its available slots. For example, `calcite-card` has:
- `title` - Card title content
- `thumbnail` - Card thumbnail image
- `footer-actions` - Footer action buttons
- Default slot - Main card content

## Attributes and Properties

Calcite components follow standard HTML patterns for attributes and properties.

### HTML Attributes

Set initial values using HTML attributes:

```html
<calcite-button disabled appearance="outline" color="red">
  Disabled Button
</calcite-button>

<calcite-input-text
  label="Username"
  placeholder="Enter username"
  required
  maxlength="50"
>
</calcite-input-text>
```

### JavaScript Properties

Access and modify properties programmatically:

```javascript
const input = document.querySelector('calcite-input-text');

// Get properties
console.log(input.value);
console.log(input.disabled);

// Set properties
input.value = 'new value';
input.disabled = true;
input.status = 'invalid';
```

### Property Synchronization

Properties and attributes stay synchronized:

```javascript
const button = document.querySelector('calcite-button');

// Setting property updates attribute
button.disabled = true;
console.log(button.getAttribute('disabled')); // "true"

// Setting attribute updates property
button.setAttribute('appearance', 'outline');
console.log(button.appearance); // "outline"
```

## Boolean Attributes

Boolean attributes work like native HTML:

```html
<!-- These are equivalent -->
<calcite-button disabled>Button</calcite-button>
<calcite-button disabled="true">Button</calcite-button>

<!-- Absence means false -->
<calcite-button>Enabled Button</calcite-button>
```

### JavaScript Boolean Properties

```javascript
const button = document.querySelector('calcite-button');

// Check boolean property
if (button.disabled) {
  console.log('Button is disabled');
}

// Set boolean property
button.disabled = true; // Disables button
button.disabled = false; // Enables button
```

## Events

Calcite components emit custom events following web standards.

### Event Naming Convention

Calcite events follow the pattern: `calcite{CamelCaseComponentName}{EventType}`

```javascript
// Button events
button.addEventListener('calciteButtonClick', handleClick);
button.addEventListener('calciteButtonFocus', handleFocus);

// Input events
input.addEventListener('calciteInputInput', handleInput);
input.addEventListener('calciteInputChange', handleChange);

// Modal events
modal.addEventListener('calciteModalOpen', handleOpen);
modal.addEventListener('calciteModalClose', handleClose);
```

### Event Objects

Events follow standard Event/CustomEvent patterns:

```javascript
function handleInput(event) {
  // Event target is the component
  const input = event.target;

  // Access component properties
  console.log('Value:', input.value);
  console.log('Valid:', input.status !== 'invalid');

  // Some events have detail property
  if (event.detail) {
    console.log('Additional data:', event.detail);
  }
}
```

### Framework Event Handling

Different frameworks handle events differently:

```javascript
// React
<CalciteButton onCalciteButtonClick={handleClick} />

// Vue.js
<calcite-button @calciteButtonClick="handleClick" />

// Angular
<calcite-button (calciteButtonClick)="handleClick($event)" />
```

## Component Lifecycle

### Hydration

Components go through a hydration process when first loaded:

```javascript
const button = document.querySelector('calcite-button');

// Check if hydrated
if (button.classList.contains('calcite-hydrated')) {
  console.log('Component is ready');
}

// Wait for hydration
await button.componentOnReady();
console.log('Component is now ready');
```

### When Defined

Wait for custom element definition:

```javascript
// Wait for component definition
await customElements.whenDefined('calcite-button');

// Now safe to create instances
const button = document.createElement('calcite-button');
```

## Component Methods

Components expose methods for programmatic control:

```javascript
const stepper = document.querySelector('calcite-stepper');

// Component methods
await stepper.componentOnReady();
stepper.goToStep(3);

const modal = document.querySelector('calcite-modal');
modal.open = true;

// Wait for component to be ready before calling methods
await modal.componentOnReady();
modal.setFocus();
```

## Form Integration

Calcite components integrate seamlessly with HTML forms:

### Form Data

Components participate in form submission using `name` attributes:

```html
<form action="/submit" method="post">
  <calcite-input-text name="username" required></calcite-input-text>
  <calcite-input-text name="email" type="email" required></calcite-input-text>
  <calcite-checkbox name="subscribe" value="yes">Subscribe to newsletter</calcite-checkbox>
  <calcite-button type="submit">Submit</calcite-button>
</form>
```

### Form Validation

Components support validation states:

```javascript
const input = document.querySelector('calcite-input-text');

// Set validation state
input.status = 'invalid';
input.validationMessage = 'This field is required';

// Clear validation
input.status = 'valid';
input.validationMessage = '';
```

### Custom Validation

Implement custom validation logic:

```javascript
function validateEmail(email) {
  const input = document.querySelector('calcite-input-text[name="email"]');

  if (!email.includes('@')) {
    input.status = 'invalid';
    input.validationMessage = 'Please enter a valid email address';
    return false;
  }

  input.status = 'valid';
  input.validationMessage = '';
  return true;
}
```

## CSS Variables and Styling

Calcite components are styled using CSS custom properties.

### Component-Level Theming

```css
/* Theme a specific component */
calcite-button {
  --calcite-color-brand: #ff6b35;
  --calcite-color-brand-hover: #e55a2b;
  --calcite-color-text-1: #ffffff;
}

/* Theme all buttons in a section */
.my-section calcite-button {
  --calcite-color-brand: #007acc;
}
```

### Global Theming

```css
:root {
  /* Global color overrides */
  --calcite-color-brand: #your-brand-color;
  --calcite-color-text-1: #your-text-color;

  /* Global typography */
  --calcite-font-family-primary: "Your Font", sans-serif;

  /* Global spacing */
  --calcite-spacing-md: 1.25rem;
}
```

### CSS Custom Properties Reference

Each component documents its available CSS variables in its API reference.

## Modes (Light/Dark Themes)

Calcite supports multiple visual modes:

```html
<!-- Light mode (default) -->
<body class="calcite-mode-light">

<!-- Dark mode -->
<body class="calcite-mode-dark">

<!-- Auto mode (follows system preference) -->
<body class="calcite-mode-auto">
```

```javascript
// Toggle modes programmatically
document.body.className = 'calcite-mode-dark';

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
  document.body.className = e.matches ? 'calcite-mode-dark' : 'calcite-mode-light';
});
```

## Global Configuration

Calcite provides global configuration options:

```javascript
// Check version at runtime
window.addEventListener('load', () => {
  console.log('Calcite version:', window.calciteConfig.version);
});

// Disable console messages in production
window.calciteConfig = {
  logLevel: 'off'
};
```

## Performance Considerations

### Lazy Loading

Components are loaded only when used, improving initial page load:

```html
<!-- Only calcite-button implementation loads -->
<calcite-button>Click me</calcite-button>

<!-- Multiple components share the same implementation -->
<calcite-button>Button 1</calcite-button>
<calcite-button>Button 2</calcite-button>
```

### Bundle Optimization

For production builds, consider:

- **Tree shaking**: Only include used components
- **Code splitting**: Load components on demand
- **Asset hosting**: Use CDN for static assets

## Debugging

### Development Tools

```javascript
// Enable debug logging
window.calciteConfig = {
  logLevel: 'debug'
};

// Inspect component internals
const component = document.querySelector('calcite-button');
console.log('Shadow root:', component.shadowRoot);
console.log('Properties:', Object.keys(component));

// Check component state
console.log('Hydrated:', component.classList.contains('calcite-hydrated'));
```

### Common Issues

**"Component not defined"**
- Ensure `defineCustomElements()` is called
- Check component library is loaded

**"Events not firing"**
- Verify event name spelling
- Ensure event listeners are attached after component creation

**"Styles not applying"**
- Remember Shadow DOM encapsulation
- Use CSS custom properties for theming

**"Property changes not reflecting"**
- Some properties are read-only
- Wait for `componentOnReady()` before accessing methods

## Migration from Other Libraries

### From React/Vue Components

```javascript
// Before (React)
import { Button } from 'other-library';
<Button onClick={handleClick}>Click me</Button>

// After (Calcite)
import { CalciteButton } from '@esri/calcite-components-react';
<CalciteButton onCalciteButtonClick={handleClick}>Click me</CalciteButton>
```

### From CSS Frameworks

```css
/* Before (Bootstrap) */
.btn-primary {
  background-color: #007bff;
  border-color: #007bff;
}

/* After (Calcite) */
calcite-button {
  --calcite-color-brand: #007ac2;
}
```

Understanding these core concepts will help you build robust, maintainable applications with Calcite Design System.
