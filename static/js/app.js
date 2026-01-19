/**
 * Main application entry point for TodoTracker SPA
 */

// Wait for DOM and Calcite components to be ready
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for Calcite components to be defined
    await customElements.whenDefined('calcite-shell');
    await customElements.whenDefined('calcite-loader');
    
    // Wait for jQuery and JsRender to be loaded
    let attempts = 0;
    while ((typeof $ === 'undefined' || typeof $.templates === 'undefined') && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof $ === 'undefined' || typeof $.templates === 'undefined') {
        console.error('jQuery or JsRender failed to load');
        const view = document.getElementById('app-view');
        if (view) {
            view.innerHTML = '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Required JavaScript libraries failed to load. Please refresh the page.</p></div>';
        }
        hideLoading();
        return;
    }
    
    // Load external JsRender templates (stored as separate HTML files under /static/templates/)
    // then register helpers/templates before starting router.
    if (typeof ttLoadExternalTemplates === 'function') {
        await ttLoadExternalTemplates();
    }
    if (typeof ensureTemplatesRegistered === 'function') {
        ensureTemplatesRegistered();
    }
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Load project name
    loadProjectName();
    
    // Set up router (clean, pathname-based routes)
    router.on('/todos', renderTodosView);
    router.on('/todos/:id', (params) => renderTodoDetailView(params));
    router.on('/notes', renderNotesView);
    router.on('/notes/:id', (params) => renderNoteDetailView(params));
    router.on('/settings', renderSettingsView);

    // Back-compat + canonicalization
    router.on('/', () => router.navigate('/todos', { replace: true }));
    router.on('/todo/:id', (params) => router.navigate(`/todos/${params.id}`, { replace: true }));
    
    // Start router
    router.start();
    
    // Update navigation on route changes
    router.handleRoute = (function(original) {
        return function() {
            original.call(this);
            router.updateNavigation();
        };
    })(router.handleRoute);
    
    // Ensure loader is hidden if router doesn't trigger a view immediately
    // This is a safety net in case of initialization issues
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        const view = document.getElementById('app-view');
        if (loader && !loader.hasAttribute('hidden') && (!view || view.innerHTML.trim() === '')) {
            console.warn('Loader still visible after initialization, hiding it');
            hideLoading();
        }
    }, 2000);
});

/**
 * Apply theme to body (default: light)
 */
function applyTheme(theme) {
    const body = document.body;
    if (!body) return;
    
    const t = (theme || localStorage.getItem('tt-theme') || 'light').toLowerCase();
    // Remove all mode classes first, then add the desired one
    body.classList.remove('calcite-mode-auto', 'calcite-mode-light', 'calcite-mode-dark');
    if (t === 'dark') {
        body.classList.add('calcite-mode-dark');
    } else {
        body.classList.add('calcite-mode-light');
    }
}

/**
 * Get current theme (default: light)
 */
function getCurrentTheme() {
    try {
        return localStorage.getItem('tt-theme') || 'light';
    } catch (e) {
        return 'light';
    }
}

/**
 * Set theme (default: light)
 */
function setTheme(theme) {
    const t = (theme || 'light').toLowerCase();
    try {
        localStorage.setItem('tt-theme', t);
    } catch (e) {}
    applyTheme(t);
}

/**
 * Initialize theme toggle - now handled by Settings switch
 * This function is kept for compatibility but no longer creates a header button
 */
function initializeThemeToggle() {
    // Theme is now controlled via Settings switch
    // Initialize theme on page load (default: light)
    applyTheme(getCurrentTheme());
}

/**
 * Load project name from API and display in chip
 */
async function loadProjectName() {
    const chip = document.getElementById('ttProjectNameChip');
    if (!chip) return;
    
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            const health = await response.json();
            const projectName = health.project_name || 'Unknown Project';
            chip.textContent = projectName;
        } else {
            chip.textContent = 'Unknown Project';
        }
    } catch (e) {
        chip.textContent = 'Unknown Project';
    }
}

