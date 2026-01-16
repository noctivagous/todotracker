# Framework Integration Guide

Calcite Components integrates seamlessly with all major JavaScript frameworks. This guide covers framework-specific setup, best practices, and common patterns.

## TypeScript Support

Calcite provides full TypeScript typings across all components:

```typescript
// Basic typing support
import "@esri/calcite-components";

const loader = document.createElement("calcite-loader");
loader.active = true; // ✅ TypeScript knows this exists

// Explicit element typing
const typedLoader = document.querySelector(".my-loader") as HTMLCalciteLoaderElement;
```

### Framework-Specific TypeScript Setup

#### React 19+
```typescript
/// <reference types="@esri/calcite-components/types/react" />
```

#### Preact
```typescript
/// <reference types="@esri/calcite-components/types/preact" />
```

#### Stencil
```typescript
/// <reference types="@esri/calcite-components/types/stencil" />
```

#### Other Frameworks
```typescript
/// <reference types="@esri/calcite-components" />
```

## React Integration

### Calcite Components React Package

For React applications, Esri provides React-specific wrapper components that handle event binding and property synchronization:

```bash
npm install @esri/calcite-components-react
```

```typescript
import { CalciteButton, CalciteIcon, CalciteSlider } from "@esri/calcite-components-react";
import { CalciteButton as CalciteButtonCore } from "@esri/calcite-components";

function MyComponent() {
  const [sliderValue, setSliderValue] = useState(50);

  return (
    <div>
      <CalciteButton appearance="solid" color="blue">
        <CalciteIcon icon="plus" />
        Add Item
      </CalciteButton>

      <CalciteSlider
        min={0}
        max={100}
        value={sliderValue}
        onCalciteSliderInput={(event) => setSliderValue(event.target.value)}
      />
    </div>
  );
}
```

### Important React Considerations

#### Boolean Attributes
In React, boolean attributes need special handling due to how React handles DOM properties:

```typescript
// ❌ This won't work as expected
<CalciteButton disabled={false}>Button</CalciteButton>

// ✅ Correct approaches
<CalciteButton>Enabled Button</CalciteButton>  // Don't set attribute
<CalciteButton disabled={true}>Disabled Button</CalciteButton>  // Set to true
<CalciteButton disabled>Disabled Button</CalciteButton>  // Just presence matters
```

#### Event Handling
Calcite components emit custom events. React components use camelCase event names:

```typescript
// Web Component event: calciteButtonClick
// React prop: onCalciteButtonClick

<CalciteButton onCalciteButtonClick={handleClick}>
  Click me
</CalciteButton>
```

#### Refs and Methods
```typescript
function MyComponent() {
  const buttonRef = useRef<HTMLCalciteButtonElement>(null);

  const focusButton = async () => {
    await buttonRef.current?.componentOnReady();
    buttonRef.current?.setFocus();
  };

  return (
    <CalciteButton ref={buttonRef}>
      Focusable Button
    </CalciteButton>
  );
}
```

### React Hooks Integration

```typescript
import { useState, useEffect, useRef } from 'react';

function FormComponent() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const inputRef = useRef<HTMLCalciteInputTextElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      const handleInput = (event: CustomEvent) => {
        setFormData(prev => ({ ...prev, name: event.detail.value }));
      };

      input.addEventListener('calciteInputInput', handleInput);
      return () => input.removeEventListener('calciteInputInput', handleInput);
    }
  }, []);

  return (
    <CalciteInputText
      ref={inputRef}
      label="Name"
      value={formData.name}
      required
    />
  );
}
```

## Vue.js Integration

```javascript
// main.js
import Vue from 'vue';
import { applyPolyfills, defineCustomElements } from '@esri/calcite-components/loader';

applyPolyfills().then(() => {
  defineCustomElements();
});

// Tell Vue to ignore Calcite components
Vue.config.ignoredElements = [/calcite-\w*/];
```

```vue
<template>
  <div>
    <calcite-button
      appearance="solid"
      color="blue"
      @click="handleClick"
    >
      {{ buttonText }}
    </calcite-button>

    <calcite-input-text
      v-model="inputValue"
      label="Enter text"
      @calciteInputInput="onInput"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      buttonText: 'Click me',
      inputValue: ''
    };
  },
  methods: {
    handleClick() {
      console.log('Button clicked!');
    },
    onInput(event) {
      console.log('Input value:', event.target.value);
    }
  }
};
</script>
```

## Angular Integration

```typescript
// main.ts
import { defineCustomElements } from '@esri/calcite-components/loader';
defineCustomElements();
```

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for custom elements
  bootstrap: [AppComponent]
})
export class AppModule {}
```

```typescript
// component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-my-component',
  template: `
    <calcite-button
      #button
      appearance="solid"
      color="blue"
      (click)="handleClick()"
    >
      Click me
    </calcite-button>

    <calcite-input-text
      #input
      label="Enter text"
      (calciteInputInput)="onInput($event)"
    />
  `
})
export class MyComponent {
  @ViewChild('button') button!: ElementRef<HTMLCalciteButtonElement>;
  @ViewChild('input') input!: ElementRef<HTMLCalciteInputTextElement>;

  async ngAfterViewInit() {
    // Wait for component to be ready
    await this.button.nativeElement.componentOnReady();
  }

  handleClick() {
    console.log('Button clicked!');
  }

  onInput(event: any) {
    console.log('Input value:', event.detail.value);
  }
}
```

## Svelte Integration

```javascript
// App.svelte
<script>
  import { onMount } from 'svelte';
  import { defineCustomElements } from '@esri/calcite-components/loader';

  onMount(() => {
    defineCustomElements();
  });

  let buttonText = 'Click me';
  let inputValue = '';

  function handleClick() {
    buttonText = 'Clicked!';
  }

  function handleInput(event) {
    inputValue = event.target.value;
  }
</script>

<calcite-button
  appearance="solid"
  color="blue"
  on:click={handleClick}
>
  {buttonText}
</calcite-button>

<calcite-input-text
  label="Enter text"
  value={inputValue}
  on:calciteInputInput={handleInput}
/>
```

## Testing Setup

### Jest Configuration

Calcite Components uses ES modules, but Jest typically uses CommonJS. Configure Jest to transform Calcite modules:

```json
{
  "transformIgnorePatterns": [
    "/node_modules/(?!(@esri/calcite-components*))"
  ]
}
```

### Testing Examples

#### React Testing Library
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CalciteButton } from '@esri/calcite-components-react';

test('button renders and handles clicks', () => {
  const handleClick = jest.fn();
  render(<CalciteButton onCalciteButtonClick={handleClick}>Click me</CalciteButton>);

  const button = screen.getByRole('button', { name: /click me/i });
  fireEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Vanilla JS Testing
```typescript
import { defineCustomElements } from '@esri/calcite-components/loader';

beforeAll(async () => {
  await defineCustomElements();
});

test('calcite-button renders', () => {
  document.body.innerHTML = '<calcite-button>Click me</calcite-button>';

  const button = document.querySelector('calcite-button');
  expect(button).toBeInTheDocument();
  expect(button.textContent).toBe('Click me');
});
```

## Build Tools Integration

### Vite
```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['@esri/calcite-components']
  }
});
```

### Webpack
```javascript
// webpack.config.js
module.exports = {
  // Ensure Calcite components are not processed by webpack
  externals: {
    '@esri/calcite-components': '@esri/calcite-components'
  }
};
```

### Rollup
```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';

export default {
  plugins: [
    resolve({
      preferBuiltins: false
    })
  ],
  external: ['@esri/calcite-components']
};
```

## Framework-Specific Examples

Complete examples for different frameworks are available in the [official repository](https://github.com/Esri/calcite-design-system/tree/main/examples/components):

- React examples
- Vue.js examples
- Angular examples
- Svelte examples
- Vanilla JavaScript examples
- TypeScript examples

## Best Practices

### Performance
1. **Lazy Loading**: Only import components you actually use
2. **Tree Shaking**: Use build tools that support tree shaking
3. **Asset Hosting**: Consider CDN hosting for assets in production

### Development
1. **TypeScript**: Use TypeScript for better developer experience
2. **Component Ready**: Always wait for `componentOnReady()` before accessing methods
3. **Event Handling**: Use framework-appropriate event binding patterns

### Production
1. **Asset Optimization**: Host assets locally or use CDN
2. **Bundle Splitting**: Split Calcite components into separate chunks
3. **Minification**: Ensure proper minification of custom elements

## Troubleshooting

### Common Issues

**"Custom element not defined"**
- Ensure `defineCustomElements()` is called before using components
- Check that the component library is properly imported

**"Property does not exist"**
- Check TypeScript types are properly configured
- Ensure you're using the correct property names

**"Events not firing"**
- Use correct event names (e.g., `onCalciteButtonClick` in React)
- Ensure event listeners are properly attached

**"Styles not loading"**
- Import CSS files in the correct order
- Check for CSS custom property conflicts

### Debug Mode
Enable debug logging for development:
```javascript
window.calciteConfig = {
  logLevel: 'debug'
};
```
