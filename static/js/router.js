/**
 * Simple client-side router for TodoTracker SPA
 * Uses history API (pushState/replaceState) for clean URLs (/todos, /notes, /settings).
 * Still supports legacy hash URLs (/#/notes, /#/todo/123) by migrating them to clean paths.
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
    navigate(path, options) {
        const opts = options || {};
        const normalized = this.normalizePath(path);
        try {
            if (opts.replace) {
                window.history.replaceState({}, '', normalized);
            } else {
                window.history.pushState({}, '', normalized);
            }
            this.handleRoute();
            this.updateNavigation();
        } catch (e) {
            // Hard fallback: if pushState is unavailable, try hash navigation.
            try {
                window.location.hash = '#' + normalized;
            } catch (e2) {}
        }
    }

    /**
     * Canonicalize legacy routes and ensure leading slash.
     * Also normalizes old "/todo/:id" to "/todos/:id" and "/" to "/todos".
     */
    normalizePath(path) {
        let raw = String(path || "");
        if (raw.startsWith("#")) raw = raw.substring(1);
        if (!raw.startsWith("/")) raw = "/" + raw;

        const parts = raw.split("?");
        let p = parts[0] || "/";
        const qs = parts.length > 1 ? "?" + parts.slice(1).join("?") : "";

        // Canonical routes
        if (p === "/" || p === "") p = "/todos";
        if (p.startsWith("/todo/")) p = "/todos/" + p.substring("/todo/".length);

        return p + qs;
    }

    /**
     * Get current route path (without query string) for route matching.
     * Prefers pathname routing. If a legacy hash route is present, we will migrate it on start.
     */
    getCurrentRoute() {
        try {
            const p = window.location.pathname || "/";
            return this.normalizePath(p).split("?")[0] || "/todos";
        } catch (e) {
            return "/todos";
        }
    }

    /**
     * Get current full path including query string (used for migrations).
     */
    getCurrentFullPath() {
        try {
            const p = (window.location.pathname || "/") + (window.location.search || "");
            return this.normalizePath(p);
        } catch (e) {
            return "/todos";
        }
    }

    /**
     * If the URL is using the old hash scheme, migrate to a clean pathname.
     * Example: "/#/notes?q=x" -> "/notes?q=x", "/settings#/notes" -> "/notes"
     */
    migrateLegacyHashRoute() {
        try {
            const hash = window.location.hash || "";
            if (!hash || hash === "#" || !hash.startsWith("#/")) return false;
            const full = hash.substring(1) || "/"; // "/notes?q=x"
            const target = this.normalizePath(full);
            window.history.replaceState({}, "", target);
            return true;
        } catch (e) {
            return false;
        }
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
        // Migrate any legacy hash route to a clean pathname before first render.
        this.migrateLegacyHashRoute();

        // Canonicalize "/" -> "/todos" and "/todo/:id" -> "/todos/:id" without adding history entries.
        try {
            const raw = (window.location.pathname || "/") + (window.location.search || "");
            const norm = this.normalizePath(raw);
            if (norm !== raw) {
                window.history.replaceState({}, "", norm);
            }
        } catch (e) {}

        // Handle initial route
        this.handleRoute();

        // Listen for history navigation (back/forward) when we use path-based routing.
        window.addEventListener('popstate', () => {
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
                let route = href;
                if (route.startsWith("#")) route = route.substring(1);
                route = this.normalizePath(route).split("?")[0];
                if (route === currentPath) {
                    item.setAttribute('active', '');
                } else {
                    item.removeAttribute('active');
                }
            }
        });

        // Let other UI bits (tabs, etc.) synchronize without having to hook router internals.
        try {
            window.dispatchEvent(new CustomEvent("tt-route-changed", { detail: { path: currentPath } }));
        } catch (e) {}
    }
}

// Export router instance
window.router = new Router();


