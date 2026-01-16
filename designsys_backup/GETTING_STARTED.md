# Getting Started with Calcite Design System

## Installation Methods

### Method 1: CDN (Recommended for quick starts)

The most common approach for loading Calcite Components is to use the version hosted on the ArcGIS CDN:

```html
<script type="module" src="https://js.arcgis.com/calcite-components/3.3.3/calcite.esm.js"></script>
```

Once loaded, components can be used like any other HTML element. Only components that are used in the application will be loaded.

### Method 2: NPM Package

Calcite Components is also provided as an NPM package:

```bash
npm install @esri/calcite-components
```

## Setup and Configuration

### Load the Styles

Load the Cascading Style Sheet (CSS). This is dependent on your framework or build tool:

```javascript
import "@esri/calcite-components/dist/calcite/calcite.css";
```

### Choose a Build

Calcite Components offers two builds to suit different use cases:

#### Custom Elements Build (Recommended)

The Custom Elements build is recommended for projects using frontend frameworks. It allows you to import individual components as needed.

```javascript
// Set asset path if hosting locally (optional)
import { setAssetPath } from "@esri/calcite-components/dist/components";
setAssetPath("/path-to-your-assets/");

// Import components
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-icon";
import "@esri/calcite-components/components/calcite-slider";
```

#### Distribution Build

The Distribution build requires defining custom elements on the global window object:

```javascript
import { defineCustomElements } from "@esri/calcite-components/loader";

// CDN hosted assets (default)
defineCustomElements();

// Or for local assets:
defineCustomElements({ resourcesUrl: "/path-to-your-assets/" });
```

This approach does not require importing individual components - all components are registered globally.

### Asset Handling

Some components (like `calcite-icon` and `calcite-date-picker`) rely on static assets. By default, assets are automatically served from the CDN. If you prefer to host assets locally:

```bash
cp -r node_modules/@esri/calcite-components/dist/calcite/assets/* ./public/assets/
```

Then set the asset path:

```javascript
import { setAssetPath } from "@esri/calcite-components";
setAssetPath("/path-to-your-assets/");
```

## TypeScript Support

Calcite provides full TypeScript typings:

```typescript
import "@esri/calcite-components";

// Components are properly typed
const loader = document.createElement("calcite-loader");
loader.active = true; // ✅ TypeScript knows this property exists

// Explicit typing
const typedLoader = document.querySelector(".my-loader") as HTMLCalciteLoaderElement;
```

## Framework-Specific Setup

### React

For React applications, use the React-specific wrapper components:

```bash
npm install @esri/calcite-components-react
```

```typescript
import { CalciteButton, CalciteIcon } from "@esri/calcite-components-react";

function MyComponent() {
  return (
    <CalciteButton appearance="solid" color="blue">
      <CalciteIcon icon="plus" />
      Add Item
    </CalciteButton>
  );
}
```

**Important React Notes:**
- Boolean attributes in React need special handling (don't set `disabled={false}`)
- Use event handlers like `onCalciteButtonClick` for component events
- Import both `@esri/calcite-components` and `@esri/calcite-components-react`

### Vue.js

```javascript
import Vue from 'vue';
import { applyPolyfills, defineCustomElements } from '@esri/calcite-components/loader';

applyPolyfills().then(() => {
  defineCustomElements();
});

Vue.config.ignoredElements = [/calcite-\w*/];
```

### Angular

```typescript
// In main.ts
import { defineCustomElements } from '@esri/calcite-components/loader';
defineCustomElements();

// In app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ... other config
})
export class AppModule {}
```

## Testing Setup

### Jest Configuration

To resolve CommonJS/ESM module conflicts:

```json
{
  "transformIgnorePatterns": [
    "/node_modules/(?!(@esri/calcite-components*))"
  ]
}
```

## Modes (Light/Dark Theme)

Calcite supports light and dark modes:

```html
<!-- Light mode -->
<body class="calcite-mode-light">

<!-- Dark mode -->
<body class="calcite-mode-dark">

<!-- Auto mode (follows system preference) -->
<body class="calcite-mode-auto">
```

## Global Configuration

```javascript
// Check version at runtime
window.addEventListener("load", () =>
  console.log(window.calciteConfig.version)
);

// Disable log messages in production
var calciteConfig = {
  logLevel: "off"
};
```

## Examples Repository

For complete examples with different frameworks and build tools, visit:
https://github.com/Esri/calcite-design-system/tree/main/examples/components
