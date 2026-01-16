# Design Foundations

Calcite Design System foundations provide the core design principles, tokens, and guidelines that ensure consistency across all components and applications.

## Design Tokens

Design tokens are the visual design atoms of the design system - named entities that store visual design attributes. Calcite uses CSS custom properties (CSS variables) for all design tokens.

### Token Categories

- **Color tokens**: Background, text, border, and accent colors
- **Typography tokens**: Font families, sizes, weights, and line heights
- **Spacing tokens**: Margins, paddings, and positioning values
- **Sizing tokens**: Component dimensions and breakpoints
- **Border tokens**: Border widths, radii, and styles
- **Shadow tokens**: Elevation and depth values

### Using Design Tokens

```css
.my-component {
  /* Color tokens */
  color: var(--calcite-color-text-1);
  background-color: var(--calcite-color-background);

  /* Typography tokens */
  font-family: var(--calcite-font-family-primary);
  font-size: var(--calcite-font-size-0);
  line-height: var(--calcite-line-height-relative-tight);

  /* Spacing tokens */
  padding: var(--calcite-spacing-sm);
  margin-bottom: var(--calcite-spacing-md);

  /* Border tokens */
  border: var(--calcite-border-width-sm) solid var(--calcite-color-border-1);
  border-radius: var(--calcite-border-radius-sm);
}
```

## Colors and Theming

Calcite supports comprehensive theming with light and dark modes, plus extensive customization options.

### Color System

#### Core Color Tokens
- **Text colors**: `--calcite-color-text-1`, `--calcite-color-text-2`, `--calcite-color-text-3`
- **Background colors**: `--calcite-color-background`, `--calcite-color-foreground-1`
- **Border colors**: `--calcite-color-border-1`, `--calcite-color-border-2`, `--calcite-color-border-3`
- **Status colors**: Brand blue, success green, warning orange, danger red

#### Semantic Colors
```css
/* Brand colors */
--calcite-color-brand: #007ac2;
--calcite-color-brand-hover: #00619b;

/* Status colors */
--calcite-color-status-success: #35ac46;
--calcite-color-status-warning: #edd317;
--calcite-color-status-danger: #d83020;
--calcite-color-status-info: #00619b;
```

### Theme Customization

#### Global Theme Override
```css
:root {
  /* Override brand color */
  --calcite-color-brand: #ff6b35;

  /* Custom text colors */
  --calcite-color-text-1: #2d3748;
  --calcite-color-text-2: #4a5568;

  /* Custom backgrounds */
  --calcite-color-background: #ffffff;
  --calcite-color-foreground-1: #f7fafc;
}
```

#### Component-Specific Theming
```css
/* Button theming */
calcite-button {
  --calcite-color-brand: #ff6b35;
  --calcite-color-brand-hover: #e55a2b;
}

/* Panel theming */
calcite-panel {
  --calcite-color-background: #f8f9fa;
  --calcite-color-border-1: #dee2e6;
}
```

### Light and Dark Modes

Calcite provides three mode classes:

```html
<!-- Light mode (default) -->
<body class="calcite-mode-light">

<!-- Dark mode -->
<body class="calcite-mode-dark">

<!-- Auto mode (follows system preference) -->
<body class="calcite-mode-auto">
```

```css
/* Mode-specific overrides */
.calcite-mode-dark {
  --calcite-color-background: #1a1a1a;
  --calcite-color-text-1: #ffffff;
  --calcite-color-text-2: #cccccc;
}

.calcite-mode-light {
  --calcite-color-background: #ffffff;
  --calcite-color-text-1: #2d3748;
  --calcite-color-text-2: #4a5568;
}
```

## Typography

Calcite provides a comprehensive typography system with consistent font scales and spacing.

### Font Families

```css
/* Primary font family (default) */
--calcite-font-family-primary: "Inter Variable", "Inter", system-ui, -apple-system, blinkmacsystemfont, "Segoe UI", roboto, sans-serif;

/* Code font family */
--calcite-font-family-code: "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Droid Sans Mono", "Source Code Pro", monospace;

/* Secondary font family */
--calcite-font-family-secondary: "Noto Sans", system-ui, -apple-system, blinkmacsystemfont, "Segoe UI", roboto, sans-serif;
```

### Font Sizes

Calcite uses a relative font size scale:

```css
--calcite-font-size--3: 0.5625rem;  /* 9px */
--calcite-font-size--2: 0.6875rem;  /* 11px */
--calcite-font-size--1: 0.8125rem;  /* 13px */
--calcite-font-size-0: 1rem;        /* 16px */
--calcite-font-size-1: 1.125rem;    /* 18px */
--calcite-font-size-2: 1.25rem;     /* 20px */
--calcite-font-size-3: 1.5rem;      /* 24px */
--calcite-font-size-4: 2rem;        /* 32px */
--calcite-font-size-5: 2.5rem;      /* 40px */
--calcite-font-size-6: 3rem;        /* 48px */
```

### Font Weights

```css
--calcite-font-weight-light: 300;
--calcite-font-weight-normal: 400;
--calcite-font-weight-medium: 500;
--calcite-font-weight-semibold: 600;
--calcite-font-weight-bold: 700;
```

### Line Heights

```css
--calcite-line-height-relative-loose: 1.75;
--calcite-line-height-relative-relaxed: 1.625;
--calcite-line-height-relative-normal: 1.5;
--calcite-line-height-relative-snug: 1.375;
--calcite-line-height-relative-tight: 1.25;
```

### Typography Classes

Calcite provides utility classes for common typography patterns:

```html
<h1 class="text-6 font-bold">Page Title</h1>
<p class="text-0 text-color-2">Body text with secondary color</p>
<code class="font-mono text--1">Inline code</code>
```

## Spacing

Calcite uses a consistent spacing scale based on a 4px grid system:

```css
--calcite-spacing-0: 0;
--calcite-spacing-px: 1px;
--calcite-spacing-0\.5: 0.125rem;  /* 2px */
--calcite-spacing-1: 0.25rem;      /* 4px */
--calcite-spacing-2: 0.5rem;       /* 8px */
--calcite-spacing-3: 0.75rem;      /* 12px */
--calcite-spacing-4: 1rem;         /* 16px */
--calcite-spacing-5: 1.25rem;      /* 20px */
--calcite-spacing-6: 1.5rem;       /* 24px */
--calcite-spacing-8: 2rem;         /* 32px */
--calcite-spacing-10: 2.5rem;      /* 40px */
--calcite-spacing-12: 3rem;        /* 48px */
--calcite-spacing-16: 4rem;        /* 64px */
--calcite-spacing-20: 5rem;        /* 80px */
--calcite-spacing-24: 6rem;        /* 96px */
```

### Spacing Utilities

```css
/* Margin utilities */
.margin-0 { margin: var(--calcite-spacing-0); }
.margin-1 { margin: var(--calcite-spacing-1); }
.margin-2 { margin: var(--calcite-spacing-2); }

/* Padding utilities */
.padding-0 { padding: var(--calcite-spacing-0); }
.padding-1 { padding: var(--calcite-spacing-1); }
.padding-2 { padding: var(--calcite-spacing-2); }
```

## Borders and Shadows

### Border Tokens

```css
/* Border widths */
--calcite-border-width-none: 0;
--calcite-border-width-sm: 1px;
--calcite-border-width-md: 2px;
--calcite-border-width-lg: 4px;

/* Border radii */
--calcite-border-radius-none: 0;
--calcite-border-radius-sm: 2px;
--calcite-border-radius-md: 4px;
--calcite-border-radius-lg: 8px;
--calcite-border-radius-xl: 16px;
--calcite-border-radius-full: 9999px;
```

### Shadow Tokens

Calcite provides elevation levels through shadow tokens:

```css
/* Elevation levels */
--calcite-shadow-none: none;
--calcite-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--calcite-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--calcite-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--calcite-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--calcite-shadow-xxl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

## Accessibility

Calcite components are built with accessibility as a core principle, following WCAG 2.1 AA guidelines.

### Color Contrast

All color combinations meet WCAG contrast requirements:

- **Normal text**: 4.5:1 minimum contrast ratio
- **Large text**: 3:1 minimum contrast ratio
- **UI components**: 3:1 minimum contrast ratio

### Focus Management

Calcite provides consistent focus indicators:

```css
/* Focus ring styles */
--calcite-focus-color: var(--calcite-color-brand);
--calcite-focus-width: 2px;
--calcite-focus-offset: 2px;
```

### Keyboard Navigation

All interactive components support keyboard navigation:

- **Tab**: Move focus between components
- **Enter/Space**: Activate buttons and links
- **Arrow keys**: Navigate within component groups (menus, lists, etc.)
- **Escape**: Close modals, dropdowns, and popovers

### Screen Reader Support

Components include proper ARIA attributes:

```html
<!-- Labels and descriptions -->
<calcite-input-text label="Email address" aria-describedby="email-help">
  <calcite-input-message id="email-help" status="idle">
    We'll never share your email with anyone else.
  </calcite-input-message>
</calcite-input-text>

<!-- Required fields -->
<calcite-input-text label="Full name" required aria-required="true">
</calcite-input-text>

<!-- Error states -->
<calcite-input-text
  label="Password"
  status="invalid"
  aria-invalid="true"
  aria-describedby="password-error"
>
  <calcite-input-message id="password-error" status="invalid">
    Password must be at least 8 characters long.
  </calcite-input-message>
</calcite-input-text>
```

### Motion and Animation

Calcite provides consistent animation timing and easing:

```css
/* Animation timing */
--calcite-animation-timing-fast: 100ms;
--calcite-animation-timing-normal: 200ms;
--calcite-animation-timing-slow: 300ms;

/* Easing functions */
--calcite-animation-easing-in: cubic-bezier(0.4, 0, 1, 1);
--calcite-animation-easing-out: cubic-bezier(0, 0, 0.2, 1);
--calcite-animation-easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

## Iconography

### UI Icons

Calcite includes a comprehensive icon library with consistent visual style:

```html
<!-- Basic icon usage -->
<calcite-icon icon="home" scale="s"></calcite-icon>

<!-- Icon in button -->
<calcite-button icon-start="plus">
  Add Item
</calcite-button>
```

### Icon Categories

- **Action icons**: add, remove, edit, delete
- **Navigation icons**: home, menu, back, forward
- **Status icons**: success, warning, error, info
- **Content icons**: file, folder, image, document

### Icon Sizing

Icons support multiple scales:

```html
<calcite-icon icon="home" scale="xs"></calcite-icon>  <!-- 12px -->
<calcite-icon icon="home" scale="s"></calcite-icon>   <!-- 16px -->
<calcite-icon icon="home" scale="m"></calcite-icon>   <!-- 24px -->
<calcite-icon icon="home" scale="l"></calcite-icon>   <!-- 32px -->
<calcite-icon icon="home" scale="xl"></calcite-icon>  <!-- 48px -->
```

## Responsive Design

Calcite provides breakpoint tokens for responsive design:

```css
/* Breakpoints */
--calcite-breakpoint-s: 480px;
--calcite-breakpoint-m: 768px;
--calcite-breakpoint-l: 1024px;
--calcite-breakpoint-xl: 1440px;

/* Container widths */
--calcite-container-width-s: 480px;
--calcite-container-width-m: 768px;
--calcite-container-width-l: 1024px;
--calcite-container-width-xl: 1440px;
```

### Responsive Utilities

```css
/* Hide/show at different breakpoints */
@media (max-width: var(--calcite-breakpoint-s)) {
  .hide-on-mobile { display: none; }
}

@media (min-width: var(--calcite-breakpoint-m)) {
  .show-on-tablet-up { display: block; }
}
```

## Design Token Reference

For a complete list of all design tokens, visit:
https://developers.arcgis.com/calcite-design-system/foundations/tokens/reference/

### Token Naming Convention

Tokens follow a consistent naming pattern:
`--calcite-{category}-{property}-{variant}`

Examples:
- `--calcite-color-text-1`
- `--calcite-font-size-0`
- `--calcite-spacing-md`
- `--calcite-border-radius-sm`

## Customizing the Design System

### Creating a Theme

```css
:root {
  /* Custom brand colors */
  --calcite-color-brand: #your-brand-color;
  --calcite-color-brand-hover: #your-brand-hover-color;

  /* Custom typography */
  --calcite-font-family-primary: "Your Font", sans-serif;

  /* Custom spacing */
  --calcite-spacing-md: 1.25rem;

  /* Custom border radius */
  --calcite-border-radius-md: 6px;
}
```

### Theme Inheritance

Child components inherit theme tokens from their parents, allowing for scoped theming:

```html
<div class="theme-dark">
  <calcite-button>Dark Button</calcite-button>
</div>

<div class="theme-light">
  <calcite-button>Light Button</calcite-button>
</div>
```

```css
.theme-dark {
  --calcite-color-background: #1a1a1a;
  --calcite-color-text-1: #ffffff;
}

.theme-light {
  --calcite-color-background: #ffffff;
  --calcite-color-text-1: #2d3748;
}
```

This foundation ensures consistent, accessible, and maintainable design across all Calcite implementations.
