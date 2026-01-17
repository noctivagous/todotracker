/**
 * Simple client-side router for TodoTracker SPA
 * Uses hash-based routing (#/path) for compatibility
 */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.currentParams = {};
        this.listeners = [];
    }

    /**
     * Register a route handler
     * @param {string} path - Route path (e.g., '/', '/notes', '/todo/:id')
     * @param {Function} handler - Function to call when route matches
     */
    on(path, handler) {
        this.routes[path] = handler;
    }

    /**
     * Navigate to a route
     * @param {string} path - Route path
     */
    navigate(path) {
        if (path.startsWith('#')) {
            path = path.substring(1);
        }
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        window.location.hash = path;
    }

    /**
     * Get current route from hash
     */
    getCurrentRoute() {
        const hash = window.location.hash || '#/';
        const full = hash.substring(1) || '/';
        // Ignore query string for route matching (views parse query params separately from location.hash).
        const pathOnly = full.split('?')[0] || '/';
        return pathOnly;
    }

    /**
     * Match a route pattern against a path
     * @param {string} pattern - Route pattern (e.g., '/todo/:id')
     * @param {string} path - Actual path (e.g., '/todo/123')
     * @returns {Object|null} - Matched params or null
     */
    matchRoute(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            const patternPart = patternParts[i];
            const pathPart = pathParts[i];

            if (patternPart.startsWith(':')) {
                // Parameter
                const paramName = patternPart.substring(1);
                params[paramName] = pathPart;
            } else if (patternPart !== pathPart) {
                // Literal mismatch
                return null;
            }
        }

        return params;
    }

    /**
     * Find matching route and execute handler
     */
    handleRoute() {
        const currentPath = this.getCurrentRoute();
        
        // Try exact match first
        if (this.routes[currentPath]) {
            this.currentRoute = currentPath;
            this.currentParams = {};
            this.routes[currentPath](this.currentParams);
            return;
        }

        // Try pattern matching
        for (const [pattern, handler] of Object.entries(this.routes)) {
            const params = this.matchRoute(pattern, currentPath);
            if (params !== null) {
                this.currentRoute = pattern;
                this.currentParams = params;
                handler(params);
                return;
            }
        }

        // No match - default to home
        if (this.routes['/']) {
            this.currentRoute = '/';
            this.currentParams = {};
            this.routes['/']({});
        }
    }

    /**
     * Start the router
     */
    start() {
        // Handle initial route
        this.handleRoute();

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });

        // Update navigation active states
        this.updateNavigation();
    }

    /**
     * Update navigation menu active states
     */
    updateNavigation() {
        const currentPath = this.getCurrentRoute();
        const navItems = document.querySelectorAll('calcite-menu-item');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href) {
                const route = href.substring(1); // Remove #
                if (route === currentPath || (route === '/' && currentPath === '/')) {
                    item.setAttribute('active', '');
                } else {
                    item.removeAttribute('active');
                }
            }
        });
    }
}

// Export router instance
window.router = new Router();


