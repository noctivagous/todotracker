/**
 * View components for TodoTracker SPA
 * Each view function renders a specific page/route
 */

// Configure marked for markdown rendering
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
    });
}

// JsRender templates are stored as separate files under /static/templates/.
// We fetch and register them at app startup (see static/js/app.js).
const TT_TEMPLATE_MANIFEST = {
    "todo-item": "/static/templates/todo-item.html",
    "todos-list": "/static/templates/todos-list.html",
    "todo-detail": "/static/templates/todo-detail.html",
    "todo-detail-panel": "/static/templates/todo-detail-panel.html",
    "notes-list": "/static/templates/notes-list.html",
};

function _ttGetAssetVersionQuery() {
    try {
        const v = (window && window.TT_ASSET_VERSION) ? String(window.TT_ASSET_VERSION) : "";
        return v ? (`?v=${encodeURIComponent(v)}`) : "";
    } catch (e) {
        return "";
    }
}

/**
 * Load external templates and register them with JsRender.
 * Called once during app startup (awaited in app.js).
 */
async function ttLoadExternalTemplates() {
    if (typeof $ === 'undefined' || !$.templates) return false;
    window.ttTemplatesLoaded = window.ttTemplatesLoaded || false;
    if (window.ttTemplatesLoaded) return true;

    const vq = _ttGetAssetVersionQuery();
    const entries = Object.entries(TT_TEMPLATE_MANIFEST);

    try {
        const results = await Promise.all(entries.map(async ([name, url]) => {
            const res = await fetch(url + vq, { cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to fetch template ${name}: ${res.status}`);
            const text = await res.text();
            $.templates(name, text);
            return name;
        }));
        window.ttTemplatesLoaded = true;
        return results.length === entries.length;
    } catch (e) {
        console.error("Failed to load external JsRender templates:", e);
        return false;
    }
}

/**
 * Ensure templates and helpers are registered with JsRender
 * Call this before rendering any template
 */
function ensureTemplatesRegistered() {
    if (typeof $ === 'undefined' || !$.templates) {
        console.error('jQuery or JsRender not loaded');
        return false;
    }
    
    // IMPORTANT: Register helpers BEFORE templates so helper calls in templates compile correctly
    // Register helper functions for JsRender templates
    // Only register if functions are defined (they might not be during initial script load)
    if ($.views && $.views.helpers) {
        const helpers = {};
        if (typeof renderTodoItem === 'function') {
            helpers.renderTodoItem = renderTodoItem;
        }
        if (typeof formatDate === 'function') {
            helpers.formatDate = formatDate;
        }
        if (typeof replaceUnderscores === 'function') {
            helpers.replaceUnderscores = replaceUnderscores;
        }
        if (Object.keys(helpers).length > 0) {
            $.views.helpers(helpers);
        }
    }
    
    // Verify templates were registered correctly
    // Named templates are accessed as properties: $.templates.templateName
    try {
        const testTemplate = $.templates.todosList || $.templates["todos-list"];
        if (!testTemplate) {
            console.error('Template "todos-list" not found after registration. Available:', Object.keys($.templates));
            return false;
        }
        if (typeof testTemplate.render !== 'function') {
            console.error('Template "todos-list" does not have a render function. Type:', typeof testTemplate);
            return false;
        }
        // Template verification passed
    } catch (e) {
        console.error('Error verifying template registration:', e);
        return false;
    }
    
    return true;
}


// NOTE: In the split-file setup, helpers like `renderTodoItem` are declared in later scripts.
// We intentionally do NOT auto-register templates here.
// `app.js` calls `ensureTemplatesRegistered()` once all view scripts are loaded.
