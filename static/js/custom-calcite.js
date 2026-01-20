/**
 * Custom Calcite Components
 * 
 * Extensions to the Calcite Design System for layout components
 * that aren't provided by the core library (flex, grid, etc.)
 * 
 * These components follow Calcite patterns:
 * - Shadow DOM for encapsulation
 * - CSS custom properties for theming
 * - Calcite design tokens integration
 * - Accessible by default
 * 
 * USAGE EXAMPLES:
 * 
 * 1. Calcite Flex (flexbox container):
 *    <calcite-flex direction="row" gap="m" wrap align="center" justify="space-between">
 *      <calcite-button>Button 1</calcite-button>
 *      <calcite-button>Button 2</calcite-button>
 *    </calcite-flex>
 * 
 * 2. Calcite Grid (CSS Grid container):
 *    <calcite-grid columns="3" gap="l">
 *      <calcite-card>Card 1</calcite-card>
 *      <calcite-card>Card 2</calcite-card>
 *      <calcite-card>Card 3</calcite-card>
 *    </calcite-grid>
 * 
 *    With auto-fit (responsive):
 *    <calcite-grid auto-fit min-column-width="250px" gap="m">
 *      <calcite-card>Card 1</calcite-card>
 *      <calcite-card>Card 2</calcite-card>
 *    </calcite-grid>
 * 
 * 3. Calcite Stack (vertical stack):
 *    <calcite-stack gap="s">
 *      <calcite-label>Label 1</calcite-label>
 *      <calcite-label>Label 2</calcite-label>
 *    </calcite-stack>
 * 
 * GAP VALUES: "xs", "s", "m", "l", "xl" (uses Calcite spacing tokens)
 *             or any CSS value like "1rem", "12px", etc.
 */

(function() {
    'use strict';

    /**
     * Calcite Flex Component
     * 
     * A flexbox container component following Calcite patterns.
     * 
     * Usage:
     *   <calcite-flex direction="row" gap="m" wrap>
     *     <div>Item 1</div>
     *     <div>Item 2</div>
     *   </calcite-flex>
     * 
     * Attributes:
     *   - direction: "row" | "column" (default: "row")
     *   - gap: "xs" | "s" | "m" | "l" | "xl" | CSS value (default: "m")
     *   - wrap: boolean (default: false)
     *   - align: "start" | "center" | "end" | "stretch" (default: "stretch")
     *   - justify: "start" | "center" | "end" | "space-between" | "space-around" (default: "start")
     */
    class CalciteFlex extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        static get observedAttributes() {
            return ['direction', 'gap', 'wrap', 'align', 'justify'];
        }

        connectedCallback() {
            this.render();
        }

        attributeChangedCallback() {
            this.render();
        }

        getDirection() {
            return this.getAttribute('direction') || 'row';
        }

        getGap() {
            const gap = this.getAttribute('gap') || 'm';
            // Map Calcite spacing tokens
            const spacingMap = {
                'xs': 'var(--calcite-spacing-xxs, 0.25rem)',
                's': 'var(--calcite-spacing-xs, 0.5rem)',
                'm': 'var(--calcite-spacing-sm, 0.75rem)',
                'l': 'var(--calcite-spacing-md, 1rem)',
                'xl': 'var(--calcite-spacing-lg, 1.5rem)'
            };
            return spacingMap[gap] || gap;
        }

        getWrap() {
            return this.hasAttribute('wrap') || this.getAttribute('wrap') === 'true';
        }

        getAlign() {
            return this.getAttribute('align') || 'stretch';
        }

        getJustify() {
            return this.getAttribute('justify') || 'start';
        }

        render() {
            const direction = this.getDirection();
            const gap = this.getGap();
            const wrap = this.getWrap();
            const align = this.getAlign();
            const justify = this.getJustify();

            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: flex;
                        flex-direction: ${direction};
                        gap: ${gap};
                        flex-wrap: ${wrap ? 'wrap' : 'nowrap'};
                        align-items: ${align};
                        justify-content: ${justify};
                    }
                    
                    ::slotted(*) {
                        /* Allow slotted content to participate in flex layout */
                    }
                </style>
                <slot></slot>
            `;
        }
    }

    /**
     * Calcite Grid Component
     * 
     * A CSS Grid container component following Calcite patterns.
     * 
     * Usage:
     *   <calcite-grid columns="3" gap="m">
     *     <div>Item 1</div>
     *     <div>Item 2</div>
     *     <div>Item 3</div>
     *   </calcite-grid>
     * 
     * Attributes:
     *   - columns: number | CSS value (default: "1")
     *   - rows: number | CSS value (default: "auto")
     *   - gap: "xs" | "s" | "m" | "l" | "xl" | CSS value (default: "m")
     *   - auto-fit: boolean (default: false) - uses auto-fit instead of fixed columns
     *   - min-column-width: CSS value (default: "200px") - used with auto-fit
     */
    class CalciteGrid extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        static get observedAttributes() {
            return ['columns', 'rows', 'gap', 'auto-fit', 'min-column-width'];
        }

        connectedCallback() {
            this.render();
        }

        attributeChangedCallback() {
            this.render();
        }

        getColumns() {
            const cols = this.getAttribute('columns') || '1';
            const autoFit = this.hasAttribute('auto-fit') || this.getAttribute('auto-fit') === 'true';
            const minWidth = this.getAttribute('min-column-width') || '200px';
            
            if (autoFit) {
                return `repeat(auto-fit, minmax(${minWidth}, 1fr))`;
            }
            
            // If it's a number, use repeat()
            if (/^\d+$/.test(cols)) {
                return `repeat(${cols}, 1fr)`;
            }
            
            // Otherwise use as-is (allows custom grid-template-columns values)
            return cols;
        }

        getRows() {
            const rows = this.getAttribute('rows') || 'auto';
            // If it's a number, use repeat()
            if (/^\d+$/.test(rows)) {
                return `repeat(${rows}, auto)`;
            }
            return rows;
        }

        getGap() {
            const gap = this.getAttribute('gap') || 'm';
            // Map Calcite spacing tokens
            const spacingMap = {
                'xs': 'var(--calcite-spacing-xxs, 0.25rem)',
                's': 'var(--calcite-spacing-xs, 0.5rem)',
                'm': 'var(--calcite-spacing-sm, 0.75rem)',
                'l': 'var(--calcite-spacing-md, 1rem)',
                'xl': 'var(--calcite-spacing-lg, 1.5rem)'
            };
            return spacingMap[gap] || gap;
        }

        render() {
            const columns = this.getColumns();
            const rows = this.getRows();
            const gap = this.getGap();

            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: grid;
                        grid-template-columns: ${columns};
                        grid-template-rows: ${rows};
                        gap: ${gap};
                    }
                    
                    ::slotted(*) {
                        /* Allow slotted content to participate in grid layout */
                    }
                </style>
                <slot></slot>
            `;
        }
    }

    /**
     * Calcite Stack Component
     * 
     * A vertical stack component for consistent spacing.
     * 
     * Usage:
     *   <calcite-stack gap="m">
     *     <div>Item 1</div>
     *     <div>Item 2</div>
     *   </calcite-stack>
     * 
     * Attributes:
     *   - gap: "xs" | "s" | "m" | "l" | "xl" | CSS value (default: "m")
     */
    class CalciteStack extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        static get observedAttributes() {
            return ['gap'];
        }

        connectedCallback() {
            this.render();
        }

        attributeChangedCallback() {
            this.render();
        }

        getGap() {
            const gap = this.getAttribute('gap') || 'm';
            // Map Calcite spacing tokens
            const spacingMap = {
                'xs': 'var(--calcite-spacing-xxs, 0.25rem)',
                's': 'var(--calcite-spacing-xs, 0.5rem)',
                'm': 'var(--calcite-spacing-sm, 0.75rem)',
                'l': 'var(--calcite-spacing-md, 1rem)',
                'xl': 'var(--calcite-spacing-lg, 1.5rem)'
            };
            return spacingMap[gap] || gap;
        }

        render() {
            const gap = this.getGap();

            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: flex;
                        flex-direction: column;
                        gap: ${gap};
                    }
                    
                    ::slotted(*) {
                        /* Allow slotted content to participate in stack layout */
                    }
                </style>
                <slot></slot>
            `;
        }
    }

    // Register custom elements
    if (typeof customElements !== 'undefined') {
        // Wait for Calcite components to be defined before registering our custom components
        customElements.whenDefined('calcite-button').then(() => {
            if (!customElements.get('calcite-flex')) {
                customElements.define('calcite-flex', CalciteFlex);
            }
            if (!customElements.get('calcite-grid')) {
                customElements.define('calcite-grid', CalciteGrid);
            }
            if (!customElements.get('calcite-stack')) {
                customElements.define('calcite-stack', CalciteStack);
            }
        }).catch(() => {
            // If Calcite isn't available, register anyway (for testing/standalone use)
            if (!customElements.get('calcite-flex')) {
                customElements.define('calcite-flex', CalciteFlex);
            }
            if (!customElements.get('calcite-grid')) {
                customElements.define('calcite-grid', CalciteGrid);
            }
            if (!customElements.get('calcite-stack')) {
                customElements.define('calcite-stack', CalciteStack);
            }
        });
    }

    // Export for module systems (if needed)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CalciteFlex,
            CalciteGrid,
            CalciteStack
        };
    }

    // Make available globally
    window.CustomCalcite = {
        CalciteFlex,
        CalciteGrid,
        CalciteStack
    };

})();

