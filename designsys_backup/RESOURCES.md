# Resources and Community

This guide covers community resources, licensing information, system requirements, and additional tools for working with Calcite Design System.

## Community Resources

### Official Community

- **Esri Community**: https://community.esri.com/t5/developers/ct-p/developers
  - Ask questions and share solutions
  - Connect with other developers
  - Access user-generated content and tutorials

- **GitHub Repository**: https://github.com/Esri/calcite-design-system
  - Source code and issue tracking
  - Contributing guidelines
  - Release notes and changelogs

- **GitHub Discussions**: https://github.com/Esri/calcite-design-system/discussions
  - Feature requests and RFCs
  - General discussions
  - Q&A and troubleshooting

### Social Media

- **Esri Developers on X (Twitter)**: https://twitter.com/EsriDevs
- **Esri Developers on YouTube**: https://www.youtube.com/@EsriDevs
- **Esri Developers on LinkedIn**: https://www.linkedin.com/showcase/esri-developers/

### Video Content

- **Developer Videos on Esri Video**: https://mediaspace.esri.com/category/Developers/244548402/
- **Live streams and webinars**
- **Tutorial series and deep dives**

## Support

### Documentation

- **Main Documentation**: https://developers.arcgis.com/calcite-design-system/
- **Component API Reference**: Comprehensive API docs for all components
- **Release Notes**: https://developers.arcgis.com/calcite-design-system/releases/
- **Migration Guides**: Breaking change documentation

### Getting Help

1. **Check the Documentation**: Most questions are answered in the official docs
2. **Search GitHub Issues**: Many common issues have already been reported and resolved
3. **Ask the Community**: Use Esri Community forums for questions
4. **File GitHub Issues**: For bugs or feature requests

### Support Channels

- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions
- **General Questions**: Esri Community Forums
- **Security Issues**: Report via Esri's security disclosure process

## Licensing

### Apache 2.0 License

Calcite Design System is released under the Apache License 2.0:

```
Copyright 2024 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

### Commercial Use

Calcite Design System can be used in commercial applications without restrictions, subject to the Apache 2.0 license terms.

### Attribution

While not required by the license, attribution to Esri and the Calcite Design System is appreciated in your application's about page or documentation.

## System Requirements

### Browser Support

Calcite components support all modern browsers:

#### Fully Supported
- **Chrome** (latest 2 versions)
- **Firefox** (latest 2 versions)
- **Safari** (latest 2 versions)
- **Edge** (latest 2 versions)

#### Partially Supported
- **Internet Explorer 11** (limited support for modern features)
- **Legacy browsers** (may require polyfills)

### JavaScript Requirements

- **ES2017+** support required
- **Custom Elements v1** support
- **Shadow DOM v1** support
- **CSS Custom Properties** (CSS Variables) support

### Node.js Requirements

For development and building:
- **Node.js**: 16.0.0 or higher
- **npm**: 7.0.0 or higher (comes with Node.js)

### Build Tool Compatibility

Calcite works with all major build tools:
- **Webpack** 4+
- **Rollup** 2+
- **Vite** 2+
- **Parcel** 2+
- **esbuild** 0.12+

## UI Kit Resources

### Figma UI Kit

Calcite provides a comprehensive Figma UI Kit for design prototyping:

- **Download**: Available on Esri Figma Community
- **Features**: All components, design tokens, and patterns
- **Updates**: Regularly updated with new components and features

### Design Assets

- **Color palettes**: Exportable color tokens
- **Typography scales**: Font families, sizes, and weights
- **Icon library**: All available icons for design use
- **Component libraries**: Pre-built component variations

### Design Guidelines

- **Spacing system**: 4px grid-based spacing scale
- **Typography hierarchy**: Consistent text sizing and spacing
- **Color usage**: Brand colors, semantic colors, and theming
- **Component patterns**: Common interaction patterns and layouts

## Framework Examples

### Official Examples Repository

Complete working examples for all major frameworks:

**Location**: https://github.com/Esri/calcite-design-system/tree/main/examples/components

#### Available Examples

- **React**: TypeScript and JavaScript examples
- **Vue.js**: Vue 3 Composition API examples
- **Angular**: Latest Angular with TypeScript
- **Svelte**: Modern Svelte examples
- **Vanilla JavaScript**: Framework-agnostic examples
- **Next.js**: Server-side rendering examples
- **Vite**: Fast development setup examples

### Example Structure

Each example includes:
- **Complete setup**: Package.json, configuration files
- **Component usage**: Real-world usage patterns
- **Build configuration**: Optimized for production
- **TypeScript support**: Full type definitions

## Development Tools

### Visual Studio Code Integration

#### IntelliSense Support

Calcite provides IntelliSense support for VS Code:

```json
// .vscode/settings.json
{
  "html.customData": [
    "./node_modules/@esri/calcite-components/dist/docs/vscode.html-custom-data.json"
  ],
  "css.customData": [
    "./node_modules/@esri/calcite-components/dist/docs/vscode.css-custom-data.json"
  ]
}
```

Features:
- **Component autocompletion**: HTML tag suggestions
- **Attribute completion**: Property and attribute suggestions
- **CSS variable completion**: Design token suggestions
- **Documentation on hover**: Inline API documentation

### Development Scripts

#### Local Development

```bash
# Clone the repository
git clone https://github.com/Esri/calcite-design-system.git
cd calcite-design-system

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

#### Contributing

Calcite welcomes contributions:

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Add tests** for new functionality
5. **Submit** a pull request

See [CONTRIBUTING.md](https://github.com/Esri/calcite-design-system/blob/main/CONTRIBUTING.md) for detailed guidelines.

## Learning Resources

### Tutorials

- **Getting Started Tutorial**: https://developers.arcgis.com/calcite-design-system/get-started/
- **Core Concepts Tutorial**: https://developers.arcgis.com/calcite-design-system/core-concepts/
- **Framework Integration**: https://developers.arcgis.com/calcite-design-system/resources/frameworks/

### Video Tutorials

- **Calcite Component Basics**: Introduction to web components
- **Theming and Customization**: Advanced styling techniques
- **Form Integration**: Building forms with Calcite
- **Accessibility**: Making accessible applications

### Sample Applications

- **Calcite Design System Examples**: https://github.com/Esri/calcite-design-system/tree/main/examples
- **Real-world applications**: Built with Calcite components
- **Pattern libraries**: Common UI patterns and layouts

## Performance Optimization

### Bundle Size Optimization

#### Tree Shaking

Calcite supports tree shaking to reduce bundle sizes:

```javascript
// Only import used components
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-input-text";

// Instead of importing everything
// import "@esri/calcite-components";
```

#### Dynamic Imports

Load components on demand:

```javascript
// Load component when needed
async function loadModal() {
  await import("@esri/calcite-components/components/calcite-modal");
  const modal = document.createElement('calcite-modal');
  document.body.appendChild(modal);
}
```

### Asset Optimization

#### CDN vs Local Assets

Choose the right asset hosting strategy:

```javascript
// CDN assets (default, recommended for most apps)
import { defineCustomElements } from '@esri/calcite-components/loader';
defineCustomElements(); // Uses CDN assets

// Local assets (for offline apps or custom CDNs)
import { defineCustomElements } from '@esri/calcite-components/loader';
defineCustomElements({
  resourcesUrl: '/path-to-your-assets/'
});
```

#### Asset Preloading

Preload critical component assets:

```html
<link rel="modulepreload" href="https://js.arcgis.com/calcite-components/3.3.3/calcite.esm.js">
<link rel="preload" href="https://js.arcgis.com/calcite-components/3.3.3/calcite.css" as="style">
```

## Migration Guides

### From Calcite 2.x to 3.x

Major changes in Calcite 3.0:
- **New component APIs**: Some properties and events changed
- **Improved accessibility**: Better screen reader support
- **Enhanced theming**: More comprehensive design token system
- **Better TypeScript support**: Improved type definitions

#### Migration Steps

1. **Update package version**: `npm install @esri/calcite-components@3`
2. **Check breaking changes**: Review changelog for your components
3. **Update component usage**: Modify deprecated properties/events
4. **Test thoroughly**: Ensure all functionality works as expected

### From Other Design Systems

#### From Material Design

```javascript
// Material Design
<button class="mdc-button mdc-button--raised">
  <span class="mdc-button__label">Button</span>
</button>

// Calcite equivalent
<calcite-button appearance="solid">Button</calcite-button>
```

#### From Bootstrap

```html
<!-- Bootstrap -->
<div class="card">
  <div class="card-body">
    <h5 class="card-title">Title</h5>
    <p class="card-text">Content</p>
  </div>
</div>

<!-- Calcite equivalent -->
<calcite-card>
  <h3 slot="title">Title</h3>
  <p>Content</p>
</calcite-card>
```

## Troubleshooting

### Common Issues

#### Component Not Loading

```javascript
// Ensure components are defined
import { defineCustomElements } from '@esri/calcite-components/loader';

// Call this once, early in your app
defineCustomElements().catch(console.error);
```

#### Styles Not Applying

```css
/* Remember Shadow DOM encapsulation */
/* This won't work */
calcite-button .internal-class {
  color: red;
}

/* Use CSS variables instead */
calcite-button {
  --calcite-color-text-1: red;
}
```

#### Events Not Firing

```javascript
// Ensure event listeners are attached after component creation
document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('calcite-button');
  button.addEventListener('calciteButtonClick', handleClick);
});
```

### Debug Tools

```javascript
// Enable verbose logging
window.calciteConfig = {
  logLevel: 'debug'
};

// Check component state
const component = document.querySelector('calcite-button');
console.log('Hydrated:', component.classList.contains('calcite-hydrated'));
console.log('Version:', window.calciteConfig?.version);
```

## Staying Updated

### Release Notifications

- **GitHub Releases**: https://github.com/Esri/calcite-design-system/releases
- **Changelog**: https://developers.arcgis.com/calcite-design-system/releases/changelogs/latest/
- **Breaking Changes**: Review migration guides for major versions

### Version Management

```json
// package.json
{
  "dependencies": {
    "@esri/calcite-components": "^3.3.0"
  }
}
```

Use **caret ranges** (^) for patch updates, **tilde ranges** (~) for minor updates.

## Contributing Back

### Ways to Contribute

1. **Report bugs**: Use GitHub issues
2. **Request features**: Use GitHub discussions
3. **Write documentation**: Help improve guides and examples
4. **Create examples**: Share your implementation patterns
5. **Submit code**: Fix bugs or add features

### Code of Conduct

Calcite follows Esri's code of conduct. Be respectful and inclusive when participating in the community.

This comprehensive resource guide should help you make the most of Calcite Design System in your projects.
