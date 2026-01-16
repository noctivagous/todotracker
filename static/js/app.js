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
    
    // Ensure templates are registered before starting router
    if (typeof ensureTemplatesRegistered === 'function') {
        ensureTemplatesRegistered();
    }
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Load project name
    loadProjectName();
    
    // Set up router
    router.on('/', renderTodosView);
    router.on('/notes', renderNotesView);
    router.on('/todo/:id', (params) => renderTodoDetailView(params));
    
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
 * Initialize theme toggle
 */
function initializeThemeToggle() {
    const btn = document.getElementById('ttThemeToggle');
    const label = document.getElementById('ttThemeLabel');
    
    if (!btn || !label) return;
    
    function syncLabel() {
        const body = document.body;
        const isDark = body.classList.contains('calcite-mode-dark');
        label.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }
    
    syncLabel();
    
    btn.addEventListener('click', function() {
        const body = document.body;
        const isDark = body.classList.contains('calcite-mode-dark');
        
        if (isDark) {
            body.classList.remove('calcite-mode-dark');
            body.classList.add('calcite-mode-light');
            try { localStorage.setItem('tt-theme', 'light'); } catch (e) {}
        } else {
            body.classList.remove('calcite-mode-light');
            body.classList.add('calcite-mode-dark');
            try { localStorage.setItem('tt-theme', 'dark'); } catch (e) {}
        }
        
        syncLabel();
    });
}

/**
 * Load project name from API
 */
async function loadProjectName() {
    try {
        // Try to get project name from health endpoint or config
        const response = await fetch('/api/health');
        if (response.ok) {
            const health = await response.json();
            // Project name might be in the response or we can derive it
            // For now, we'll leave it empty or set from a config endpoint if available
        }
    } catch (e) {
        // Ignore errors
    }
}

