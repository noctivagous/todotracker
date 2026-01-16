# Calcite Design System Reference

**Calcite Design System** is a collection of design and development resources for creating beautiful, easy to use, cohesive experiences across apps with minimal effort. It includes a UI kit, icons, color schemes, and a web component library with UI elements such as buttons, panels, accordions, alerts, and many more.

Current version: **3.3** (September 2025)

## Quick Start

### Using CDN (Recommended for simple projects)
```html
<script type="module" src="https://js.arcgis.com/calcite-components/3.3.3/calcite.esm.js"></script>
```

### Using NPM
```bash
npm install @esri/calcite-components
```

## What is Calcite?

Calcite Components is a rich library of flexible, framework-agnostic web components for building web applications. With Calcite Components, you can quickly build on-brand, lightweight, and accessible web applications.

### Key Features
- **Framework Agnostic**: Works with any JavaScript framework or vanilla JS
- **Accessible**: Built with accessibility best practices
- **Customizable**: Extensive theming and styling options
- **Lightweight**: Only loads components you actually use
- **Consistent**: Unified design language across all components

## Documentation Structure

- **[Getting Started](./GETTING_STARTED.md)** - Installation, setup, and basic usage
- **[Components](./COMPONENTS.md)** - Complete component reference with 60+ components
- **[Framework Integration](./FRAMEWORKS.md)** - React, TypeScript, Jest, and framework-specific guides
- **[Foundations](./FOUNDATIONS.md)** - Design tokens, colors, typography, accessibility
- **[Core Concepts](./CORE_CONCEPTS.md)** - Web components fundamentals, Shadow DOM, events
- **[Resources](./RESOURCES.md)** - Community, licensing, system requirements

## Prerequisites

You need a free [ArcGIS Online](https://www.arcgis.com/index.html) and/or [ArcGIS Location Platform](https://location.arcgis.com/) account.

## Official Resources

- **Website**: https://developers.arcgis.com/calcite-design-system/
- **GitHub**: https://github.com/Esri/calcite-design-system
- **NPM**: https://www.npmjs.com/package/@esri/calcite-components
- **Community**: https://community.esri.com/t5/developers/ct-p/developers

## Basic Example

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="https://js.arcgis.com/calcite-components/3.3.3/calcite.esm.js"></script>
    <link rel="stylesheet" href="https://js.arcgis.com/calcite-components/3.3.3/calcite.css">
</head>
<body>
    <calcite-button appearance="solid" color="blue">
        Hello Calcite!
    </calcite-button>
</body>
</html>
```

For more examples and detailed documentation, see the individual guides in this reference.
