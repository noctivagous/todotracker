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

// JsRender Templates
const templates = {
    'todo-item': `
        <calcite-card class="tt-todo-item todo-item {{:status}}" style="margin-left: {{:indent}}px; margin-bottom: 12px;">
            <div slot="title" class="flex items-start justify-between gap-2">
                <div class="flex-1">
                    <div class="flex items-center flex-wrap gap-1.5 mb-2">
                        <span class="tt-todo-title-display text-lg font-semibold">{{:title}}</span>
                        <span class="text-xs text-color-3">#{{:id}}</span>
                        <calcite-chip appearance="solid" scale="s" class="status-{{:status}}">
                            {{:~replaceUnderscores(status)}}
                        </calcite-chip>
                        <calcite-chip appearance="outline" scale="s" class="category-{{:category}}">
                            {{:category}}
                        </calcite-chip>
                        {{if queue && queue > 0}}
                            <calcite-chip appearance="solid" color="blue" scale="s">⏯️ Queue {{:queue}}</calcite-chip>
                        {{/if}}
                        {{if priority_class}}
                            <calcite-chip appearance="solid" color="orange" scale="s">🔺 Priority {{:priority_class}}</calcite-chip>
                        {{/if}}
                        {{if task_size}}
                            <calcite-chip appearance="outline" scale="s">📏 Size {{:task_size}}/5</calcite-chip>
                        {{/if}}
                        {{if topic}}
                            <calcite-chip appearance="outline" scale="s">📁 {{:topic}}</calcite-chip>
                        {{/if}}
                        {{for tags}}
                            <calcite-chip appearance="outline" scale="s">🏷️ {{:name || #data}}</calcite-chip>
                        {{/for}}
                    </div>
                </div>
                <div class="flex gap-1.5">
                    <calcite-button onclick="router.navigate('/todo/{{:id}}')" appearance="outline" scale="s">
                        View
                    </calcite-button>
                    <calcite-button onclick="deleteTodo({{:id}})" appearance="solid" kind="danger" scale="s">
                        Delete
                    </calcite-button>
                </div>
            </div>
            <div class="space-y-3">
                {{if description}}
                    <div>
                        <strong class="text-sm mb-1 block">Description:</strong>
                        <div class="markdown-render text-sm text-color-2">{{:description}}</div>
                    </div>
                {{/if}}
                {{if work_completed || work_remaining || implementation_issues}}
                    <div class="border-t border-color-3 pt-3">
                        <strong class="text-sm mb-2 block">Progress:</strong>
                        {{if work_completed}}
                            <div class="mb-3">
                                <strong class="text-sm">✅ Work Completed:</strong>
                                <div class="markdown-render text-sm text-color-2 mt-1">{{:work_completed}}</div>
                            </div>
                        {{/if}}
                        {{if work_remaining}}
                            <div class="mb-3">
                                <strong class="text-sm">📋 Work Remaining:</strong>
                                <div class="markdown-render text-sm text-color-2 mt-1">{{:work_remaining}}</div>
                            </div>
                        {{/if}}
                        {{if implementation_issues}}
                            <div class="mb-3">
                                <strong class="text-sm">⚠️ Implementation Issues:</strong>
                                <div class="markdown-render text-sm text-color-2 mt-1">{{:implementation_issues}}</div>
                            </div>
                        {{/if}}
                    </div>
                {{/if}}
                <div class="text-xs text-color-3 border-t border-color-3 pt-2">
                    Created: {{:~formatDate(created_at)}}
                    {{if updated_at && updated_at !== created_at}} | Updated: {{:~formatDate(updated_at)}} {{/if}}
                </div>
            </div>
        </calcite-card>
        {{for children}}
            {{:~renderTodoItem(#data, indent + 24)}}
        {{/for}}
    `,

    'todos-list': `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold">
                {{if searchQuery}}Search Results: "{{:searchQuery}}"{{else}}Todo List{{/if}}
            </h1>
            <div class="flex items-center gap-3">
                <calcite-input type="text"
                               id="searchInput"
                               placeholder="Search todos..."
                               value="{{:searchQuery}}"
                               scale="m"
                               clearable>
                </calcite-input>
                <calcite-button onclick="document.getElementById('createModal').open = true" appearance="solid">
                    + New Todo
                </calcite-button>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
            {{if searchQuery}}
                <calcite-button onclick="router.navigate('/')" appearance="outline" scale="s">
                    ← Back to All Todos
                </calcite-button>
            {{else}}
                <calcite-button onclick="router.navigate('/?status={{:status}}&sort_by={{:sortBy}}&sort_dir={{:sortDir}}')"
                                {{if !queued}}appearance="solid"{{else}}appearance="outline"{{/if}} scale="s">
                    All (current status filter)
                </calcite-button>
                <calcite-button onclick="router.navigate('/?status={{:status}}&queued=true&sort_by={{:sortBy}}&sort_dir={{:sortDir}}')"
                                {{if queued}}appearance="solid"{{else}}appearance="outline"{{/if}} scale="s">
                    In queue ({{:stats.queued}})
                </calcite-button>
            {{/if}}
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <calcite-card onclick="router.navigate('/?status=all&sort_by={{:sortBy}}&sort_dir={{:sortDir}}')" class="cursor-pointer">
                <div class="tt-stat-label text-sm text-muted-foreground">Total</div>
                <div class="tt-stat-value text-2xl font-bold">{{:stats.total}}</div>
            </calcite-card>
            <calcite-card onclick="router.navigate('/?status=pending&sort_by={{:sortBy}}&sort_dir={{:sortDir}}')" class="cursor-pointer">
                <div class="tt-stat-label text-sm text-muted-foreground">Pending</div>
                <div class="tt-stat-value text-2xl font-bold">{{:stats.pending}}</div>
            </calcite-card>
            <calcite-card onclick="router.navigate('/?status=in_progress&sort_by={{:sortBy}}&sort_dir={{:sortDir}}')" class="cursor-pointer">
                <div class="tt-stat-label text-sm text-muted-foreground">In Progress</div>
                <div class="tt-stat-value text-2xl font-bold">{{:stats.in_progress}}</div>
            </calcite-card>
            <calcite-card onclick="router.navigate('/?status=completed&sort_by={{:sortBy}}&sort_dir={{:sortDir}}')" class="cursor-pointer">
                <div class="tt-stat-label text-sm text-muted-foreground">Completed</div>
                <div class="tt-stat-value text-2xl font-bold">{{:stats.completed}}</div>
            </calcite-card>
        </div>

        <!-- Todo Tree -->
        <calcite-card class="tt-todo-list-card">
            <div class="tt-todo-list-content" id="todoList">
                {{if todos && todos.length > 0}}
                    {{for todos}}
                        {{:~renderTodoItem(#data, 0)}}
                    {{/for}}
                {{else}}
                    <div class="text-center py-12 text-muted-foreground">
                        <p class="text-lg">No todos found.</p>
                        <p class="text-sm mt-2">Create your first todo to get started!</p>
                    </div>
                {{/if}}
            </div>
        </calcite-card>
    `,

    'todo-detail': `
        <div class="mb-6">
            <calcite-button onclick="router.navigate('/')" appearance="outline">
                ← Back to todos
            </calcite-button>
        </div>

        <calcite-card>
            <div slot="title" class="flex justify-between items-start">
                <div class="flex-1">
                    <h2 class="text-3xl font-bold mb-2">{{:title}}</h2>
                    <div class="flex flex-wrap gap-2 mb-4">
                        <calcite-chip appearance="solid" scale="s" class="status-{{:status}}">
                            {{:~replaceUnderscores(status)}}
                        </calcite-chip>
                        <calcite-chip appearance="outline" scale="s" class="category-{{:category}}">
                            {{:category}}
                        </calcite-chip>
                        {{if topic}}
                            <calcite-chip appearance="outline" scale="s">📁 {{:topic}}</calcite-chip>
                        {{/if}}
                        {{for tags}}
                            <calcite-chip appearance="outline" scale="s">🏷️ {{:name || #data}}</calcite-chip>
                        {{/for}}
                    </div>
                </div>
            </div>
        </calcite-card>

        {{if description}}
            <div class="mb-4">
                <h3 class="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                <div class="markdown-render">{{:description}}</div>
            </div>
        {{/if}}

        {{if notes && notes.length > 0}}
            <calcite-card class="mt-6">
                <div slot="title">
                    <h3 class="text-xl font-bold">Notes ({{:notes.length}})</h3>
                </div>
                <div class="space-y-3">
                    {{for notes}}
                        <div class="tt-surface p-4">
                            <div class="markdown-render">{{:content}}</div>
                            <div class="text-xs text-muted-foreground mt-2">
                                {{:~formatDate(created_at)}}
                            </div>
                        </div>
                    {{/for}}
                </div>
            </calcite-card>
        {{/if}}
    `,

    'notes-list': `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold">Notes</h2>
            <calcite-button onclick="document.getElementById('createNoteModal').open = true" appearance="solid">
                + New Note
            </calcite-button>
        </div>

        <div class="space-y-4">
            {{if notes && notes.length > 0}}
                {{for notes}}
                    <calcite-card>
                        <div class="flex justify-between items-start">
                            <div class="flex-1 markdown-render">{{:content}}</div>
                            <calcite-button onclick="deleteNote({{:id}})" appearance="solid" kind="danger" scale="s">
                                Delete
                            </calcite-button>
                        </div>
                        <div slot="footer" class="text-sm text-muted-foreground">
                            {{:~formatDate(created_at)}}
                            {{if todo_id}} | <a href="/todos/{{:todo_id}}" class="underline" onclick="event.preventDefault(); router.navigate('/todos/{{:todo_id}}')">Linked to todo #{{:todo_id}}</a> {{/if}}
                        </div>
                    </calcite-card>
                {{/for}}
            {{else}}
                <calcite-card>
                    <div class="text-center text-muted-foreground">
                        <p class="text-lg">No notes yet.</p>
                        <p class="text-sm mt-2">Create your first note to get started!</p>
                    </div>
                </calcite-card>
            {{/if}}
        </div>
    `
};

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
    
    // Always re-register templates to ensure they're available
    // Register all templates
    try {
        for (const [name, template] of Object.entries(templates)) {
            $.templates(name, template);
        }
    } catch (e) {
        console.error('Error registering templates:', e);
        return false;
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

// Register templates immediately if jQuery is ready
if (typeof $ !== 'undefined' && $.templates) {
    ensureTemplatesRegistered();
} else {
    // If jQuery isn't ready yet, wait for it
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof $ !== 'undefined' && $.templates) {
                ensureTemplatesRegistered();
            }
        });
    }

    // Markdown editing uses Toast UI via <tt-md-editor>.
}

/**
 * Render markdown content
 */
function renderMarkdown(element) {
    if (!element || typeof marked === 'undefined') return;
    const markdownText = element.textContent || element.innerText;
    if (!markdownText || markdownText.trim() === '') return;
    try {
        const html = marked.parse(markdownText);
        element.innerHTML = html;
        element.classList.add('markdown-content');
    } catch (e) {
        console.error('Markdown rendering error:', e);
    }
}


/**
 * Show loading state
 */
function showLoading() {
    const loader = document.getElementById('app-loader');
    const view = document.getElementById('app-view');
    if (loader) {
        loader.removeAttribute('hidden');
        loader.style.display = 'block';
    }
    if (view) view.style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loader = document.getElementById('app-loader');
    const view = document.getElementById('app-view');
    if (loader) {
        loader.setAttribute('hidden', '');
        loader.style.display = 'none';
    }
    if (view) view.style.display = 'block';
}

/**
 * Show error message
 */
function showError(message) {
    const view = document.getElementById('app-view');
    if (!view) return;
    
    view.innerHTML = `
        <calcite-notice icon="exclamation-mark-triangle" kind="danger" open>
            <div slot="message">${escapeHtml(message)}</div>
        </calcite-notice>
    `;
    hideLoading();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    // NOTE: This function is used in BOTH text-node and attribute contexts in templates.
    // It must escape quotes to avoid breaking HTML attributes (e.g., titles containing `"`).
    const s = String(text ?? '');
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _setAutosaveChip(text) {
    const chip = document.getElementById('ttAutosaveChip');
    if (!chip) return;
    chip.textContent = text;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Replace underscores with spaces in a string
 */
function replaceUnderscores(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ');
}

function isNarrowScreen() {
    try {
        return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    } catch (e) {
        return false;
    }
}

function isNotesMode() {
    try {
        const r = (window.router && typeof window.router.getCurrentRoute === 'function')
            ? window.router.getCurrentRoute()
            : ((window.location.hash || '#/').substring(1) || '/');
        return String(r || '').startsWith('/notes');
    } catch (e) {
        return (window.location.hash || '').startsWith('#/notes');
    }
}

function renderNotesNavFiltersHTML(allNotes, opts) {
    const o = opts || getNotesRouteOptions();
    const all = Array.isArray(allNotes) ? allNotes : [];

    const categories = Array.from(new Set(
        (all || []).map((n) => String(n.category || '').trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    const categoryItems = [
        `<calcite-combobox-item value="__all__" text-label="All categories" ${!o.category ? 'selected' : ''}></calcite-combobox-item>`,
        ...categories.map((c) => {
            const v = escapeHtml(c);
            const sel = (o.category === c) ? 'selected' : '';
            return `<calcite-combobox-item value="${v}" text-label="${v}" ${sel}></calcite-combobox-item>`;
        })
    ].join('');

    return `
        <calcite-segmented-control id="ttNotesTypeSeg" scale="s" value="${escapeHtml(o.noteType || 'all')}">
            <calcite-segmented-control-item value="all" ${(!o.noteType || o.noteType === 'all') ? 'checked' : ''}>All</calcite-segmented-control-item>
            <calcite-segmented-control-item value="project" ${(o.noteType === 'project') ? 'checked' : ''}>Project</calcite-segmented-control-item>
            <calcite-segmented-control-item value="attached" ${(o.noteType === 'attached') ? 'checked' : ''}>Attached</calcite-segmented-control-item>
        </calcite-segmented-control>
        <calcite-combobox id="ttNotesCategoryBox" selection-mode="single" allow-custom-values placeholder="All categories" scale="s">
            ${categoryItems}
        </calcite-combobox>
    `;
}

function syncNotesNavFilters(allNotes, opts) {
    const host = document.getElementById('ttNotesNavFilters');
    if (!host) return;

    if (!isNotesMode()) {
        host.hidden = true;
        host.innerHTML = '';
        return;
    }

    host.hidden = false;
    host.innerHTML = renderNotesNavFiltersHTML(allNotes, opts);
}

function setHeaderMode(mode) {
    const m = (mode === 'notes' || mode === 'settings') ? mode : 'todos';
    const headerStatusSeg = document.getElementById('ttHeaderStatusSeg');
    const headerStatusSelect = document.getElementById('ttHeaderStatusSelect');
    const navSearch = document.getElementById('ttNavSearchInput');
    const navFilter = document.getElementById('ttNavFilterInput');
    const headerNewBtn = document.getElementById('ttHeaderNewTodoBtn');
    const notesNavFilters = document.getElementById('ttNotesNavFilters');

    // Status controls are todo-specific for now.
    const disableStatus = m !== 'todos';
    if (headerStatusSeg) {
        if (disableStatus) headerStatusSeg.setAttribute('disabled', '');
        else headerStatusSeg.removeAttribute('disabled');
    }
    if (headerStatusSelect) {
        if (disableStatus) headerStatusSelect.setAttribute('disabled', '');
        else headerStatusSelect.removeAttribute('disabled');
    }

    if (navSearch) {
        navSearch.placeholder = m === 'notes' ? 'Search notes (Enter)...' : (m === 'settings' ? 'Search (disabled in Settings)...' : 'Search todos (Enter)...');
    }
    if (navFilter) {
        navFilter.placeholder = m === 'notes' ? 'Filter notes (live)...' : (m === 'settings' ? 'Filter (disabled in Settings)...' : 'Filter (live)...');
    }
    if (headerNewBtn) {
        headerNewBtn.innerHTML = 'New';
        headerNewBtn.setAttribute('icon-start', 'plus');
        headerNewBtn.title = m === 'notes' ? 'Create note' : 'Create todo';
    }

    // Notes-only filters live in navigation-secondary.
    if (notesNavFilters && m !== 'notes') {
        notesNavFilters.hidden = true;
        notesNavFilters.innerHTML = '';
    }
}

/**
 * Calcite shell panel targets (master-detail layout)
 */
function getShellTargets() {
    return {
        startPanel: document.getElementById('tt-panel-start'),
        endPanel: document.getElementById('tt-panel-end'),
        startShell: document.getElementById('tt-panel-start-shell'),
        endShell: document.getElementById('tt-panel-end-shell'),
        mainView: document.getElementById('app-view'),
    };
}

/* -------------------------------------------------------------------------- */
/* Settings (tt-settings-v1)                                                  */
/* -------------------------------------------------------------------------- */

const TT_SETTINGS_STORAGE_KEY = 'tt-settings-v1';

const TT_SETTINGS_DEFAULTS = {
    features: {
        // Feature flags intended to coordinate behavior between UI + MCP tools.
        // These are also persisted to project config so MCP tools can respect them.
        subtasks_enabled: true,
    },
    layout: {
        // 'full' (viewport width) | 'max' (1100px centered)
        width_mode: 'full',
    },
    todos: {
        list: {
            status: true,
            category: true,
            queue: true,
            priority_class: true,
            task_size: true,
            topic: true,
            tags: true,
            description: true,
            timestamps: true,
        },
        detail: {
            status: true,
            category: true,
            queue: true,
            priority_class: true,
            task_size: true,
            topic: true,
            tags: true,
            description: true,
            progress: true,
            timestamps: true,
            notes: true,
            dependencies: true,
            relates_to: true,
            attachments: true,
            completion_percentage: true,
            ai_instructions: true,
        },
    },
    notes: {
        list: {
            note_type: true,
            category: true,
            attachment: true,
            created: true,
            snippet: true,
        },
        detail: {
            metadata: true,
            attachment: true,
            title: true,
            category: true,
            content: true,
        },
    },
};

function ttIsPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function ttDeepMerge(base, override) {
    if (!ttIsPlainObject(base)) return ttIsPlainObject(override) ? { ...override } : base;
    const out = { ...base };
    if (!ttIsPlainObject(override)) return out;
    for (const [k, v] of Object.entries(override)) {
        if (ttIsPlainObject(v) && ttIsPlainObject(out[k])) out[k] = ttDeepMerge(out[k], v);
        else out[k] = v;
    }
    return out;
}

function ttGetByPath(obj, path) {
    const parts = String(path || '').split('.').filter(Boolean);
    let cur = obj;
    for (const p of parts) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[p];
    }
    return cur;
}

function ttSetByPath(obj, path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return obj;
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!ttIsPlainObject(cur[p])) cur[p] = {};
        cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
    return obj;
}

function ttApplySettingsToLayout(settings) {
    const s = settings || ttGetSettings();
    const mode = (s && s.layout && s.layout.width_mode) ? String(s.layout.width_mode) : 'full';
    const root = document.documentElement;
    if (!root) return;
    if (mode === 'max') root.classList.add('tt-layout-maxwidth');
    else root.classList.remove('tt-layout-maxwidth');
}

function ttLoadSettings() {
    if (window.ttSettingsCache && typeof window.ttSettingsCache === 'object') return window.ttSettingsCache;
    let saved = null;
    try {
        const raw = localStorage.getItem(TT_SETTINGS_STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
    } catch (e) {}
    const merged = ttDeepMerge(TT_SETTINGS_DEFAULTS, saved || {});
    window.ttSettingsCache = merged;
    // Apply layout as soon as settings are loaded.
    try { ttApplySettingsToLayout(merged); } catch (e) {}
    return merged;
}

function ttGetSettings() {
    return ttLoadSettings();
}

function ttSaveSettings(next) {
    const merged = ttDeepMerge(TT_SETTINGS_DEFAULTS, next || {});
    window.ttSettingsCache = merged;
    try { localStorage.setItem(TT_SETTINGS_STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
    try { ttApplySettingsToLayout(merged); } catch (e) {}
    return merged;
}

function ttResetSettings() {
    try { localStorage.removeItem(TT_SETTINGS_STORAGE_KEY); } catch (e) {}
    window.ttSettingsCache = ttDeepMerge(TT_SETTINGS_DEFAULTS, {});
    try { ttApplySettingsToLayout(window.ttSettingsCache); } catch (e) {}
    return window.ttSettingsCache;
}

function ttRerenderCurrentView() {
    try {
        if (window.router && typeof window.router.handleRoute === 'function') {
            window.router.handleRoute();
            return;
        }
    } catch (e) {}
}

function ttSettingsSyncControls(rootEl) {
    const root = rootEl || document;
    const s = ttGetSettings();
    root.querySelectorAll('[data-tt-setting]').forEach((el) => {
        const path = el.getAttribute('data-tt-setting');
        const v = ttGetByPath(s, path);
        try {
            if (el.tagName === 'CALCITE-SWITCH') el.checked = (v !== false);
            if (el.tagName === 'CALCITE-SEGMENTED-CONTROL') el.value = String(v || 'full');
        } catch (e) {}
    });
}

function ttSettingsApplyFromEl(el) {
    const path = el && el.getAttribute ? el.getAttribute('data-tt-setting') : '';
    if (!path) return;
    const current = ttGetSettings();
    let nextValue = null;

    try {
        if (el.tagName === 'CALCITE-SWITCH') nextValue = !!el.checked;
        else if (el.tagName === 'CALCITE-SEGMENTED-CONTROL') nextValue = String(el.value || 'full');
        else return;
    } catch (e) {
        return;
    }

    const next = ttDeepMerge(current, {});
    ttSetByPath(next, path, nextValue);
    ttSaveSettings(next);

    // Persist feature flags to server-side project config so MCP tools can respect them.
    if (path === 'features.subtasks_enabled') {
        (async () => {
            try {
                const res = await fetch('/api/config/features', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subtasks_enabled: !!nextValue }),
                });
                if (!res.ok) {
                    let msg = 'Failed to save feature flags';
                    try {
                        const j = await res.json();
                        msg = j.detail || j.message || msg;
                    } catch (e) {}
                    throw new Error(msg);
                }
            } catch (e) {
                console.error('Feature flag save failed:', e);
                // Revert local setting + control on failure.
                try { if (el && el.tagName === 'CALCITE-SWITCH') el.checked = !nextValue; } catch (err) {}
                const revert = ttDeepMerge(ttGetSettings(), {});
                ttSetByPath(revert, path, !nextValue);
                ttSaveSettings(revert);
                alert('Failed to save feature flag to project config: ' + (e && e.message ? e.message : e));
            }
        })();
    }

    // If we're not currently on /settings, re-render to apply immediately.
    try {
        const r = (window.router && typeof window.router.getCurrentRoute === 'function') ? window.router.getCurrentRoute() : '';
        if (String(r || '') !== '/settings') {
            ttRerenderCurrentView();
        }
    } catch (e) {
        ttRerenderCurrentView();
    }
}

function ttBindSettingsControls(rootEl) {
    const root = rootEl || document;

    root.querySelectorAll('calcite-switch[data-tt-setting]').forEach((sw) => {
        if (sw._ttBoundSettings) return;
        sw._ttBoundSettings = true;
        sw.addEventListener('calciteSwitchChange', () => ttSettingsApplyFromEl(sw));
        sw.addEventListener('change', () => ttSettingsApplyFromEl(sw));
    });

    root.querySelectorAll('calcite-segmented-control[data-tt-setting]').forEach((seg) => {
        if (seg._ttBoundSettings) return;
        seg._ttBoundSettings = true;
        seg.addEventListener('calciteSegmentedControlChange', () => ttSettingsApplyFromEl(seg));
        seg.addEventListener('change', () => ttSettingsApplyFromEl(seg));
    });

    const resetBtn = root.querySelector('#ttSettingsResetBtn');
    if (resetBtn && !resetBtn._ttBoundSettings) {
        resetBtn._ttBoundSettings = true;
        resetBtn.addEventListener('click', () => {
            ttResetSettings();
            ttSettingsSyncControls(root);
            try {
                const r = (window.router && typeof window.router.getCurrentRoute === 'function') ? window.router.getCurrentRoute() : '';
                if (String(r || '') !== '/settings') {
                    ttRerenderCurrentView();
                }
            } catch (e) {
                ttRerenderCurrentView();
            }
        });
    }
}

function collapseDetailPanel() {
    const { endShell, endPanel } = getShellTargets();
    if (endShell) endShell.setAttribute('collapsed', '');
    if (endPanel) endPanel.innerHTML = '';
}

function openDetailPanel() {
    const { endShell } = getShellTargets();
    if (!endShell) return;
    // Use overlay so it feels like a drawer (primarily for mobile).
    endShell.setAttribute('display-mode', 'overlay');
    endShell.removeAttribute('collapsed');
}

/**
 * Get query parameters from URL
 */
function getQueryParams() {
    const params = {};
    let queryString = '';
    // Prefer clean pathname routing query params first.
    try {
        queryString = (window.location.search || '').replace(/^\?/, '');
    } catch (e) {}
    // Back-compat: legacy hash routing (?...) after "#/route".
    if (!queryString) {
        const hash = window.location.hash || '';
        queryString = hash.includes('?') ? (hash.split('?')[1] || '') : '';
    }
    
    if (queryString) {
        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
    }
    
    return params;
}

/**
 * Build query string from params
 */
function buildQueryString(params) {
    const parts = [];
    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== '') {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return parts.length > 0 ? '?' + parts.join('&') : '';
}

function clampInt(value, fallback, min, max) {
    const n = parseInt(String(value || ''), 10);
    if (!Number.isFinite(n)) return fallback;
    if (typeof min === 'number' && n < min) return min;
    if (typeof max === 'number' && n > max) return max;
    return n;
}

function getTodosRouteOptions() {
    const params = getQueryParams();
    return {
        status: params.status || 'pending',
        queued: params.queued === 'true',
        sortBy: params.sort_by || 'updated_at',
        sortDir: params.sort_dir || 'desc',
        searchQuery: params.q || '',
        filterText: params.filter || '',
        view: (params.view || 'grid'),
        page: clampInt(params.page, 1, 1, 999999),
        pageSize: clampInt(params.page_size, 24, 5, 200),
    };
}

function navigateTodosWithParamPatch(patch) {
    const current = getQueryParams();
    const next = { ...current, ...(patch || {}) };
    const qs = buildQueryString(next);
    router.navigate('/' + qs);
}

function getNotesRouteOptions() {
    const params = getQueryParams();
    return {
        searchQuery: (params.q || '').trim(),
        filterText: (params.filter || '').trim(),
        noteType: (params.note_type || 'all').trim(),
        category: (params.category || '').trim(),
        view: (params.view || 'grid'),
        page: clampInt(params.page, 1, 1, 999999),
        pageSize: clampInt(params.page_size, 24, 5, 200),
    };
}

function navigateNotesWithParamPatch(patch) {
    const current = getQueryParams();
    const next = { ...current, ...(patch || {}) };
    const qs = buildQueryString(next);
    router.navigate('/notes' + qs);
}

function filterNotesClientSide(notes, searchQuery, filterText) {
    const q1 = (searchQuery || '').trim().toLowerCase();
    const q2 = (filterText || '').trim().toLowerCase();
    const q = (q1 + ' ' + q2).trim();
    if (!q) return Array.isArray(notes) ? notes : [];
    return (Array.isArray(notes) ? notes : []).filter((n) => {
        const hay = [
            String(n.id || ''),
            String(n.todo_id || ''),
            String(n.note_type || ''),
            String(n.category || ''),
            n.content || '',
            n.created_at || '',
        ].join(' ').toLowerCase();
        return hay.includes(q);
    });
}

function filterNotesByTypeAndCategory(notes, noteType, category) {
    const items = Array.isArray(notes) ? notes : [];
    const nt = (noteType || 'all').trim().toLowerCase();
    const cat = (category || '').trim();

    return items.filter((n) => {
        const nType = String(n.note_type || (n.todo_id ? 'attached' : 'project')).toLowerCase();
        const nCat = String(n.category || '').trim();

        if (nt && nt !== 'all' && nType !== nt) return false;
        if (cat && nCat !== cat) return false;
        return true;
    });
}

function applyClientTextFilter(todos, filterText) {
    const q = (filterText || '').trim().toLowerCase();
    if (!q) return todos || [];

    const matchesTodo = (t) => {
        const hay = [
            String(t.id || ''),
            t.title || '',
            t.description || '',
            t.topic || '',
            t.status || '',
            t.category || '',
            Array.isArray(t.tags) ? t.tags.map((x) => x && x.name).join(',') : '',
        ].join(' ').toLowerCase();
        return hay.includes(q);
    };

    const walk = (arr) => {
        const out = [];
        for (const t of arr || []) {
            const kids = Array.isArray(t.children) ? walk(t.children) : [];
            if (matchesTodo(t) || kids.length) {
                out.push({ ...t, children: kids });
            }
        }
        return out;
    };

    return walk(todos || []);
}

function setHeaderControlsState(options, stats) {
    const o = options || {};
    const s = stats || {};

    const searchInput = document.getElementById('ttNavSearchInput');
    if (searchInput && !searchInput._ttSyncing) {
        searchInput._ttSyncing = true;
        try { searchInput.value = o.searchQuery || ''; } catch (e) {}
        searchInput._ttSyncing = false;
    }

    const filterInput = document.getElementById('ttNavFilterInput');
    if (filterInput && !filterInput._ttSyncing) {
        filterInput._ttSyncing = true;
        try { filterInput.value = o.filterText || ''; } catch (e) {}
        filterInput._ttSyncing = false;
    }

    const statusSeg = document.getElementById('ttHeaderStatusSeg');
    if (statusSeg) {
        const segValue = o.queued ? 'queue' : (o.status || 'pending');
        try { statusSeg.value = segValue; } catch (e) {}

        const counts = {
            all: s.total || 0,
            pending: s.pending || 0,
            in_progress: s.in_progress || 0,
            completed: s.completed || 0,
            cancelled: s.cancelled || 0,
            queue: s.queued || 0,
        };
        const labels = {
            all: 'All',
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
            queue: 'Queue',
        };
        statusSeg.querySelectorAll('calcite-segmented-control-item').forEach((item) => {
            const v = item.getAttribute('value');
            if (!v || !labels[v]) return;
            item.textContent = `${labels[v]} (${counts[v]})`;
        });
    }

    // Mobile header status select mirrors segmented control (same semantics)
    const statusSelect = document.getElementById('ttHeaderStatusSelect');
    if (statusSelect) {
        const selValue = o.queued ? 'queue' : (o.status || 'pending');
        try { statusSelect.value = selValue; } catch (e) {}

        const counts = {
            all: s.total || 0,
            pending: s.pending || 0,
            in_progress: s.in_progress || 0,
            completed: s.completed || 0,
            cancelled: s.cancelled || 0,
            queue: s.queued || 0,
        };
        const labels = {
            all: 'All',
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
            queue: 'Queue',
        };
        statusSelect.querySelectorAll('calcite-option').forEach((opt) => {
            const v = opt.getAttribute('value');
            if (!v || !labels[v]) return;
            opt.textContent = `${labels[v]} (${counts[v]})`;
        });
    }

    // Secondary-navigation "status page" button should reflect the selected status (and always have an accessible label).
    const statusPageItem = document.getElementById('ttNavStatusPageItem');
    if (statusPageItem) {
        const segValue = o.queued ? 'queue' : (o.status || 'pending');
        const counts = {
            all: s.total || 0,
            pending: s.pending || 0,
            in_progress: s.in_progress || 0,
            completed: s.completed || 0,
            cancelled: s.cancelled || 0,
            queue: s.queued || 0,
        };
        const labels = {
            all: 'All',
            pending: 'Pending',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
            queue: 'Queue',
        };
        const displayText = `${labels[segValue] || 'Todos'} (${counts[segValue] || 0})`;
        statusPageItem.text = displayText;
        statusPageItem.label = displayText;

        const qs = buildQueryString({
            status: o.status || 'pending',
            queued: o.queued ? 'true' : 'false',
            q: o.searchQuery || '',
            filter: o.filterText || '',
            view: o.view || 'grid',
            page: o.page || 1,
            page_size: o.pageSize || 24,
        });
        statusPageItem.href = `#/${qs}`;
    }
}

function setNavSearchFilterState(searchQuery, filterText) {
    const searchInput = document.getElementById('ttNavSearchInput');
    if (searchInput && !searchInput._ttSyncing) {
        searchInput._ttSyncing = true;
        try { searchInput.value = (searchQuery || '').trim(); } catch (e) {}
        searchInput._ttSyncing = false;
    }

    const filterInput = document.getElementById('ttNavFilterInput');
    if (filterInput && !filterInput._ttSyncing) {
        filterInput._ttSyncing = true;
        try { filterInput.value = (filterText || '').trim(); } catch (e) {}
        filterInput._ttSyncing = false;
    }
}

function initializeHeaderControls() {
    // Header "+ New" button (global)
    const headerNewBtn = document.getElementById('ttHeaderNewTodoBtn');
    if (headerNewBtn && !headerNewBtn._ttBound) {
        headerNewBtn._ttBound = true;
        headerNewBtn.addEventListener('click', () => {
            // Route-aware: in Notes mode, "New" creates a note.
            if (isNotesMode()) {
                const m = document.getElementById('createNoteModal');
                if (m) m.open = true;
                else addCreateNoteModal();
                const mm = document.getElementById('createNoteModal');
                if (mm) mm.open = true;
                return;
            }
            const m = document.getElementById('createModal');
            if (m) m.open = true;
        });
    }

    // Header "Settings" button (global, left of user placeholder)
    const settingsBtn = document.getElementById('ttHeaderSettingsBtn');
    if (settingsBtn && !settingsBtn._ttBound) {
        settingsBtn._ttBound = true;
        settingsBtn.addEventListener('click', () => {
            try {
                router.navigate('/settings');
            } catch (e) {
                window.location.href = '/settings';
            }
        });
    }

    // Global navigation-secondary search (Enter)
    const navSearch = document.getElementById('ttNavSearchInput');
    if (navSearch && !navSearch._ttBound) {
        navSearch._ttBound = true;
        navSearch.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            if (navSearch._ttSyncing) return;
            const query = (navSearch.value || '').trim();
            if (isNotesMode()) {
                navigateNotesWithParamPatch({ q: query, page: 1 });
            } else {
                navigateTodosWithParamPatch({ q: query, page: 1 });
            }
        });
    }

    // Global navigation-secondary filter (live)
    const navFilter = document.getElementById('ttNavFilterInput');
    if (navFilter && !navFilter._ttBound) {
        navFilter._ttBound = true;
        let timer = null;
        navFilter.addEventListener('input', () => {
            if (navFilter._ttSyncing) return;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const q = (navFilter.value || '').trim();
                if (isNotesMode()) {
                    navigateNotesWithParamPatch({ filter: q, page: 1 });
                } else {
                    navigateTodosWithParamPatch({ filter: q, page: 1 });
                }
            }, 150);
        });
    }

    // Header status segmented control (applies to both panels)
    const headerStatusSeg = document.getElementById('ttHeaderStatusSeg');
    if (headerStatusSeg && !headerStatusSeg._ttBound) {
        headerStatusSeg._ttBound = true;
        headerStatusSeg.addEventListener('calciteSegmentedControlChange', () => {
            if (isNotesMode()) return;
            const v = headerStatusSeg.value || 'pending';
            if (v === 'queue') {
                navigateTodosWithParamPatch({ status: 'all', queued: 'true', page: 1 });
            } else {
                navigateTodosWithParamPatch({ status: v, queued: 'false', page: 1 });
            }
        });
    }

    // Header status select (mobile). Mirrors segmented control behavior.
    const headerStatusSelect = document.getElementById('ttHeaderStatusSelect');
    if (headerStatusSelect && !headerStatusSelect._ttBound) {
        headerStatusSelect._ttBound = true;
        headerStatusSelect.addEventListener('change', () => {
            if (isNotesMode()) return;
            const v = headerStatusSelect.value || 'pending';
            if (v === 'queue') {
                navigateTodosWithParamPatch({ status: 'all', queued: 'true', page: 1 });
            } else {
                navigateTodosWithParamPatch({ status: v, queued: 'false', page: 1 });
            }
        });
    }
}

/**
 * Todos List View
 */
async function renderTodosView() {
    showLoading();
    setHeaderMode('todos');
    const opts = getTodosRouteOptions();
    const status = opts.status || 'pending';
    const queued = !!opts.queued;
    const sortBy = opts.sortBy || 'updated_at';
    const sortDir = opts.sortDir || 'desc';
    const searchQuery = (opts.searchQuery || '').trim();

    try {
        // Fetch todos
        let todos;
        if (searchQuery) {
            const searchResponse = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery })
            });
            if (!searchResponse.ok) throw new Error('Failed to search todos');
            todos = await searchResponse.json();
            // Build tree from flat search results
            todos = buildTreeFromResults(todos);
        } else {
            const todosResponse = await fetch('/api/todos');
            if (!todosResponse.ok) throw new Error('Failed to fetch todos');
            todos = await todosResponse.json();
        }

        // Filter by status
        if (status && status !== 'all') {
            todos = filterTodosByStatus(todos, status);
        }

        // Filter by queue
        if (queued) {
            todos = filterTodosInQueue(todos);
        }

        // Sort todos
        todos = sortTodos(todos, sortBy, sortDir);

        // Fetch stats
        const statsResponse = await fetch('/api/todos');
        const allTodos = await statsResponse.json();
        const stats = calculateStats(allTodos);

        // Apply client-side filter (applies to both left panel + main)
        const filteredTree = applyClientTextFilter(todos, opts.filterText);

        // Render browser panel + main placeholder (master-detail)
        const { startPanel, startShell, mainView } = getShellTargets();
        if (startShell) startShell.removeAttribute('collapsed');
        if (startPanel) {
            startPanel.innerHTML = renderTodoBrowserPanelHTML(filteredTree, stats);
        }
        if (mainView) {
            mainView.innerHTML = renderMainTodosHTML(filteredTree, opts);
        }

        // Cache full tree for dependency dropdowns, etc.
        window.ttAllTodosCache = allTodos;

        // Default: no selection, detail panel closed
        collapseDetailPanel();

        // Keep header controls in sync with route + stats
        setHeaderControlsState(opts, stats);

        hideLoading();

        // Initialize todos view functionality (wires browser panel handlers)
        initializeTodosView();

        // Add create todo modal
        addCreateTodoModal();

        // No item selected on home route
        syncBrowserSelection(null);
    } catch (error) {
        console.error('Error loading todos:', error);
        showError('Failed to load todos. Please try again.');
        hideLoading(); // Ensure loader is hidden on error
    }
}

/**
 * Filter todos by status recursively
 */
function filterTodosByStatus(todos, status) {
    const filtered = [];
    for (const todo of todos) {
        if (todo.status === status) {
            const filteredTodo = { ...todo };
            if (todo.children && todo.children.length > 0) {
                filteredTodo.children = filterTodosByStatus(todo.children, status);
            }
            filtered.push(filteredTodo);
        } else if (todo.children && todo.children.length > 0) {
            const filteredChildren = filterTodosByStatus(todo.children, status);
            if (filteredChildren.length > 0) {
                filtered.push({ ...todo, children: filteredChildren });
            }
        }
    }
    return filtered;
}

/**
 * Filter todos in queue recursively
 */
function filterTodosInQueue(todos) {
    const filtered = [];
    for (const todo of todos) {
        if ((todo.queue || 0) > 0) {
            const filteredTodo = { ...todo };
            if (todo.children && todo.children.length > 0) {
                filteredTodo.children = filterTodosInQueue(todo.children);
            }
            filtered.push(filteredTodo);
        } else if (todo.children && todo.children.length > 0) {
            const filteredChildren = filterTodosInQueue(todo.children);
            if (filteredChildren.length > 0) {
                filtered.push({ ...todo, children: filteredChildren });
            }
        }
    }
    return filtered;
}

/**
 * Sort todos recursively
 */
function sortTodos(todos, sortBy, sortDir) {
    const reverse = sortDir !== 'asc';
    
    const sortKey = (todo) => {
        if (sortBy === 'title') {
            return (todo.title || '').toLowerCase();
        } else if (sortBy === 'status') {
            const order = { 'pending': 0, 'in_progress': 1, 'completed': 2, 'cancelled': 3 };
            return order[todo.status] || 999;
        } else if (sortBy === 'updated_at' || sortBy === 'activity') {
            return new Date(todo.updated_at || todo.created_at || 0);
        } else if (sortBy === 'created_at') {
            return new Date(todo.created_at || 0);
        } else if (sortBy === 'queue') {
            return (todo.queue || 0) > 0 ? todo.queue : 999999;
        }
        return todo.id || 0;
    };

    const sorted = [...todos].sort((a, b) => {
        const aVal = sortKey(a);
        const bVal = sortKey(b);
        if (aVal < bVal) return reverse ? 1 : -1;
        if (aVal > bVal) return reverse ? -1 : 1;
        return 0;
    });

    // Sort children recursively
    for (const todo of sorted) {
        if (todo.children && todo.children.length > 0) {
            todo.children = sortTodos(todo.children, sortBy, sortDir);
        }
    }

    return sorted;
}

/**
 * Build tree structure from flat search results
 */
function buildTreeFromResults(results) {
    const todoMap = {};
    const rootTodos = [];
    
    // Create map of all todos
    for (const todo of results) {
        todoMap[todo.id] = { ...todo, children: [] };
    }
    
    // Build tree
    for (const todo of results) {
        if (todo.parent_id && todoMap[todo.parent_id]) {
            todoMap[todo.parent_id].children.push(todoMap[todo.id]);
        } else {
            rootTodos.push(todoMap[todo.id]);
        }
    }
    
    return rootTodos;
}

/**
 * Calculate statistics from todos
 */
function calculateStats(todos) {
    const flatten = (todos) => {
        let result = [];
        for (const todo of todos) {
            result.push(todo);
            if (todo.children && todo.children.length > 0) {
                result = result.concat(flatten(todo.children));
            }
        }
        return result;
    };

    const all = flatten(todos);
    return {
        total: all.length,
        pending: all.filter(t => t.status === 'pending').length,
        in_progress: all.filter(t => t.status === 'in_progress').length,
        completed: all.filter(t => t.status === 'completed').length,
        cancelled: all.filter(t => t.status === 'cancelled').length,
        queued: all.filter(t => (t.queue || 0) > 0).length
    };
}

/**
 * Render todos HTML
 */
async function renderTodosHTML(todos, stats, options) {
    // Ensure templates are registered
    if (!ensureTemplatesRegistered()) {
        console.error('Failed to register templates');
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Templates not loaded</p></div>';
    }
    
    // Access named template correctly: $.templates.todosList (not $.templates("todos-list"))
    // JsRender named templates are accessed as properties, not as function calls
    const template = $.templates.todosList || $.templates["todos-list"];
    if (!template) {
        console.error('Template "todos-list" not found. Available templates:', Object.keys($.templates));
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Template not found</p></div>';
    }
    
    const data = {
        todos: todos || [],
        stats: stats || { total: 0, pending: 0, in_progress: 0, completed: 0, queued: 0 },
        status: options.status || 'pending',
        queued: options.queued || false,
        sortBy: options.sortBy || 'updated_at',
        sortDir: options.sortDir || 'desc',
        searchQuery: options.searchQuery || null
    };

    try {
        if (typeof template.render !== 'function') {
            console.error('Template.render is not a function. Template:', template);
            return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Template.render is not a function</p></div>';
        }
        
        const result = template.render(data);
        
        if (!result || typeof result !== 'string') {
            console.error('Template render returned invalid result:', typeof result, result);
            return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Template render returned invalid result</p></div>';
        }
        if (result.length < 50) {
            console.error('Template render result too short, likely an error. Full result:', result);
            return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Template render failed. Result: ' + escapeHtml(result) + '</p></div>';
        }
        return result;
    } catch (error) {
        console.error('Template rendering error:', error);
        console.error('Error stack:', error.stack);
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error rendering template: ' + escapeHtml(error.message) + '</p></div>';
    }
}

/**
 * Render a single todo item recursively with full details always visible
 */
function renderTodoItem(todo, level = 0) {
    // Ensure templates are registered
    if (!ensureTemplatesRegistered()) {
        console.error('Failed to register templates');
        return '<div class="text-color-danger">Error: Templates not loaded</div>';
    }
    
    // Access named template correctly using property syntax
    const template = $.templates.todoItem || $.templates["todo-item"];
    if (!template) {
        console.error('Template "todo-item" not found');
        return '<div class="text-color-danger">Error: Template not found</div>';
    }
    
    const data = {
        ...todo,
        indent: level || 0
    };

    try {
        return template.render(data);
    } catch (error) {
        console.error('Template rendering error:', error);
        return '<div class="text-color-danger">Error rendering template: ' + escapeHtml(error.message) + '</div>';
    }
}

/**
 * Initialize todos view functionality
 */
function initializeTodosView() {
    // Header controls are global (Todos + Notes).
    initializeHeaderControls();

    // Responsive left panel: when the panel is near its min width, stack the status chip above title/description.
    // Uses ResizeObserver (Calcite removed shell-panel toggle resize events in favor of observers).
    const { startShell: _ttStartShellResponsive, startPanel: _ttStartPanelResponsive } = getShellTargets();
    if (_ttStartShellResponsive && _ttStartPanelResponsive && !_ttStartShellResponsive._ttResponsiveBound) {
        _ttStartShellResponsive._ttResponsiveBound = true;
        const apply = () => {
            try {
                const sh = _ttStartShellResponsive;
                const panel = _ttStartPanelResponsive;
                const content = sh.shadowRoot && sh.shadowRoot.querySelector && sh.shadowRoot.querySelector('.content');
                if (!content) return;
                const cs = window.getComputedStyle(content);
                const minInline = parseFloat(cs.minInlineSize || '0') || 0;
                const w = content.getBoundingClientRect().width || 0;
                const shouldStack = (minInline > 0) && (w <= (minInline + 30));
                if (shouldStack) panel.setAttribute('data-tt-status-chips-top', 'true');
                else panel.removeAttribute('data-tt-status-chips-top');
            } catch (e) {}
        };
        try {
            const ready = (_ttStartShellResponsive.componentOnReady && _ttStartShellResponsive.componentOnReady()) || Promise.resolve();
            ready.then(() => {
                try {
                    const content = _ttStartShellResponsive.shadowRoot && _ttStartShellResponsive.shadowRoot.querySelector && _ttStartShellResponsive.shadowRoot.querySelector('.content');
                    if (!content || typeof ResizeObserver === 'undefined') {
                        apply();
                        return;
                    }
                    const ro = new ResizeObserver(() => apply());
                    _ttStartShellResponsive._ttResponsiveRO = ro;
                    ro.observe(content);
                    apply();
                } catch (e) {}
            }).catch(() => {});
        } catch (e) {}
    }

    // Left panel minimize toggle
    const leftToggle = document.getElementById('ttLeftPanelToggleBtn');
    if (leftToggle && !leftToggle._ttBound) {
        leftToggle._ttBound = true;
        leftToggle.addEventListener('click', async () => {
            const { startShell } = getShellTargets();
            if (!startShell) return;
            const isMin = startShell.getAttribute('data-tt-minimized') === 'true';
            startShell.setAttribute('data-tt-minimized', isMin ? 'false' : 'true');
            if (isMin) {
                // Clear enforced rail sizing
                try {
                    startShell.style.removeProperty('--calcite-shell-panel-width');
                    startShell.style.removeProperty('--calcite-shell-panel-min-width');
                    startShell.style.removeProperty('--calcite-shell-panel-max-width');
                } catch (e) {}

                // Restore size + resizable state (and force a rebind so it can resize out of min-width snaps)
                const prevResizable = startShell.getAttribute('data-tt-resizable-prev');
                const prevInline = parseInt(startShell.getAttribute('data-tt-prev-inline') || '', 10);

                // Turn resizable off to clear any internal constraints
                startShell.removeAttribute('resizable');

                // Calcite ShellPanel reads computed min/max on (re)enabling resizable.
                // If we just came from the minimized rail, max-inline-size can be transiently ~20px due to transition timing,
                // which leads to an invalid clamp range (min>max) and the separator "sticks".
                // Force transitions off briefly during the restore so computed min/max stabilize immediately.
                let _ttPrevAnimTiming = null;
                try {
                    _ttPrevAnimTiming = startShell.style.getPropertyValue('--calcite-animation-timing') || null;
                    startShell.style.setProperty('--calcite-animation-timing', '0s');
                } catch (e) {}

                // First, clear any inline size constraints to reset Calcite's internal state
                try {
                    await startShell.updateSize({ inline: null });
                } catch (e) {}

                // Restore previous width (or use default if too small)
                // If the saved width is too small (at/near minimum), reset to default instead
                // to avoid getting stuck at the minimum width constraint
                const MIN_REASONABLE_WIDTH = 200; // Reasonable minimum to avoid getting stuck at snapped min
                const DEFAULT_PANEL_WIDTH = 360; // Default width from CSS
                try {
                    if (Number.isFinite(prevInline) && prevInline > MIN_REASONABLE_WIDTH) {
                        await startShell.updateSize({ inline: prevInline });
                    } else {
                        // Reset to default width explicitly to clear any minimum constraints
                        await startShell.updateSize({ inline: DEFAULT_PANEL_WIDTH });
                    }
                } catch (e) {}

                if (prevResizable === 'true') {
                    try { startShell.setAttribute('resizable', ''); } catch (e) {}
                }

                // Restore Calcite animation timing back to normal.
                try {
                    if (_ttPrevAnimTiming) startShell.style.setProperty('--calcite-animation-timing', _ttPrevAnimTiming);
                    else startShell.style.removeProperty('--calcite-animation-timing');
                } catch (e) {}

                startShell.removeAttribute('data-tt-resizable-prev');
                startShell.removeAttribute('data-tt-prev-inline');
                // Expanded state
                leftToggle.setAttribute('icon-start', 'chevrons-left');
                leftToggle.innerHTML = 'Minimize';
                leftToggle.setAttribute('title', 'Minimize left panel');
            } else {
                // While minimized, remove resizable (it adds internal padding/handle that prevents a true narrow rail)
                startShell.setAttribute('data-tt-resizable-prev', startShell.hasAttribute('resizable') ? 'true' : 'false');
                startShell.removeAttribute('resizable');

                // Remember current width so restoring doesn't get "stuck" at snapped minimums.
                try {
                    const w = Math.round(startShell.getBoundingClientRect().width);
                    if (w > 0) startShell.setAttribute('data-tt-prev-inline', String(w));
                } catch (e) {}

                // Enforce rail sizing via inline vars to defeat any default Calcite min-width clamps.
                try {
                    startShell.style.setProperty('--calcite-shell-panel-width', '15pt');
                    startShell.style.setProperty('--calcite-shell-panel-min-width', '15pt');
                    startShell.style.setProperty('--calcite-shell-panel-max-width', '15pt');
                } catch (e) {}

                // Force internal size override to match rail width (15pt ≈ 20px).
                try { await startShell.updateSize({ inline: 20 }); } catch (e) {}

                // Minimized rail state
                leftToggle.setAttribute('icon-start', 'dock-left');
                leftToggle.innerHTML = '';
                leftToggle.setAttribute('title', 'Restore left panel');
            }
        });
    }

    // Browser list selection handler
    const list = document.getElementById('ttTodoBrowserList');
    if (list && !list._ttBound) {
        list._ttBound = true;
        list.addEventListener('calciteListItemSelect', (e) => {
            const item = e.target;
            if (!item) return;
            const id = parseInt(item.value, 10);
            if (!id) return;
            router.navigate(`/todo/${id}`);
        });
    }

    // Apply navigation-secondary filter text to the left list (Calcite list external filtering)
    if (list) {
        const filterText = (document.getElementById('ttNavFilterInput') && document.getElementById('ttNavFilterInput').value) || '';
        try { list.filterText = filterText; } catch (e) {}
    }

    // Main panel list selection
    const mainList = document.getElementById('ttMainTodosList');
    if (mainList && !mainList._ttBound) {
        mainList._ttBound = true;
        mainList.addEventListener('calciteListItemSelect', (e) => {
            const item = e.target;
            if (!item) return;
            const id = parseInt(item.value, 10);
            if (!id) return;
            router.navigate(`/todo/${id}`);
        });
    }

    // Main panel table row click
    document.querySelectorAll('.tt-main-table-row').forEach((row) => {
        if (row._ttBound) return;
        row._ttBound = true;
        row.addEventListener('click', () => {
            const id = parseInt(row.getAttribute('data-tt-todo-id'), 10);
            if (!id) return;
            router.navigate(`/todo/${id}`);
        });
    });

    // Main panel view mode segmented control
    const viewSeg = document.getElementById('ttMainViewModeSeg');
    if (viewSeg && !viewSeg._ttBound) {
        viewSeg._ttBound = true;
        viewSeg.addEventListener('calciteSegmentedControlChange', () => {
            const v = viewSeg.value || 'grid';
            navigateTodosWithParamPatch({ view: v, page: 1 });
        });
    }

    // Main panel pagination
    const pagination = document.getElementById('ttMainPagination');
    if (pagination && !pagination._ttBound) {
        pagination._ttBound = true;
        pagination.addEventListener('calcitePaginationChange', () => {
            const pageSize = parseInt(String(pagination.pageSize || 24), 10) || 24;
            const startItem = parseInt(String(pagination.startItem || 1), 10) || 1;
            const page = Math.max(1, Math.ceil(startItem / pageSize));
            navigateTodosWithParamPatch({ page, page_size: pageSize });
        });
    }

    // Render markdown
    document.querySelectorAll('.markdown-render').forEach(el => {
        renderMarkdown(el);
    });
}

/**
 * Add create todo modal to the page
 */
function addCreateTodoModal() {
    // Check if modal already exists
    if (document.getElementById('createModal')) return;
    
    const modal = document.createElement('calcite-dialog');
    modal.id = 'createModal';
    // Calcite dialog best practice:
    // - Use `heading` for visible title
    // - IMPORTANT (Calcite 3.3.x): do NOT put your form in `slot="content"` unless you intend to
    //   replace the entire internal `calcite-panel` (which removes the standard dialog chrome).
    // - Use `footer-start/footer-end` slots for actions.
    modal.label = 'Create New Todo';
    modal.setAttribute('heading', 'New Todo');
    modal.setAttribute('description', 'Create a new todo item');
    modal.setAttribute('modal', '');
    modal.setAttribute('placement', 'center');
    modal.setAttribute('scale', 'm');
    modal.setAttribute('width-scale', 's');
    modal.setAttribute('slot', 'dialogs');
    
    modal.innerHTML = `
        <form id="createModalForm" class="space-y-4">
            <input type="hidden" name="parent_id" id="ttCreateTodoParentId" value="" />
            <calcite-label>
                Title*
                <calcite-input type="text" name="title" required></calcite-input>
            </calcite-label>
            
            <calcite-label>
                Description
                <tt-md-editor name="description" height="180px" placeholder="Description (Markdown)"></tt-md-editor>
            </calcite-label>
            
            <calcite-label>
                Category
                <calcite-select name="category">
                    <calcite-option value="feature">feature</calcite-option>
                    <calcite-option value="issue">issue</calcite-option>
                    <calcite-option value="bug">bug</calcite-option>
                </calcite-select>
            </calcite-label>
            
            <calcite-label>
                Topic
                <span class="text-color-3 text-xs">(optional)</span>
                <calcite-input type="text" name="topic"></calcite-input>
            </calcite-label>
            
            <calcite-label>
                Tags
                <span class="text-color-3 text-xs">(optional, comma-separated)</span>
                <calcite-input type="text" name="tags" placeholder="e.g., ui, frontend, urgent"></calcite-input>
            </calcite-label>
        </form>

        <calcite-button id="createModalCancel" slot="footer-end" width="auto" appearance="outline" kind="neutral">
            Cancel
        </calcite-button>
        <calcite-button slot="footer-end" width="auto" type="submit" form="createModalForm" appearance="solid">
            Create
        </calcite-button>
    `;
    
    // Place inside calcite-shell so it is constrained (Calcite pattern).
    const shell = document.querySelector('calcite-shell');
    (shell || document.body).appendChild(modal);

    // Toast UI editor mounts itself inside <tt-md-editor> instances.
    
    // Handle form submission
    const form = document.getElementById('createModalForm');
    const cancelBtn = document.getElementById('createModalCancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.open = false;
        });
    }
    // Reset form whenever dialog closes.
    modal.addEventListener('calciteDialogClose', () => {
        try { form && form.reset(); } catch (e) {}
        try {
            const parentInput = document.getElementById('ttCreateTodoParentId');
            if (parentInput) parentInput.value = '';
        } catch (e) {}
        try {
            modal.setAttribute('heading', 'New Todo');
            modal.setAttribute('description', 'Create a new todo item');
        } catch (e) {}
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/todos/form', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok || response.status === 303 || response.status === 302) {
                modal.open = false;
                form.reset();
                // Reload the current view
                router.handleRoute();
            } else {
                alert('Failed to create todo');
            }
        } catch (error) {
            console.error('Error creating todo:', error);
            alert('Failed to create todo');
        }
    });

    // Allow other parts of the SPA to open the create-todo dialog with context (e.g., create subtask under a parent).
    window.ttOpenCreateTodoModal = function ttOpenCreateTodoModal(opts) {
        const o = opts || {};
        const parentId = (o && o.parentId != null) ? (parseInt(String(o.parentId), 10) || 0) : 0;
        const parentInput = document.getElementById('ttCreateTodoParentId');
        if (parentInput) parentInput.value = (parentId && parentId > 0) ? String(parentId) : '';

        try {
            if (parentId && parentId > 0) {
                modal.setAttribute('heading', 'New Subtask');
                modal.setAttribute('description', `Create a subtask under Todo #${parentId}`);
            } else {
                modal.setAttribute('heading', 'New Todo');
                modal.setAttribute('description', 'Create a new todo item');
            }
        } catch (e) {}

        modal.open = true;
    };
}

/**
 * Todo Detail View
 */
async function renderTodoDetailView(params) {
    showLoading();
    const todoId = parseInt(params.id);

    try {
        // Ensure browser panel exists (master-detail)
        const { startPanel } = getShellTargets();
        if (startPanel && startPanel.innerHTML.trim() === '') {
            await renderTodosView();
        }

        const response = await fetch(`/api/todos/${todoId}/detail`);
        if (!response.ok) throw new Error('Todo not found');
        const todo = await response.json();

        const { endPanel, mainView } = getShellTargets();
        const narrow = isNarrowScreen();

        if (narrow) {
            // Mobile: render the inspector in the end panel (overlay).
            if (endPanel) {
                endPanel.innerHTML = renderTodoDetailPanelHTML(todo);
            }
            if (mainView) {
                mainView.innerHTML = '';
            }
            openDetailPanel();
        } else {
            // Desktop: render the inspector in the main area to avoid a blank center column.
            collapseDetailPanel();
            if (mainView) {
                mainView.innerHTML = renderTodoDetailPanelHTML(todo);
            }
        }
        hideLoading();

        syncBrowserSelection(todoId);
        initializeTodoDetailView(todo);
    } catch (error) {
        console.error('Error loading todo:', error);
        showError('Failed to load todo. Please try again.');
        hideLoading(); // Ensure loader is hidden on error
    }
}

/**
 * Render todo detail HTML
 */
async function renderTodoDetailHTML(todo, notes) {
    // Ensure templates are registered
    if (!ensureTemplatesRegistered()) {
        console.error('Failed to register templates');
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Templates not loaded</p></div>';
    }
    
    // Access named template correctly using property syntax
    const template = $.templates.todoDetail || $.templates["todo-detail"];
    if (!template) {
        console.error('Template "todo-detail" not found');
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Template not found</p></div>';
    }
    
    const data = {
        ...todo,
        notes: notes || []
    };

    try {
        return template.render(data);
    } catch (error) {
        console.error('Template rendering error:', error);
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error rendering template: ' + escapeHtml(error.message) + '</p></div>';
    }
}

/**
 * Initialize todo detail view
 */
function initializeTodoDetailView(todo) {
    // Fill initial values via JS properties to preserve quotes/newlines safely.
    // (Avoid relying on HTML attributes like value="..." for multi-line content.)
    const fields = Array.from(document.querySelectorAll('[data-tt-field]'));
    for (const el of fields) {
        const field = el.getAttribute('data-tt-field');
        const todoId = parseInt(el.getAttribute('data-tt-todo-id') || todo.id, 10);
        if (!field || !todoId) continue;

        try {
            if (field === 'tag_names') {
                el.value = (todo.tags || []).map((x) => x.name).join(', ');
            } else if (field === 'queue') {
                el.value = String(todo.queue || 0);
            } else if (field === 'task_size') {
                el.value = todo.task_size == null ? '' : String(todo.task_size);
            } else if (field === 'priority_class') {
                el.value = todo.priority_class || '';
            } else if (field === 'topic') {
                el.value = todo.topic || '';
            } else if (field === 'title') {
                el.value = todo.title || '';
            } else if (field === 'status' || field === 'category') {
                el.value = todo[field] || '';
            } else if (field === 'description' || field === 'work_completed' || field === 'work_remaining' || field === 'implementation_issues') {
                el.value = todo[field] || '';
            } else if (field === 'completion_percentage') {
                el.value = todo.completion_percentage == null ? '' : String(todo.completion_percentage);
            }
        } catch (e) {
            // Non-fatal: some Calcite elements may not be ready immediately.
        }
    }

    // Markdown editor helpers for detail textareas (description/work_* fields)
    // Markdown editing uses Toast UI via <tt-md-editor>.

    _setAutosaveChip('Saved');

    // Auto-save for all editable fields in the inspector (with status indicator).
    window.ttAutosaveState = window.ttAutosaveState || {};
    const getState = (todoId) => {
        if (!window.ttAutosaveState[todoId]) {
            window.ttAutosaveState[todoId] = { timer: null, patch: {} };
        }
        return window.ttAutosaveState[todoId];
    };

    const updateBrowserListItemTitle = (todoId, title) => {
        const list = document.getElementById('ttTodoBrowserList');
        if (!list) return;
        const item = list.querySelector(`calcite-list-item[value="${todoId}"]`);
        if (!item) return;
        try {
            item.label = title;
        } catch (e) {
            item.setAttribute('label', escapeHtml(title));
        }
    };

    const flushAutosave = async (todoId) => {
        const state = getState(todoId);
        const patch = state.patch || {};
        state.patch = {};
        state.timer = null;
        if (!patch || Object.keys(patch).length === 0) return;

        try {
            _setAutosaveChip('Saving…');
            await apiUpdateTodo(todoId, patch);
            if (typeof patch.title === 'string') {
                updateBrowserListItemTitle(todoId, patch.title);
            }
            _setAutosaveChip(`Saved ${new Date().toLocaleTimeString()}`);
        } catch (e) {
            console.error('Update failed:', e);
            _setAutosaveChip('Save failed');
            alert('Failed to save changes: ' + (e.message || e));
        }
    };

    const scheduleAutosave = (todoId, patch, debounceMs) => {
        const state = getState(todoId);
        state.patch = { ...(state.patch || {}), ...(patch || {}) };
        if (state.timer) clearTimeout(state.timer);
        // Give immediate feedback that changes are pending.
        _setAutosaveChip('Saving…');
        state.timer = setTimeout(() => flushAutosave(todoId), Math.max(0, debounceMs || 0));
    };

    fields.forEach((el) => {
        const field = el.getAttribute('data-tt-field');
        const todoId = parseInt(el.getAttribute('data-tt-todo-id') || todo.id, 10);

        const handler = async () => {
            let value = el.value;
            const patch = {};

            if (field === 'tag_names') {
                patch.tag_names = (value || '')
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
            } else if (field === 'queue') {
                patch.queue = value === '' ? 0 : parseInt(value, 10);
            } else if (field === 'task_size') {
                patch.task_size = value === '' ? null : parseInt(value, 10);
            } else if (field === 'priority_class') {
                patch.priority_class = (value || '').trim().toUpperCase() || null;
            } else if (field === 'topic') {
                patch.topic = (value || '').trim() || null;
            } else if (field === 'title') {
                patch.title = value;
            } else if (field === 'status' || field === 'category') {
                patch[field] = value;
            } else if (field === 'description' || field === 'work_completed' || field === 'work_remaining' || field === 'implementation_issues') {
                patch[field] = value;
            } else if (field === 'completion_percentage') {
                const s = String(value || '').trim();
                if (s === '') patch.completion_percentage = null;
                else patch.completion_percentage = parseInt(s, 10);
            }

            if (Object.keys(patch).length === 0) return;
            const debounceMs = (field === 'status' || field === 'category') ? 0 : 450;
            scheduleAutosave(todoId, patch, debounceMs);
        };

        el.addEventListener('calciteInputChange', handler);
        el.addEventListener('calciteSelectChange', handler);
        el.addEventListener('change', handler);
    });

    // AI instruction toggles (stored under todo.ai_instructions JSON object).
    const aiState = (todo && typeof todo.ai_instructions === 'object' && todo.ai_instructions) ? { ...todo.ai_instructions } : {};
    document.querySelectorAll('[data-tt-ai-flag][data-tt-todo-id]').forEach((sw) => {
        if (sw._ttBoundAiFlag) return;
        sw._ttBoundAiFlag = true;
        const flag = String(sw.getAttribute('data-tt-ai-flag') || '').trim();
        const todoId = parseInt(sw.getAttribute('data-tt-todo-id') || todo.id, 10);
        if (!flag || !todoId) return;

        try {
            sw.checked = !!aiState[flag];
        } catch (e) {}

        const handler = () => {
            const checked = !!sw.checked;
            aiState[flag] = checked;
            scheduleAutosave(todoId, { ai_instructions: { ...aiState } }, 0);
        };

        sw.addEventListener('calciteSwitchChange', handler);
        sw.addEventListener('change', handler);
    });

    // Relations: add/remove
    const relAddBtn = document.getElementById('ttAddRelBtn');
    if (relAddBtn && !relAddBtn._ttBound) {
        relAddBtn._ttBound = true;
        relAddBtn.addEventListener('click', async () => {
            const sel = document.getElementById('ttAddRelSelect');
            const rid = sel ? parseInt(sel.value, 10) : NaN;
            if (!rid) return;
            const existing = Array.isArray(todo.relates_to)
                ? todo.relates_to.map((x) => parseInt(String(x && x.id != null ? x.id : ''), 10)).filter(Boolean)
                : [];
            const next = Array.from(new Set([...existing, rid]));
            try {
                await apiSetRelatesTo(todo.id, next);
                await refreshTodoDetail(todo.id);
            } catch (e) {
                console.error('Add related todo failed:', e);
                alert('Failed to add related todo: ' + (e.message || e));
            }
        });
    }

    document.querySelectorAll('[data-tt-rel-remove]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const rid = parseInt(btn.getAttribute('data-tt-rel-remove'), 10);
            if (!rid) return;
            if (!confirm('Remove this related link?')) return;
            const existing = Array.isArray(todo.relates_to)
                ? todo.relates_to.map((x) => parseInt(String(x && x.id != null ? x.id : ''), 10)).filter(Boolean)
                : [];
            const next = existing.filter((x) => x !== rid);
            try {
                await apiSetRelatesTo(todo.id, next);
                await refreshTodoDetail(todo.id);
            } catch (e) {
                console.error('Remove related todo failed:', e);
                alert('Failed to remove related todo: ' + (e.message || e));
            }
        });
    });

    // Attachments: upload/delete
    const uploadBtn = document.getElementById('ttAttachUploadBtn');
    if (uploadBtn && !uploadBtn._ttBound) {
        uploadBtn._ttBound = true;
        uploadBtn.addEventListener('click', async () => {
            const input = document.getElementById('ttAttachFileInput');
            const file = input && input.files && input.files[0] ? input.files[0] : null;
            if (!file) {
                alert('Choose a file first.');
                return;
            }
            try {
                uploadBtn.disabled = true;
                await apiUploadAttachment(todo.id, file);
                try { input.value = ''; } catch (e) {}
                await refreshTodoDetail(todo.id);
            } catch (e) {
                console.error('Upload attachment failed:', e);
                alert('Failed to upload attachment: ' + (e.message || e));
            } finally {
                uploadBtn.disabled = false;
            }
        });
    }

    document.querySelectorAll('[data-tt-att-delete]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const aid = parseInt(btn.getAttribute('data-tt-att-delete'), 10);
            if (!aid) return;
            if (!confirm('Delete this attachment?')) return;
            try {
                await apiDeleteAttachment(aid);
                await refreshTodoDetail(todo.id);
            } catch (e) {
                console.error('Delete attachment failed:', e);
                alert('Failed to delete attachment: ' + (e.message || e));
            }
        });
    });

    // Dependency add
    const addBtn = document.getElementById('ttAddDepBtn');
    if (addBtn && !addBtn._ttBound) {
        addBtn._ttBound = true;
        addBtn.addEventListener('click', async () => {
            const sel = document.getElementById('ttAddDepSelect');
            const dependsOnId = sel ? parseInt(sel.value, 10) : NaN;
            if (!dependsOnId) return;
            try {
                await apiAddDependency(todo.id, dependsOnId);
                await refreshTodoDetail(todo.id);
            } catch (e) {
                console.error('Add dependency failed:', e);
                alert('Failed to add dependency: ' + (e.message || e));
            }
        });
    }

    // Dependency remove
    document.querySelectorAll('[data-tt-dep-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const depId = parseInt(btn.getAttribute('data-tt-dep-delete'), 10);
            if (!depId) return;
            if (!confirm('Remove this dependency?')) return;
            try {
                await apiDeleteDependency(depId);
                await refreshTodoDetail(todo.id);
            } catch (e) {
                console.error('Delete dependency failed:', e);
                alert('Failed to remove dependency: ' + (e.message || e));
            }
        });
    });

    // Render markdown
    document.querySelectorAll('.markdown-render').forEach(el => {
        renderMarkdown(el);
    });
}

function syncBrowserSelection(selectedTodoId) {
    const list = document.getElementById('ttTodoBrowserList');
    if (!list) return;
    list.querySelectorAll('calcite-list-item').forEach((item) => {
        const id = parseInt(item.value, 10);
        if (selectedTodoId && id === selectedTodoId) item.setAttribute('selected', '');
        else item.removeAttribute('selected');
    });
}

function _truncate(s, n) {
    if (!s) return '';
    const t = String(s);
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function flattenTodos(todos) {
    const out = [];
    const walk = (arr) => {
        for (const x of arr || []) {
            out.push(x);
            if (x.children && x.children.length) walk(x.children);
        }
    };
    walk(todos || []);
    return out;
}

function ttCountSubtasks(todo) {
    // Count all descendants (not just direct children).
    let n = 0;
    const walk = (t) => {
        const kids = (t && Array.isArray(t.children)) ? t.children : [];
        for (const c of kids) {
            n += 1;
            walk(c);
        }
    };
    walk(todo || {});
    return n;
}

function ttFlattenWithDepth(todos, depth = 0, out = []) {
    const arr = Array.isArray(todos) ? todos : [];
    for (const t of arr) {
        out.push({ todo: t, depth: depth || 0 });
        const kids = Array.isArray(t && t.children) ? t.children : [];
        if (kids.length) ttFlattenWithDepth(kids, (depth || 0) + 1, out);
    }
    return out;
}

function ttRenderSubtasksPreviewHTML(todo, maxItems = 6) {
    const max = Math.max(0, parseInt(String(maxItems || 0), 10) || 0);
    if (!max) return '';
    const items = [];
    const all = ttFlattenWithDepth((todo && todo.children) ? todo.children : [], 1, []);
    for (const row of all) {
        if (items.length >= max) break;
        const t = row.todo || {};
        const depth = row.depth || 0;
        const id = parseInt(String(t.id || ''), 10) || 0;
        if (!id) continue;
        const title = escapeHtml(_truncate(String(t.title || ''), 70));
        const pad = Math.min(48, (depth - 1) * 14); // cap indent so cards stay readable
        items.push(`
            <div class="tt-subtask-line" style="padding-inline-start: ${pad}px">
                <calcite-link href="/todos/${id}" onclick="event.preventDefault(); event.stopPropagation(); router.navigate('/todos/${id}');">${title}</calcite-link>
            </div>
        `);
    }
    const remaining = Math.max(0, all.length - items.length);
    const more = remaining ? `<div class="tt-subtask-more">… +${remaining} more</div>` : '';
    return `
        <div class="tt-subtasks-preview">
            <div class="tt-subtasks-preview-title text-xs text-color-3">Subtasks</div>
            ${items.join('')}
            ${more}
        </div>
    `;
}

function ttFindTodoInTree(todos, todoId) {
    const idNum = parseInt(String(todoId || ''), 10) || 0;
    if (!idNum) return null;
    const walk = (arr) => {
        for (const t of arr || []) {
            if (!t) continue;
            if (parseInt(String(t.id || ''), 10) === idNum) return t;
            const kids = Array.isArray(t.children) ? t.children : [];
            if (kids.length) {
                const found = walk(kids);
                if (found) return found;
            }
        }
        return null;
    };
    return walk(Array.isArray(todos) ? todos : []);
}

function ttRenderSubtaskListItemsHTML(children) {
    const items = [];
    for (const t of (Array.isArray(children) ? children : [])) {
        const id = parseInt(String(t && t.id != null ? t.id : ''), 10) || 0;
        if (!id) continue;
        const label = `#${id} - ${escapeHtml(_truncate(String(t.title || ''), 90))}`;
        const desc = escapeHtml(_truncate(String(t.description || ''), 120));
        const status = escapeHtml(replaceUnderscores(String(t.status || '')));
        const subCount = ttCountSubtasks(t);
        items.push(`
            <calcite-list-item value="${id}" label="${label}" description="${desc}">
                <calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${status || ''}</calcite-chip>
                ${subCount > 0 ? `<calcite-chip slot="actions-end" scale="s" appearance="outline" class="tt-subtasks-chip">Subtasks (${subCount})</calcite-chip>` : ''}
                <calcite-button slot="actions-end" appearance="transparent" scale="s" icon-start="launch"
                    onclick="event.stopPropagation(); router.navigate('/todo/${id}')">Open</calcite-button>
                ${Array.isArray(t.children) && t.children.length ? ttRenderSubtaskListItemsHTML(t.children) : ''}
            </calcite-list-item>
        `);
    }
    return items.join('');
}

function renderMainTodosListItemsHTML(todos, opts) {
    const o = opts || {};
    const showStatus = o.showStatus !== false;
    const showDescription = o.showDescription !== false;

    const items = [];
    for (const t of (Array.isArray(todos) ? todos : [])) {
        const label = escapeHtml(t.title || '');
        const desc = showDescription ? escapeHtml(_truncate(t.description || '', 140)) : '';
        const metaParts = [`#${t.id}`];
        if (showStatus) metaParts.push(replaceUnderscores(t.status));
        const meta = metaParts.join(' · ');
        const subCount = ttCountSubtasks(t);

        items.push(`
            <calcite-list-item value="${t.id}" label="${label}" description="${desc}" metadata="${escapeHtml(meta)}">
                ${showStatus ? `<calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                ${subCount > 0 ? `<calcite-chip slot="actions-end" scale="s" appearance="outline" class="tt-subtasks-chip">Subtasks (${subCount})</calcite-chip>` : ''}
                <div slot="content" class="tt-main-list-content min-w-0">
                    <div class="tt-main-todo-title truncate">${label}</div>
                    ${showDescription ? `<div class="text-xs text-color-3 truncate">${desc || ''}</div>` : ''}
                </div>
                ${Array.isArray(t.children) && t.children.length ? renderMainTodosListItemsHTML(t.children, o) : ''}
            </calcite-list-item>
        `);
    }
    return items.join('');
}

function renderTodosGridCardsHTML(flatTodos) {
    const settings = ttGetSettings();
    const cfg = (settings && settings.todos && settings.todos.list) ? settings.todos.list : {};
    const subtasksEnabled = !settings || !settings.features ? true : (settings.features.subtasks_enabled !== false);
    const showStatus = cfg.status !== false;
    const showCategory = cfg.category !== false;
    const showQueue = cfg.queue !== false;
    const showPriority = cfg.priority_class !== false;
    const showTaskSize = cfg.task_size !== false;
    const showTopic = cfg.topic !== false;
    const showTags = cfg.tags !== false;
    const showDescription = cfg.description !== false;

    const flat = Array.isArray(flatTodos) ? flatTodos : [];
    if (!flat.length) return '';

    return flat.map((t) => {
        const title = escapeHtml(t.title || '');
        const desc = showDescription ? escapeHtml(_truncate(t.description || '', 140)) : '';
        const status = escapeHtml(t.status || '');
        const category = escapeHtml(t.category || '');
        const subCount = subtasksEnabled ? ttCountSubtasks(t) : 0;
        const metaParts = [`#${t.id}`];
        if (showStatus) metaParts.push(replaceUnderscores(t.status));
        const meta = metaParts.join(' · ');

        const topic = (showTopic && t.topic)
            ? `<calcite-chip appearance="outline" scale="s" icon-start="folder" class="tt-topic-chip">${escapeHtml(t.topic)}</calcite-chip>`
            : '';
        const tags = (showTags && Array.isArray(t.tags))
            ? t.tags.slice(0, 3).map((x) => `<calcite-chip appearance="outline" scale="s">🏷️ ${escapeHtml(x.name || '')}</calcite-chip>`).join('')
            : '';

        const queueChip = (showQueue && t.queue && t.queue > 0)
            ? `<calcite-chip appearance="solid" scale="s" color="blue">⏯️ Queue ${escapeHtml(String(t.queue))}</calcite-chip>`
            : '';
        const priorityChip = (showPriority && t.priority_class)
            ? `<calcite-chip appearance="solid" scale="s" color="orange">🔺 Priority ${escapeHtml(String(t.priority_class))}</calcite-chip>`
            : '';
        const sizeChip = (showTaskSize && t.task_size)
            ? `<calcite-chip appearance="outline" scale="s">📏 Size ${escapeHtml(String(t.task_size))}/5</calcite-chip>`
            : '';

        return `
            <calcite-card class="cursor-pointer tt-hover-card tt-todo-grid-card" onclick="router.navigate('/todo/${t.id}')">
                <div slot="title" class="tt-main-todo-title truncate">${title}</div>
                <div slot="subtitle" class="text-xs text-color-3">${escapeHtml(meta)}</div>
                <div class="space-y-2">
                    <div class="flex items-center flex-wrap gap-1.5">
                        ${showStatus ? `<calcite-chip appearance="solid" scale="s" class="status-${status}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                        ${showCategory ? `<calcite-chip appearance="outline" scale="s" class="category-${category}">${category}</calcite-chip>` : ''}
                        ${queueChip}
                        ${priorityChip}
                        ${sizeChip}
                        ${topic}
                    </div>
                    ${showDescription ? `<div class="text-sm text-color-2">${desc || 'No description'}</div>` : ''}
                    ${tags ? `<div class="flex items-center flex-wrap gap-1.5">${tags}</div>` : ''}
                    ${subCount > 0 ? ttRenderSubtasksPreviewHTML(t, 6) : ''}
                </div>
                ${subCount > 0 ? `<calcite-badge class="tt-subtasks-badge" scale="s" color="blue">Subtasks (${subCount})</calcite-badge>` : ''}
            </calcite-card>
        `;
    }).join('');
}

function renderTodosGridHTML(todos) {
    const flat = flattenTodos(todos || []);
    if (!flat.length) {
        return `
            <calcite-card>
                <div slot="title">Todos</div>
                <div class="text-color-2">No todos match the current filters.</div>
            </calcite-card>
        `;
    }
    return `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${renderTodosGridCardsHTML(flat)}</div>`;
}

function renderMainTodosHTML(todosTree, options) {
    const settings = ttGetSettings();
    const cfg = (settings && settings.todos && settings.todos.list) ? settings.todos.list : {};
    const subtasksEnabled = !settings || !settings.features ? true : (settings.features.subtasks_enabled !== false);
    const showStatus = cfg.status !== false;
    const showCategory = cfg.category !== false;
    const showQueue = cfg.queue !== false;
    const showPriority = cfg.priority_class !== false;
    const showTaskSize = cfg.task_size !== false;
    const showTopic = cfg.topic !== false;
    const showTags = cfg.tags !== false;
    const showDescription = cfg.description !== false;
    const showTimestamps = cfg.timestamps !== false;

    const o = options || {};
    const view = (o.view === 'list' || o.view === 'table') ? o.view : 'grid';

    // IMPORTANT: main listing should only show root todos as top-level items.
    // Subtasks are rendered inline/nested under their parent.
    const rootTodos = subtasksEnabled
        ? (Array.isArray(todosTree) ? todosTree : [])
        : flattenTodos(todosTree || []);
    const totalItems = rootTodos.length;
    const pageSize = clampInt(o.pageSize, 24, 5, 200);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, clampInt(o.page, 1, 1, 999999)), totalPages);
    const startIdx = (page - 1) * pageSize;
    const pageItems = rootTodos.slice(startIdx, startIdx + pageSize);
    const startItem = totalItems ? (startIdx + 1) : 1;

    let body = '';
    if (!pageItems.length) {
        body = `<calcite-card><div slot="title">Todos</div><div class="text-color-2">No todos match the current filters.</div></calcite-card>`;
    } else if (view === 'grid') {
        body = `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${renderTodosGridCardsHTML(pageItems)}</div>`;
    } else if (view === 'list') {
        if (subtasksEnabled) {
            const items = renderMainTodosListItemsHTML(pageItems, { showStatus, showDescription });
            body = `<calcite-list id="ttMainTodosList" display-mode="nested" selection-mode="single" selection-appearance="highlight">${items}</calcite-list>`;
        } else {
            const items = pageItems.map((t) => {
                const label = escapeHtml(t.title || '');
                const desc = showDescription ? escapeHtml(_truncate(t.description || '', 140)) : '';
                const metaParts = [`#${t.id}`];
                if (showStatus) metaParts.push(replaceUnderscores(t.status));
                const meta = metaParts.join(' · ');
                return `
                    <calcite-list-item value="${t.id}" label="${label}" description="${desc}" metadata="${escapeHtml(meta)}">
                        ${showStatus ? `<calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                        <div slot="content" class="tt-main-list-content min-w-0">
                            <div class="tt-main-todo-title truncate">${label}</div>
                            ${showDescription ? `<div class="text-xs text-color-3 truncate">${desc || ''}</div>` : ''}
                        </div>
                    </calcite-list-item>
                `;
            }).join('');
            body = `<calcite-list id="ttMainTodosList" selection-mode="single" selection-appearance="highlight">${items}</calcite-list>`;
        }
    } else {
        const headerCells = [
            `<calcite-table-header heading="ID" alignment="end"></calcite-table-header>`,
            `<calcite-table-header heading="Title"></calcite-table-header>`,
            subtasksEnabled ? `<calcite-table-header heading="Subtasks" alignment="end"></calcite-table-header>` : '',
            showStatus ? `<calcite-table-header heading="Status"></calcite-table-header>` : '',
            showCategory ? `<calcite-table-header heading="Category"></calcite-table-header>` : '',
            showQueue ? `<calcite-table-header heading="Queue" alignment="end"></calcite-table-header>` : '',
            showPriority ? `<calcite-table-header heading="Priority"></calcite-table-header>` : '',
            showTaskSize ? `<calcite-table-header heading="Size" alignment="end"></calcite-table-header>` : '',
            showTopic ? `<calcite-table-header heading="Topic"></calcite-table-header>` : '',
            showTags ? `<calcite-table-header heading="Tags"></calcite-table-header>` : '',
            showDescription ? `<calcite-table-header heading="Description"></calcite-table-header>` : '',
            showTimestamps ? `<calcite-table-header heading="Updated"></calcite-table-header>` : '',
        ].filter(Boolean).join('');

        const ordered = subtasksEnabled ? ttFlattenWithDepth(pageItems, 0, []) : pageItems.map((t) => ({ todo: t, depth: 0 }));
        const rows = ordered.map((row) => {
            const t = row.todo || {};
            const depth = subtasksEnabled ? (row.depth || 0) : 0;
            const title = escapeHtml(_truncate(t.title || '', 80));
            const statusText = escapeHtml(replaceUnderscores(t.status || ''));
            const cat = escapeHtml(t.category || '');
            const queue = escapeHtml(String(t.queue || 0));
            const pri = escapeHtml(String(t.priority_class || ''));
            const size = escapeHtml(String(t.task_size || ''));
            const topic = escapeHtml(String(t.topic || ''));
            const tagsCsv = Array.isArray(t.tags) ? escapeHtml(t.tags.map((x) => x && x.name ? x.name : '').filter(Boolean).join(', ')) : '';
            const desc = escapeHtml(_truncate(t.description || '', 120));
            const updated = escapeHtml(formatDate(t.updated_at || t.created_at || ''));
            const subCount = subtasksEnabled ? ttCountSubtasks(t) : 0;
            const pad = subtasksEnabled ? Math.min(64, depth * 16) : 0;
            const titleCell = `<calcite-table-cell><span class="tt-table-title" style="padding-inline-start: ${pad}px">${subtasksEnabled && depth ? '↳ ' : ''}${title}</span></calcite-table-cell>`;
            const subtasksCell = subtasksEnabled
                ? `<calcite-table-cell alignment="end">${subCount > 0 ? `<calcite-badge scale="s" color="blue">Subtasks (${subCount})</calcite-badge>` : '—'}</calcite-table-cell>`
                : '';

            const cells = [
                `<calcite-table-cell alignment="end">#${t.id}</calcite-table-cell>`,
                titleCell,
                subtasksCell,
                showStatus ? `<calcite-table-cell><calcite-chip scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${statusText}</calcite-chip></calcite-table-cell>` : '',
                showCategory ? `<calcite-table-cell>${cat}</calcite-table-cell>` : '',
                showQueue ? `<calcite-table-cell alignment="end">${queue}</calcite-table-cell>` : '',
                showPriority ? `<calcite-table-cell>${pri || '—'}</calcite-table-cell>` : '',
                showTaskSize ? `<calcite-table-cell alignment="end">${size || '—'}</calcite-table-cell>` : '',
                showTopic ? `<calcite-table-cell>${topic || '—'}</calcite-table-cell>` : '',
                showTags ? `<calcite-table-cell>${tagsCsv || '—'}</calcite-table-cell>` : '',
                showDescription ? `<calcite-table-cell>${desc || '—'}</calcite-table-cell>` : '',
                showTimestamps ? `<calcite-table-cell>${updated}</calcite-table-cell>` : '',
            ].filter(Boolean).join('');

            return `
                <calcite-table-row data-tt-todo-id="${t.id}" class="tt-main-table-row">
                    ${cells}
                </calcite-table-row>
            `;
        }).join('');
        body = `
            <calcite-table bordered striped caption="Todos">
                <calcite-table-row slot="table-header">
                    ${headerCells}
                </calcite-table-row>
                ${rows}
            </calcite-table>
        `;
    }

    return `
        <div class="space-y-3">
            <div class="flex items-center gap-3">
                <calcite-segmented-control id="ttMainViewModeSeg" scale="s" value="${escapeHtml(view)}">
                    <calcite-segmented-control-item value="grid" ${view === 'grid' ? 'checked' : ''}>Grid</calcite-segmented-control-item>
                    <calcite-segmented-control-item value="list" ${view === 'list' ? 'checked' : ''}>List</calcite-segmented-control-item>
                    <calcite-segmented-control-item value="table" ${view === 'table' ? 'checked' : ''}>Table</calcite-segmented-control-item>
                </calcite-segmented-control>
                <div class="min-w-0">
                    <div class="text-xs text-color-3">Showing ${totalItems ? startIdx + 1 : 0}-${Math.min(startIdx + pageItems.length, totalItems)} of ${totalItems}</div>
                </div>
            </div>

            ${body}

            <calcite-pagination id="ttMainPagination" scale="m" total-items="${totalItems}" page-size="${pageSize}" start-item="${startItem}"></calcite-pagination>
        </div>
    `;
}

function renderTodoBrowserPanelHTML(todos, stats) {
    return `
        <div class="space-y-3 tt-browser-panel">
            <div class="flex items-center gap-2">
                <calcite-button id="ttLeftPanelToggleBtn" appearance="transparent" scale="s" kind="neutral" title="Minimize/expand left panel" icon-start="chevrons-left"></calcite-button>
            </div>

            <calcite-list id="ttTodoBrowserList" display-mode="nested" selection-mode="single" selection-appearance="highlight">
                ${renderTodoBrowserListItemsHTML(todos || [])}
            </calcite-list>
        </div>
    `;
}

function renderTodoBrowserListItemsHTML(todos) {
    const settings = ttGetSettings();
    const cfg = (settings && settings.todos && settings.todos.list) ? settings.todos.list : {};
    const showStatus = cfg.status !== false;
    const showDescription = cfg.description !== false;
    const showCategory = cfg.category !== false;
    const showQueue = cfg.queue !== false;
    const showPriority = cfg.priority_class !== false;
    const showTaskSize = cfg.task_size !== false;
    const showTopic = cfg.topic !== false;
    const showTags = cfg.tags !== false;

    const items = [];
    for (const t of todos) {
        const id = escapeHtml(String(t.id ?? ''));
        const label = escapeHtml(t.title || '');
        const desc = showDescription ? escapeHtml(_truncate(t.description || '', 120)) : '';
        const metaParts = [`#${t.id}`];
        if (showStatus) metaParts.push(replaceUnderscores(t.status));
        if (showCategory && t.category) metaParts.push(String(t.category));
        if (showQueue && t.queue && t.queue > 0) metaParts.push(`Queue ${t.queue}`);
        if (showPriority && t.priority_class) metaParts.push(`Priority ${t.priority_class}`);
        if (showTaskSize && t.task_size) metaParts.push(`Size ${t.task_size}/5`);
        if (showTopic && t.topic) metaParts.push(`Topic ${t.topic}`);
        if (showTags && Array.isArray(t.tags) && t.tags.length) metaParts.push(`Tags ${t.tags.length}`);
        const meta = metaParts.join(' · ');
        items.push(`
            <calcite-list-item value="${t.id}" label="${label}" description="${desc}" metadata="${escapeHtml(meta)}">
                ${showStatus ? `<calcite-chip slot="content-start" scale="s" appearance="solid" class="tt-browser-status-chip tt-browser-status-chip--side status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                <div slot="content" class="tt-browser-item-content min-w-0">
                    ${showStatus ? `<calcite-chip scale="s" appearance="solid" class="tt-browser-status-chip tt-browser-status-chip--top status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                    <div class="tt-browser-item-title font-bold">
                        <span class="tt-browser-item-title-text">${label}</span>
                        <span class="tt-browser-item-id text-color-3">#${id}</span>
                        </div>
                    ${showDescription ? `<div class="tt-browser-item-desc text-xs text-color-3">${desc || ''}</div>` : ''}
                </div>
                ${Array.isArray(t.children) && t.children.length ? renderTodoBrowserListItemsHTML(t.children) : ''}
            </calcite-list-item>
        `);
    }
    return items.join('');
}

function renderTodoDetailPanelHTML(todoDetail) {
    const t = todoDetail || {};
    const settings = ttGetSettings();
    const cfg = (settings && settings.todos && settings.todos.detail) ? settings.todos.detail : {};
    const subtasksEnabled = !settings || !settings.features ? true : (settings.features.subtasks_enabled !== false);
    const showStatus = cfg.status !== false;
    const showCategory = cfg.category !== false;
    const showQueue = cfg.queue !== false;
    const showPriority = cfg.priority_class !== false;
    const showTaskSize = cfg.task_size !== false;
    const showTopic = cfg.topic !== false;
    const showTags = cfg.tags !== false;
    const showDescription = cfg.description !== false;
    const showProgress = cfg.progress !== false;
    const showTimestamps = cfg.timestamps !== false;
    const showNotes = cfg.notes !== false;
    const showDependencies = cfg.dependencies !== false;
    const showRelatesTo = cfg.relates_to !== false;
    const showAttachments = cfg.attachments !== false;
    const showCompletionPct = cfg.completion_percentage !== false;
    const showAi = cfg.ai_instructions !== false;

    const tagsCsv = (t.tags || []).map((x) => x.name).join(', ');
    const depsMet = !!t.dependencies_met;
    const depsChip = depsMet
        ? `<calcite-chip appearance="solid" scale="s" color="green">Ready</calcite-chip>`
        : `<calcite-chip appearance="solid" scale="s" color="red">Blocked</calcite-chip>`;

    const allTodos = (window.ttAllTodosCache || []);
    const flat = (function flatten(list) {
        const out = [];
        const walk = (arr) => {
            for (const x of arr || []) {
                out.push(x);
                if (x.children && x.children.length) walk(x.children);
            }
        };
        walk(list);
        return out;
    })(allTodos);
    const depOptions = flat
        .filter((x) => x.id !== t.id)
        .map((x) => `<calcite-option value="${x.id}">#${x.id} - ${escapeHtml(_truncate(x.title || '', 80))}</calcite-option>`)
        .join('');

    const prereqRows = (t.dependencies || []).map((d) => {
        const depTodo = d.depends_on || {};
        return `
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <div class="text-sm font-medium truncate">#${depTodo.id || d.depends_on_id} - ${escapeHtml(depTodo.title || ('Todo #' + d.depends_on_id))}</div>
                    <div class="text-xs text-color-3">${escapeHtml(replaceUnderscores(depTodo.status || ''))}</div>
                </div>
                <div class="flex items-center gap-2">
                    <calcite-chip appearance="outline" scale="s">${escapeHtml(replaceUnderscores(depTodo.status || ''))}</calcite-chip>
                    <calcite-button appearance="outline" kind="danger" scale="s" data-tt-dep-delete="${d.id}">Remove</calcite-button>
                </div>
            </div>
        `;
    }).join('');

    const dependentRows = (t.dependents || []).map((d) => {
        const depTodo = d.todo || {};
        const id = depTodo.id || d.todo_id;
        return `
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <div class="text-sm font-medium truncate">#${id} - ${escapeHtml(depTodo.title || ('Todo #' + id))}</div>
                    <div class="text-xs text-color-3">${escapeHtml(replaceUnderscores(depTodo.status || ''))}</div>
                </div>
                <calcite-button appearance="outline" scale="s" onclick="router.navigate('/todo/${id}')">Open</calcite-button>
            </div>
        `;
    }).join('');

    const completion = (t.completion_percentage == null) ? '' : String(t.completion_percentage);
    const ai = (t.ai_instructions && typeof t.ai_instructions === 'object') ? t.ai_instructions : {};
    const researchOnWeb = !!ai.research_on_web;

    const relatesToRows = (t.relates_to || []).map((rt) => {
        const rid = parseInt(String(rt && rt.id != null ? rt.id : ''), 10) || 0;
        if (!rid) return '';
        const label = `#${rid} - ${escapeHtml(String(rt.title || ''))}`;
        const meta = `${escapeHtml(replaceUnderscores(String(rt.status || '')))} · ${escapeHtml(String(rt.category || ''))}`;
        return `
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <div class="text-sm font-medium truncate">${label}</div>
                    <div class="text-xs text-color-3">${meta}</div>
                </div>
                <div class="flex items-center gap-2">
                    <calcite-button appearance="outline" scale="s" onclick="router.navigate('/todo/${rid}')">Open</calcite-button>
                    <calcite-button appearance="outline" kind="danger" scale="s" data-tt-rel-remove="${rid}">Remove</calcite-button>
                </div>
            </div>
        `;
    }).join('');

    const attachmentRows = (t.attachments || []).map((a) => {
        const aid = parseInt(String(a && a.id != null ? a.id : ''), 10) || 0;
        if (!aid) return '';
        const name = escapeHtml(String(a.file_name || 'attachment'));
        const size = (a.file_size != null) ? `${escapeHtml(String(a.file_size))} bytes` : '';
        const when = a.uploaded_at ? escapeHtml(formatDate(a.uploaded_at)) : '';
        const meta = [size, when].filter(Boolean).join(' · ');
        return `
            <calcite-list-item value="${aid}" label="${name}" description="${meta}">
                <calcite-button slot="actions-end" appearance="transparent" scale="s" icon-start="download"
                    onclick="event.stopPropagation(); window.open('/api/attachments/${aid}/download', '_blank')">Download</calcite-button>
                <calcite-button slot="actions-end" appearance="transparent" kind="danger" scale="s" icon-start="trash"
                    data-tt-att-delete="${aid}">Delete</calcite-button>
            </calcite-list-item>
        `;
    }).join('');

    const titleMeta = (function () {
        const parts = [`Todo #${t.id}`];
        if (showTimestamps) {
            parts.push(`Created: ${escapeHtml(formatDate(t.created_at))}`);
            if (t.updated_at && t.updated_at !== t.created_at) parts.push(`Updated: ${escapeHtml(formatDate(t.updated_at))}`);
        }
        return parts.join(' · ');
    })();

    const topFields = [
        showStatus ? `
            <calcite-label>
                Status
                <calcite-select data-tt-field="status" data-tt-todo-id="${t.id}">
                    <calcite-option value="pending" ${t.status === 'pending' ? 'selected' : ''}>pending</calcite-option>
                    <calcite-option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>in_progress</calcite-option>
                    <calcite-option value="completed" ${t.status === 'completed' ? 'selected' : ''}>completed</calcite-option>
                    <calcite-option value="cancelled" ${t.status === 'cancelled' ? 'selected' : ''}>cancelled</calcite-option>
                </calcite-select>
            </calcite-label>
        ` : '',
        showCategory ? `
            <calcite-label>
                Category
                <calcite-select data-tt-field="category" data-tt-todo-id="${t.id}">
                    <calcite-option value="feature" ${t.category === 'feature' ? 'selected' : ''}>feature</calcite-option>
                    <calcite-option value="issue" ${t.category === 'issue' ? 'selected' : ''}>issue</calcite-option>
                    <calcite-option value="bug" ${t.category === 'bug' ? 'selected' : ''}>bug</calcite-option>
                </calcite-select>
            </calcite-label>
        ` : '',
        showTopic ? `
            <calcite-label>
                Topic
                <calcite-input data-tt-field="topic" data-tt-todo-id="${t.id}" value="${escapeHtml(t.topic || '')}"></calcite-input>
            </calcite-label>
        ` : '',
    ].filter(Boolean).join('');

    const infoFields = [
        showQueue ? `
            <calcite-label>
                Queue Position
                <calcite-input type="number" min="0" data-tt-field="queue" data-tt-todo-id="${t.id}" value="${escapeHtml(String(t.queue || 0))}"></calcite-input>
            </calcite-label>
        ` : '',
        showPriority ? `
            <calcite-label>
                Priority Class
                <calcite-select data-tt-field="priority_class" data-tt-todo-id="${t.id}">
                    <calcite-option value="" ${!t.priority_class ? 'selected' : ''}></calcite-option>
                    <calcite-option value="A" ${t.priority_class === 'A' ? 'selected' : ''}>A</calcite-option>
                    <calcite-option value="B" ${t.priority_class === 'B' ? 'selected' : ''}>B</calcite-option>
                    <calcite-option value="C" ${t.priority_class === 'C' ? 'selected' : ''}>C</calcite-option>
                    <calcite-option value="D" ${t.priority_class === 'D' ? 'selected' : ''}>D</calcite-option>
                    <calcite-option value="E" ${t.priority_class === 'E' ? 'selected' : ''}>E</calcite-option>
                </calcite-select>
            </calcite-label>
        ` : '',
        showTaskSize ? `
            <calcite-label>
                Task Size (1-5)
                <calcite-input type="number" min="1" max="5" data-tt-field="task_size" data-tt-todo-id="${t.id}" value="${escapeHtml(t.task_size == null ? '' : String(t.task_size))}"></calcite-input>
            </calcite-label>
        ` : '',
    ].filter(Boolean).join('');

    const advancedFields = [
        showCompletionPct ? `
            <calcite-label>
                Completion % (0-100)
                <calcite-input type="number" min="0" max="100" data-tt-field="completion_percentage" data-tt-todo-id="${t.id}" value="${escapeHtml(completion)}"></calcite-input>
            </calcite-label>
        ` : '',
        showAi ? `
            <calcite-label>
                AI: Research on web before completing
                <calcite-switch data-tt-ai-flag="research_on_web" data-tt-todo-id="${t.id}" ${researchOnWeb ? 'checked' : ''}></calcite-switch>
            </calcite-label>
        ` : '',
    ].filter(Boolean).join('');

    const relatesPanel = showRelatesTo ? `
        <calcite-panel>
            <div slot="header">Relates to</div>
            <div class="space-y-3">
                <div class="space-y-2">
                    ${relatesToRows || '<div class="text-xs text-color-3">None</div>'}
                </div>
                <div class="flex items-end gap-2">
                    <calcite-label class="flex-1">
                        Add related todo
                        <calcite-select id="ttAddRelSelect">
                            <calcite-option value=""></calcite-option>
                            ${depOptions}
                        </calcite-select>
                    </calcite-label>
                    <calcite-button id="ttAddRelBtn" appearance="solid">Add</calcite-button>
                </div>
            </div>
        </calcite-panel>
    ` : '';

    const attachmentsPanel = showAttachments ? `
        <calcite-panel>
            <div slot="header">Attachments</div>
            <div class="space-y-3">
                <calcite-label>
                    Upload file
                    <input id="ttAttachFileInput" type="file" />
                </calcite-label>
                <div class="flex items-center gap-2">
                    <calcite-button id="ttAttachUploadBtn" appearance="solid" icon-start="upload">Upload</calcite-button>
                </div>
                <calcite-list id="ttAttachmentsList" selection-mode="none">
                    ${attachmentRows || '<calcite-list-item label="No attachments"></calcite-list-item>'}
                </calcite-list>
            </div>
        </calcite-panel>
    ` : '';

    const progressBlock = showProgress ? `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <calcite-label>
                ✅ Work Completed
            <tt-md-editor data-tt-field="work_completed" data-tt-todo-id="${t.id}" height="220px" placeholder="Work completed (Markdown)"></tt-md-editor>
            </calcite-label>
            <calcite-label>
                📋 Work Remaining
            <tt-md-editor data-tt-field="work_remaining" data-tt-todo-id="${t.id}" height="220px" placeholder="Work remaining (Markdown)"></tt-md-editor>
            </calcite-label>
            <calcite-label>
                ⚠️ Implementation Issues
            <tt-md-editor data-tt-field="implementation_issues" data-tt-todo-id="${t.id}" height="220px" placeholder="Implementation issues (Markdown)"></tt-md-editor>
            </calcite-label>
        </div>
    ` : '';

    const depsPanel = showDependencies ? `
        <calcite-panel>
            <div slot="header">Dependencies</div>
            <div class="space-y-3">
                <div>
                    <div class="text-sm font-semibold mb-2">Prerequisites (${(t.dependencies || []).length})</div>
                    <div class="space-y-2">${prereqRows || '<div class="text-xs text-color-3">None</div>'}</div>
                </div>
                <div class="flex items-end gap-2">
                    <calcite-label class="flex-1">
                        Add prerequisite
                        <calcite-select id="ttAddDepSelect">
                            <calcite-option value=""></calcite-option>
                            ${depOptions}
                        </calcite-select>
                    </calcite-label>
                    <calcite-button id="ttAddDepBtn" appearance="solid">Add</calcite-button>
                </div>
                <div>
                    <div class="text-sm font-semibold mb-2">Dependents (${(t.dependents || []).length})</div>
                    <div class="space-y-2">${dependentRows || '<div class="text-xs text-color-3">None</div>'}</div>
                </div>
            </div>
        </calcite-panel>
    ` : '';

    const notesPanel = showNotes ? `
        <calcite-panel>
            <div slot="header">Notes (${(t.notes || []).length})</div>
            <calcite-button slot="header-actions-end" appearance="solid" scale="s" icon-start="plus"
                onclick="addCreateNoteModal(); (window.ttOpenCreateNoteModal ? window.ttOpenCreateNoteModal({ todoId: ${t.id} }) : (document.getElementById('createNoteModal') && (document.getElementById('createNoteModal').open = true)))">
                Add note
            </calcite-button>
            <div class="space-y-2">
                ${(t.notes && t.notes.length)
                    ? t.notes.map((n) => {
                        const nt = escapeHtml(String(n.note_type || (n.todo_id ? 'attached' : 'project')));
                        const cat = escapeHtml(String(n.category || 'general'));
                        const title = escapeHtml(String((n.title || '')).trim());
                        const header = title ? `<div class="font-semibold text-color-1">${title}</div>` : '';
                        return `<div class="tt-surface p-3 space-y-1"><div class="text-xs text-color-3">${nt} · ${cat}${showTimestamps ? ' · ' + escapeHtml(formatDate(n.created_at)) : ''}</div>${header}<div class="markdown-render">${escapeHtml(n.content || '')}</div></div>`;
                    }).join('')
                    : '<div class="text-xs text-color-3">No notes yet.</div>'
                }
            </div>
        </calcite-panel>
    ` : '';

    const subtasksPanel = subtasksEnabled ? (function () {
        // Subtasks: use cached todo tree so we can render children even though /api/todos/{id}/detail doesn't include them.
        const cachedTree = window.ttAllTodosCache || [];
        const cachedNode = ttFindTodoInTree(cachedTree, t.id);
        const children = (cachedNode && Array.isArray(cachedNode.children)) ? cachedNode.children : [];
        const subtasksCount = ttCountSubtasks(cachedNode || {});
        return `
            <calcite-panel class="tt-subtasks-panel">
                <div slot="header">Subtasks (${subtasksCount})</div>
                <calcite-button slot="header-actions-end" appearance="solid" scale="s" icon-start="plus"
                    onclick="addCreateTodoModal(); (window.ttOpenCreateTodoModal ? window.ttOpenCreateTodoModal({ parentId: ${t.id} }) : (document.getElementById('createModal') && (document.getElementById('createModal').open = true)))">
                    Add subtask
                </calcite-button>
                <div class="space-y-2">
                    ${(children && children.length)
                        ? `<calcite-list display-mode="nested" selection-mode="none">${ttRenderSubtaskListItemsHTML(children)}</calcite-list>`
                        : '<div class="text-xs text-color-3">No subtasks yet.</div>'
                    }
                </div>
            </calcite-panel>
        `;
    })() : '';

    return `
        <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
                <calcite-button appearance="outline" scale="s" onclick="router.navigate('/')">← Back</calcite-button>
                ${depsChip}
            </div>

            <calcite-card>
                <div slot="title" class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <div class="text-xs text-color-3 truncate">
                            ${titleMeta}
                        </div>
                        <calcite-chip id="ttAutosaveChip" appearance="outline" scale="s">Saved</calcite-chip>
                    </div>

                    ${topFields ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${topFields}</div>` : ''}

                    <calcite-input class="tt-title-input" scale="l" data-tt-field="title" data-tt-todo-id="${t.id}" value="${escapeHtml(t.title || '')}"></calcite-input>

                    ${showDescription ? `
                        <calcite-label>
                            Description (markdown)
                            <tt-md-editor data-tt-field="description" data-tt-todo-id="${t.id}" height="320px" placeholder="Description (Markdown)"></tt-md-editor>
                        </calcite-label>
                    ` : ''}
                </div>
                <div class="space-y-3">
                    ${showTags ? `
                        <calcite-label>
                            Tags (comma-separated)
                            <calcite-input class="tt-tags-input" scale="s" data-tt-field="tag_names" data-tt-todo-id="${t.id}" value="${escapeHtml(tagsCsv)}"></calcite-input>
                        </calcite-label>
                    ` : ''}

                    ${infoFields ? `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${infoFields}</div>` : ''}

                    ${advancedFields ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${advancedFields}</div>` : ''}

                    ${relatesPanel}
                    ${attachmentsPanel}
                    ${subtasksPanel}
                    ${progressBlock}
                    ${depsPanel}
                    ${notesPanel}
                </div>
            </calcite-card>
        </div>
    `;
}

async function apiUpdateTodo(todoId, patch) {
    const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {})
    });
    if (!res.ok) {
        let msg = 'Failed to update todo';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function apiUpdateNote(noteId, patch) {
    const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch || {})
    });
    if (!res.ok) {
        let msg = 'Failed to update note';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function apiAddDependency(todoId, dependsOnId) {
    const res = await fetch('/api/dependencies/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todo_id: todoId, depends_on_id: dependsOnId })
    });
    if (!res.ok) {
        let msg = 'Failed to add dependency';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function apiDeleteDependency(depId) {
    const res = await fetch(`/api/dependencies/${depId}`, { method: 'DELETE' });
    if (!res.ok) {
        let msg = 'Failed to delete dependency';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function apiSetRelatesTo(todoId, relatesToIds) {
    const res = await fetch(`/api/todos/${todoId}/relations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relates_to_ids: Array.isArray(relatesToIds) ? relatesToIds : [] })
    });
    if (!res.ok) {
        let msg = 'Failed to update related todos';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function apiUploadAttachment(todoId, file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/todos/${todoId}/attachments`, { method: 'POST', body: fd });
    if (!res.ok) {
        let msg = 'Failed to upload attachment';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function apiDeleteAttachment(attachmentId) {
    const res = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
    if (!res.ok) {
        let msg = 'Failed to delete attachment';
        try {
            const j = await res.json();
            msg = j.detail || j.message || msg;
        } catch (e) {}
        throw new Error(msg);
    }
    return await res.json();
}

async function refreshTodoDetail(todoId) {
    const res = await fetch(`/api/todos/${todoId}/detail`);
    if (!res.ok) return;
    const todo = await res.json();
    const { endPanel, mainView } = getShellTargets();
    const narrow = isNarrowScreen();

    if (narrow) {
        if (endPanel) endPanel.innerHTML = renderTodoDetailPanelHTML(todo);
        openDetailPanel();
    } else {
        collapseDetailPanel();
        if (mainView) mainView.innerHTML = renderTodoDetailPanelHTML(todo);
    }
    syncBrowserSelection(todoId);
    initializeTodoDetailView(todo);
}

/**
 * Notes View
 */
async function renderNotesView() {
    showLoading();

    try {
        setHeaderMode('notes');
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('Failed to fetch notes');
        const notes = await response.json();

        const opts = getNotesRouteOptions();
        const filteredTypeCat = filterNotesByTypeAndCategory(notes, opts.noteType, opts.category);
        const filtered = filterNotesClientSide(filteredTypeCat, opts.searchQuery, opts.filterText);
        window.ttAllNotesCache = notes || [];
        // For attached notes, we want to display "Attached to <todo title>" in the main view.
        try { await ensureTodoTitleIndex(); } catch (e) {}

        // Notes uses master-detail too: list in panel-start, detail in main.
        const { startPanel, startShell, mainView } = getShellTargets();
        if (startShell) startShell.removeAttribute('collapsed');
        if (startPanel) startPanel.innerHTML = renderNotesBrowserPanelHTML(filtered, opts, notes || []);
        syncNotesNavFilters(notes || [], opts);
        collapseDetailPanel();

        const view = mainView || document.getElementById('app-view');
        view.innerHTML = renderMainNotesHTML(filtered, opts);
        syncNotesSelection(null);
        hideLoading();
        
        initializeNotesView();
    } catch (error) {
        console.error('Error loading notes:', error);
        showError('Failed to load notes. Please try again.');
        hideLoading(); // Ensure loader is hidden on error
    }
}

/**
 * Settings View
 */
function ttSettingsSwitchRow(label, description, path) {
    const l = escapeHtml(String(label || ''));
    const d = escapeHtml(String(description || ''));
    const p = escapeHtml(String(path || ''));
    return `
        <calcite-list-item label="${l}" description="${d}">
            <calcite-switch slot="actions-end" data-tt-setting="${p}"></calcite-switch>
        </calcite-list-item>
    `;
}

function renderSettingsViewHTML() {
    // Ensure settings are loaded so layout is applied on first paint.
    const s = ttGetSettings();
    const widthMode = escapeHtml(String((s && s.layout && s.layout.width_mode) || 'full'));

    const layoutTab = `
        <calcite-block-group>
            <calcite-block heading="Layout" description="Tune the SPA shell defaults" open>
                <calcite-label>
                    Content width
                    <calcite-segmented-control scale="s" data-tt-setting="layout.width_mode" value="${widthMode}">
                        <calcite-segmented-control-item value="full">Full width</calcite-segmented-control-item>
                        <calcite-segmented-control-item value="max">Centered (1100px)</calcite-segmented-control-item>
                    </calcite-segmented-control>
                </calcite-label>
                <calcite-notice open kind="info">
                    <div slot="message">Master–detail layout is currently fixed: left browser panel + right/main detail.</div>
                </calcite-notice>
            </calcite-block>
        </calcite-block-group>
    `;

    const todosListTab = `
        <calcite-block-group>
            <calcite-block heading="Todos · List view" description="Browse/list and grid cards" open>
                <calcite-list>
                    ${ttSettingsSwitchRow('Status', 'Show status chips/metadata', 'todos.list.status')}
                    ${ttSettingsSwitchRow('Category', 'Show category chips/metadata', 'todos.list.category')}
                    ${ttSettingsSwitchRow('Queue position', 'Show queue position (where applicable)', 'todos.list.queue')}
                    ${ttSettingsSwitchRow('Priority class', 'Show priority class', 'todos.list.priority_class')}
                    ${ttSettingsSwitchRow('Task size', 'Show task size', 'todos.list.task_size')}
                    ${ttSettingsSwitchRow('Topic', 'Show topic', 'todos.list.topic')}
                    ${ttSettingsSwitchRow('Tags', 'Show tags', 'todos.list.tags')}
                    ${ttSettingsSwitchRow('Description', 'Show description/snippet', 'todos.list.description')}
                    ${ttSettingsSwitchRow('Timestamps', 'Show created/updated timestamps (table/list metadata)', 'todos.list.timestamps')}
                </calcite-list>
            </calcite-block>

            <calcite-block heading="Todos · Detail view" description="Todo inspector/editor fields" open>
                <calcite-list>
                    ${ttSettingsSwitchRow('Status', 'Show status field', 'todos.detail.status')}
                    ${ttSettingsSwitchRow('Category', 'Show category field', 'todos.detail.category')}
                    ${ttSettingsSwitchRow('Queue position', 'Show queue field', 'todos.detail.queue')}
                    ${ttSettingsSwitchRow('Priority class', 'Show priority class field', 'todos.detail.priority_class')}
                    ${ttSettingsSwitchRow('Task size', 'Show task size field', 'todos.detail.task_size')}
                    ${ttSettingsSwitchRow('Topic', 'Show topic field', 'todos.detail.topic')}
                    ${ttSettingsSwitchRow('Tags', 'Show tags field', 'todos.detail.tags')}
                    ${ttSettingsSwitchRow('Description', 'Show description editor', 'todos.detail.description')}
                    ${ttSettingsSwitchRow('Progress fields (work_*)', 'Show work_completed / work_remaining / implementation_issues', 'todos.detail.progress')}
                    ${ttSettingsSwitchRow('Timestamps', 'Show created/updated timestamps in header', 'todos.detail.timestamps')}
                    ${ttSettingsSwitchRow('Notes section', 'Show attached notes section', 'todos.detail.notes')}
                    ${ttSettingsSwitchRow('Dependencies section', 'Show prerequisites + dependents', 'todos.detail.dependencies')}
                </calcite-list>
            </calcite-block>
        </calcite-block-group>
    `;

    const notesTab = `
        <calcite-block-group>
            <calcite-block heading="Notes · List view" description="Notes browser and main listing" open>
                <calcite-list>
                    ${ttSettingsSwitchRow('Type', 'Show note type in metadata', 'notes.list.note_type')}
                    ${ttSettingsSwitchRow('Category', 'Show category in metadata', 'notes.list.category')}
                    ${ttSettingsSwitchRow('Attachment (todo link)', 'Show todo attachment info', 'notes.list.attachment')}
                    ${ttSettingsSwitchRow('Created timestamp', 'Show created timestamp', 'notes.list.created')}
                    ${ttSettingsSwitchRow('Content snippet', 'Show content snippet in list/cards', 'notes.list.snippet')}
                </calcite-list>
            </calcite-block>

            <calcite-block heading="Notes · Detail view" description="Note inspector/editor" open>
                <calcite-list>
                    ${ttSettingsSwitchRow('Metadata', 'Show created/type/category row', 'notes.detail.metadata')}
                    ${ttSettingsSwitchRow('Attachment (todo link)', 'Show attached todo link', 'notes.detail.attachment')}
                </calcite-list>
            </calcite-block>
        </calcite-block-group>
    `;

    const advancedTab = `
        <calcite-block-group>
            <calcite-block heading="Advanced" description="Optional sections and future-facing controls" open>
                <calcite-list>
                    ${ttSettingsSwitchRow('Enable subtasks', 'Allow child todos (subtasks). If off, the UI hides subtasks and MCP tools will refuse parent_id.', 'features.subtasks_enabled')}
                    ${ttSettingsSwitchRow('Completion percentage', 'Show completion percentage field', 'todos.detail.completion_percentage')}
                    ${ttSettingsSwitchRow('AI instructions', 'Show AI instruction toggles', 'todos.detail.ai_instructions')}
                    ${ttSettingsSwitchRow('Relates-to section', 'Show relates-to links section', 'todos.detail.relates_to')}
                    ${ttSettingsSwitchRow('Attachments section', 'Show attachments upload/list section', 'todos.detail.attachments')}
                </calcite-list>
            </calcite-block>
        </calcite-block-group>
    `;

    return `
        <div class="tt-settings-page">
            <calcite-panel heading="Settings" description="Customize layout and visible properties">
                <calcite-button slot="header-actions-start" appearance="outline" scale="s" onclick="router.navigate('/')">Back</calcite-button>
                <calcite-button id="ttSettingsResetBtn" slot="header-actions-end" appearance="outline" scale="s" icon-start="reset">Reset</calcite-button>

                <calcite-tabs bordered scale="m">
                    <calcite-tab-nav slot="title-group">
                        <calcite-tab-title selected>Layout</calcite-tab-title>
                        <calcite-tab-title>Todos</calcite-tab-title>
                        <calcite-tab-title>Notes</calcite-tab-title>
                        <calcite-tab-title>Advanced</calcite-tab-title>
                    </calcite-tab-nav>

                    <calcite-tab selected>${layoutTab}</calcite-tab>
                    <calcite-tab>${todosListTab}</calcite-tab>
                    <calcite-tab>${notesTab}</calcite-tab>
                    <calcite-tab>${advancedTab}</calcite-tab>
                </calcite-tabs>
            </calcite-panel>
        </div>
    `;
}

async function renderSettingsView() {
    showLoading();
    try {
        setHeaderMode('settings');

        // Sync feature flags from project config into local settings (best-effort).
        try {
            const res = await fetch('/api/config/features');
            if (res.ok) {
                const flags = await res.json();
                const merged = ttDeepMerge(ttGetSettings(), {});
                if (flags && typeof flags.subtasks_enabled === 'boolean') {
                    ttSetByPath(merged, 'features.subtasks_enabled', !!flags.subtasks_enabled);
                    ttSaveSettings(merged);
                }
            }
        } catch (e) {}

        // Collapse master-detail panels to focus on settings.
        const { startShell, startPanel, endShell, endPanel, mainView } = getShellTargets();
        if (startShell) startShell.setAttribute('collapsed', '');
        if (startPanel) startPanel.innerHTML = '';
        if (endShell) endShell.setAttribute('collapsed', '');
        if (endPanel) endPanel.innerHTML = '';

        if (mainView) mainView.innerHTML = renderSettingsViewHTML();
        hideLoading();
        initializeSettingsView();
    } catch (e) {
        console.error('Error loading settings view:', e);
        showError('Failed to load settings. Please try again.');
        hideLoading();
    }
}

function initializeSettingsView() {
    initializeHeaderControls();
    // Load + sync settings, then bind controls.
    ttSettingsSyncControls(document);
    ttBindSettingsControls(document);
}

/**
 * Render notes HTML
 */
async function renderNotesHTML(notes) {
    // Ensure templates are registered
    if (!ensureTemplatesRegistered()) {
        console.error('Failed to register templates');
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Templates not loaded</p></div>';
    }
    
    // Access named template correctly using property syntax
    const template = $.templates.notesList || $.templates["notes-list"];
    if (!template) {
        console.error('Template "notes-list" not found');
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error: Template not found</p></div>';
    }
    
    const data = {
        notes: notes || []
    };

    try {
        return template.render(data);
    } catch (error) {
        console.error('Template rendering error:', error);
        return '<div class="text-center py-12"><p class="text-lg text-color-danger">Error rendering template: ' + escapeHtml(error.message) + '</p></div>';
    }
}

/**
 * Initialize notes view
 */
function initializeNotesView() {
    setHeaderMode('notes');
    initializeHeaderControls();
    const opts = getNotesRouteOptions();
    setNavSearchFilterState(opts.searchQuery, opts.filterText);

    // Render markdown
    document.querySelectorAll('.markdown-render').forEach(el => {
        renderMarkdown(el);
    });
    
    // Add create note modal
    addCreateNoteModal();

    // Markdown editing uses Toast UI via <tt-md-editor>.

    // Left panel list selection
    const list = document.getElementById('ttNotesBrowserList');
    if (list && !list._ttBound) {
        list._ttBound = true;
        list.addEventListener('calciteListItemSelect', (e) => {
            const item = e.target;
            if (!item) return;
            const id = parseInt(item.value, 10);
            if (!id) return;
            router.navigate(`/notes/${id}`);
        });
        // Ensure clicks anywhere within a list item select/navigate (including slotted content areas).
        list.addEventListener('click', (e) => {
            try {
                const path = (e && e.composedPath) ? e.composedPath() : [];
                const item = path.find((n) => n && n.tagName === 'CALCITE-LIST-ITEM');
                if (!item) return;
                const id = parseInt(item.value, 10);
                if (!id) return;
                router.navigate(`/notes/${id}`);
            } catch (err) {}
        });
    }

    const typeSeg = document.getElementById('ttNotesTypeSeg');
    if (typeSeg && !typeSeg._ttBound) {
        typeSeg._ttBound = true;
        typeSeg.addEventListener('calciteSegmentedControlChange', () => {
            const v = String(typeSeg.value || 'all');
            navigateNotesWithParamPatch({ note_type: v === 'all' ? '' : v });
        });
    }

    const catBox = document.getElementById('ttNotesCategoryBox');
    if (catBox && !catBox._ttBound) {
        catBox._ttBound = true;
        catBox.addEventListener('calciteComboboxChange', () => {
            let v = catBox.value;
            if (Array.isArray(v)) v = v[0];
            v = String(v || '').trim();
            if (v === '__all__') v = '';
            navigateNotesWithParamPatch({ category: v });
        });
    }

    // Apply navigation-secondary filter text to the notes list
    if (list) {
        const filterText = (document.getElementById('ttNavFilterInput') && document.getElementById('ttNavFilterInput').value) || '';
        try { list.filterText = filterText; } catch (e) {}
    }

    // Main panel list selection
    const mainList = document.getElementById('ttMainNotesList');
    if (mainList && !mainList._ttBound) {
        mainList._ttBound = true;
        mainList.addEventListener('calciteListItemSelect', (e) => {
            const item = e.target;
            if (!item) return;
            const id = parseInt(item.value, 10);
            if (!id) return;
            router.navigate(`/notes/${id}`);
        });
        // Same as left panel: make the full row clickable even when custom slotted content is present.
        mainList.addEventListener('click', (e) => {
            try {
                const path = (e && e.composedPath) ? e.composedPath() : [];
                const item = path.find((n) => n && n.tagName === 'CALCITE-LIST-ITEM');
                if (!item) return;
                const id = parseInt(item.value, 10);
                if (!id) return;
                router.navigate(`/notes/${id}`);
            } catch (err) {}
        });
    }

    // Main panel table row click
    document.querySelectorAll('.tt-main-note-row').forEach((row) => {
        if (row._ttBound) return;
        row._ttBound = true;
        row.addEventListener('click', () => {
            const id = parseInt(row.getAttribute('data-tt-note-id'), 10);
            if (!id) return;
            router.navigate(`/notes/${id}`);
        });
    });

    // Main panel view mode segmented control
    const viewSeg = document.getElementById('ttMainNotesViewModeSeg');
    if (viewSeg && !viewSeg._ttBound) {
        viewSeg._ttBound = true;
        viewSeg.addEventListener('calciteSegmentedControlChange', () => {
            const v = viewSeg.value || 'grid';
            navigateNotesWithParamPatch({ view: v, page: 1 });
        });
    }

    // Main panel pagination
    const pagination = document.getElementById('ttMainNotesPagination');
    if (pagination && !pagination._ttBound) {
        pagination._ttBound = true;
        pagination.addEventListener('calcitePaginationChange', () => {
            const pageSize = parseInt(String(pagination.pageSize || 24), 10) || 24;
            const startItem = parseInt(String(pagination.startItem || 1), 10) || 1;
            const page = Math.max(1, Math.ceil(startItem / pageSize));
            navigateNotesWithParamPatch({ page, page_size: pageSize });
        });
    }
}

function syncNotesSelection(selectedNoteId) {
    const list = document.getElementById('ttNotesBrowserList');
    if (!list) return;
    list.querySelectorAll('calcite-list-item').forEach((item) => {
        const id = parseInt(item.value, 10);
        if (selectedNoteId && id === selectedNoteId) item.setAttribute('selected', '');
        else item.removeAttribute('selected');
    });
}

function _noteSnippet(content, n) {
    const t = String(content || '').trim().replace(/\s+/g, ' ');
    return t.length > n ? (t.slice(0, n - 1) + '…') : t;
}

async function ensureTodoTitleIndex() {
    if (window.ttTodoTitleById && typeof window.ttTodoTitleById === 'object') return window.ttTodoTitleById;
    window.ttTodoTitleById = window.ttTodoTitleById || {};

    // Reuse existing cache if present
    try {
        const src = Array.isArray(window.ttAllTodosCache) ? window.ttAllTodosCache : null;
        if (src && src.length) {
            const map = {};
            const walk = (arr) => {
                for (const t of arr || []) {
                    if (t && t.id != null) map[String(t.id)] = String(t.title || '');
                    if (t.children && t.children.length) walk(t.children);
                }
            };
            walk(src);
            window.ttTodoTitleById = map;
            return map;
        }
    } catch (e) {}

    // Fetch todos once to build id->title mapping for attached notes.
    try {
        const res = await fetch('/api/todos');
        if (!res.ok) return window.ttTodoTitleById;
        const todos = await res.json();
        const map = {};
        const walk = (arr) => {
            for (const t of arr || []) {
                if (t && t.id != null) map[String(t.id)] = String(t.title || '');
                if (t.children && t.children.length) walk(t.children);
            }
        };
        walk(todos || []);
        window.ttTodoTitleById = map;
        return map;
    } catch (e) {
        return window.ttTodoTitleById;
    }
}

function getTodoTitleForNote(note) {
    try {
        const todoId = note && note.todo_id != null ? String(note.todo_id) : '';
        if (!todoId) return '';
        const map = window.ttTodoTitleById || {};
        const title = String(map[todoId] || '').trim();
        return title || `Todo #${todoId}`;
    } catch (e) {
        return '';
    }
}

function renderNotesBrowserPanelHTML(notes, opts, allNotes) {
    const settings = ttGetSettings();
    const cfg = (settings && settings.notes && settings.notes.list) ? settings.notes.list : {};
    const showType = cfg.note_type !== false;
    const showCategory = cfg.category !== false;
    const showAttach = cfg.attachment !== false;
    const showCreated = cfg.created !== false;
    const showSnippet = cfg.snippet !== false;

    const items = (Array.isArray(notes) ? notes : []);
    const o = opts || getNotesRouteOptions();

    const listItems = items.map((n) => {
        const id = escapeHtml(String(n.id || ''));
        const todoIdRaw = n.todo_id != null ? String(n.todo_id) : '';
        const todoId = todoIdRaw ? escapeHtml(todoIdRaw) : '';
        const noteTypeRaw = String(n.note_type || (n.todo_id ? 'attached' : 'project'));
        const categoryRaw = String(n.category || 'general');
        const title = escapeHtml(String((n.title || '')).trim());
        const label = title || `Note #${id}`;
        const metaParts = [`#${id}`];
        if (showType) metaParts.push(noteTypeRaw);
        if (showCategory) metaParts.push(categoryRaw);
        if (showAttach && todoIdRaw) metaParts.push(`Todo #${todoIdRaw}`);
        const meta = metaParts.join(' · ');
        const created = showCreated ? escapeHtml(formatDate(n.created_at)) : '';
        const snippet = showSnippet ? escapeHtml(_noteSnippet(n.content, 140)) : '';
        return `
            <calcite-list-item value="${id}" label="${label}" description="${snippet || (showSnippet ? '—' : '')}" metadata="${escapeHtml([meta, created].filter(Boolean).join(' · '))}"></calcite-list-item>
        `;
    }).join('');

    return `
        <calcite-panel>
            <div slot="header">Notes</div>
            <calcite-list id="ttNotesBrowserList" selection-mode="single" filter-enabled>
                ${listItems || '<calcite-list-item label="No notes" description="Create your first note with New."></calcite-list-item>'}
            </calcite-list>
        </calcite-panel>
    `;
}

function renderMainNotesPlaceholderHTML(notes) {
    const count = Array.isArray(notes) ? notes.length : 0;
    return `
        <calcite-card>
            <div slot="title">Notes</div>
            <div class="text-color-2">Select a note from the left panel to view it here.</div>
            <div class="text-xs text-color-3 mt-2">${count} note(s) match the current filters.</div>
        </calcite-card>
    `;
}

function renderNoteDetailHTML(note) {
    const n = note || {};
    const settings = ttGetSettings();
    const cfg = (settings && settings.notes && settings.notes.detail) ? settings.notes.detail : {};
    const showMeta = cfg.metadata !== false;
    const showAttach = cfg.attachment !== false;
    const showTitle = cfg.title !== false;
    const showCategory = cfg.category !== false;
    const showContent = cfg.content !== false;

    const idNum = parseInt(String(n.id || ''), 10);
    const id = escapeHtml(String(idNum || ''));
    const created = escapeHtml(formatDate(n.created_at));
    const todoId = n.todo_id ? parseInt(String(n.todo_id), 10) : null;
    const noteType = escapeHtml(String(n.note_type || (n.todo_id ? 'attached' : 'project')));
    const category = escapeHtml(String(n.category || 'general'));
    const todoTitle = todoId ? escapeHtml(getTodoTitleForNote(n)) : '';
    const todoAttachRow = (showAttach && todoId)
        ? `<div class="flex items-center gap-2">
                <span class="text-sm text-color-2">Attached to ${todoTitle}</span>
                <calcite-button appearance="outline" scale="s" icon-start="link" onclick="router.navigate('/todo/${todoId}')">
                    Open todo #${todoId}
                </calcite-button>
           </div>`
        : '';
    const subtitle = showMeta ? `Created: ${created} · ${noteType} · ${category}` : '';

    return `
        <calcite-card>
            <div slot="title">${escapeHtml(String((n.title || '')).trim()) || `Note #${id}`}</div>
            ${subtitle ? `<div slot="subtitle" class="text-xs text-color-3">${subtitle}</div>` : ''}
            <div class="space-y-3">
                ${todoAttachRow ? `<div class="flex gap-2">${todoAttachRow}</div>` : ''}
                <div class="flex items-center justify-between gap-2">
                    <calcite-chip id="ttNoteAutosaveChip" appearance="outline" scale="s">Saved</calcite-chip>
                </div>

                ${showTitle ? `
                    <calcite-label>
                        Title
                        <calcite-input data-tt-note-field="title" data-tt-note-id="${idNum || 0}" value="${escapeHtml(String((n.title || '')).trim())}"></calcite-input>
                    </calcite-label>
                ` : ''}

                ${showCategory ? `
                    <calcite-label>
                        Category
                        <calcite-input data-tt-note-field="category" data-tt-note-id="${idNum || 0}" value="${escapeHtml(String(n.category || 'general'))}"></calcite-input>
                    </calcite-label>
                ` : ''}

                ${showContent ? `
                    <calcite-label>
                        Content (Markdown)
                        <tt-md-editor data-tt-note-field="content" data-tt-note-id="${idNum || 0}" height="360px" placeholder="Write a note..."></tt-md-editor>
                    </calcite-label>
                ` : ''}

                <div class="flex gap-2">
                    <calcite-button appearance="solid" kind="danger" scale="s" icon-start="trash" onclick="deleteNote(${idNum || 0})">Delete</calcite-button>
                </div>
            </div>
        </calcite-card>
    `;
}

function initializeNoteDetailView(note) {
    const n = note || {};
    const noteId = parseInt(String(n.id || ''), 10);
    if (!noteId) return;

    const autosaveChip = document.getElementById('ttNoteAutosaveChip');
    const setChip = (txt) => { try { if (autosaveChip) autosaveChip.textContent = txt; } catch (e) {} };
    setChip('Saved');

    window.ttNoteAutosaveState = window.ttNoteAutosaveState || {};
    const getState = (id) => {
        if (!window.ttNoteAutosaveState[id]) window.ttNoteAutosaveState[id] = { timer: null, patch: {} };
        return window.ttNoteAutosaveState[id];
    };

    const flush = async (id) => {
        const state = getState(id);
        const patch = state.patch || {};
        state.patch = {};
        state.timer = null;
        if (!patch || Object.keys(patch).length === 0) return;
        try {
            setChip('Saving…');
            const updated = await apiUpdateNote(id, patch);
            // Keep cache up to date (best effort)
            try {
                const all = Array.isArray(window.ttAllNotesCache) ? window.ttAllNotesCache : [];
                const idx = all.findIndex((x) => parseInt(String(x.id || ''), 10) === id);
                if (idx >= 0) all[idx] = { ...all[idx], ...(updated || {}) };
                window.ttAllNotesCache = all;
            } catch (e) {}
            setChip(`Saved ${new Date().toLocaleTimeString()}`);
        } catch (e) {
            console.error('Note update failed:', e);
            setChip('Save failed');
            alert('Failed to save note changes: ' + (e.message || e));
        }
    };

    const schedule = (id, patch, debounceMs) => {
        const state = getState(id);
        state.patch = { ...(state.patch || {}), ...(patch || {}) };
        if (state.timer) clearTimeout(state.timer);
        setChip('Saving…');
        state.timer = setTimeout(() => flush(id), Math.max(0, debounceMs || 0));
    };

    // Set initial editor content after render (avoid stuffing big markdown into HTML attributes).
    const contentEl = document.querySelector(`tt-md-editor[data-tt-note-field="content"][data-tt-note-id="${noteId}"]`);
    if (contentEl) {
        try { contentEl.value = n.content || ''; } catch (e) {}
    }

    // Bind autosave
    document.querySelectorAll(`[data-tt-note-field][data-tt-note-id="${noteId}"]`).forEach((el) => {
        if (el._ttBoundNoteAutosave) return;
        el._ttBoundNoteAutosave = true;
        const field = el.getAttribute('data-tt-note-field');

        const handler = () => {
            let value = el.value;
            const patch = {};
            if (field === 'content') patch.content = value;
            if (field === 'category') patch.category = value;
            if (field === 'title') patch.title = value;
            if (!Object.keys(patch).length) return;
            schedule(noteId, patch, 450);
        };

        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
        el.addEventListener('calciteInputChange', handler);
    });
}

function renderMainNotesHTML(notes, options) {
    const settings = ttGetSettings();
    const cfg = (settings && settings.notes && settings.notes.list) ? settings.notes.list : {};
    const showType = cfg.note_type !== false;
    const showCategory = cfg.category !== false;
    const showAttach = cfg.attachment !== false;
    const showCreated = cfg.created !== false;
    const showSnippet = cfg.snippet !== false;

    const o = options || {};
    const view = (o.view === 'list' || o.view === 'table') ? o.view : 'grid';
    const itemsAll = Array.isArray(notes) ? notes : [];
    const totalItems = itemsAll.length;
    const pageSize = clampInt(o.pageSize, 24, 5, 200);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, clampInt(o.page, 1, 1, 999999)), totalPages);
    const startIdx = (page - 1) * pageSize;
    const pageItems = itemsAll.slice(startIdx, startIdx + pageSize);
    const startItem = totalItems ? (startIdx + 1) : 1;

    const noteCard = (n) => {
        const idNum = parseInt(String(n.id || ''), 10) || 0;
        const id = escapeHtml(String(idNum));
        const title = escapeHtml(String((n.title || '')).trim());
        const todoIdRaw = n.todo_id != null ? String(n.todo_id) : '';
        const todoId = todoIdRaw ? escapeHtml(todoIdRaw) : '';
        const noteTypeRaw = String(n.note_type || (n.todo_id ? 'attached' : 'project'));
        const categoryRaw = String(n.category || 'general');
        const created = showCreated ? escapeHtml(formatDate(n.created_at)) : '';
        const snippet = showSnippet ? escapeHtml(_noteSnippet(n.content, 160)) : '';
        const metaParts = [`#${id}`];
        if (showType) metaParts.push(noteTypeRaw);
        if (showCategory) metaParts.push(categoryRaw);
        if (showAttach && todoIdRaw) metaParts.push(`Todo #${todoIdRaw}`);
        const meta = metaParts.join(' · ');
        const attachedTitle = (n.todo_id != null) ? escapeHtml(getTodoTitleForNote(n)) : '';
        const attachRow = (showAttach && n.todo_id != null)
            ? `<div class="flex items-center gap-2 mt-2">
                    <span class="text-sm text-color-2">Attached to ${attachedTitle}</span>
                    <calcite-button appearance="outline" scale="s" icon-start="link"
                        onclick="event.stopPropagation(); router.navigate('/todo/${parseInt(String(n.todo_id), 10) || 0}')">
                        Open todo #${escapeHtml(String(n.todo_id))}
                    </calcite-button>
               </div>`
            : '';
        return `
            <calcite-card class="tt-note-card cursor-pointer tt-hover-card" onclick="router.navigate('/notes/${idNum}')">
                <div slot="title">${title || `Note #${id}`}</div>
                <div slot="subtitle" class="text-xs text-color-3">${escapeHtml([meta, created].filter(Boolean).join(' · '))}</div>
                ${showSnippet ? `<div class="text-sm text-color-2">${snippet || '—'}</div>` : ''}
                ${attachRow}
            </calcite-card>
        `;
    };

    let body = '';
    if (!pageItems.length) {
        body = `<calcite-card><div slot="title">Notes</div><div class="text-color-2">No notes match the current filters.</div></calcite-card>`;
    } else if (view === 'grid') {
        body = `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${pageItems.map(noteCard).join('')}</div>`;
    } else if (view === 'list') {
        const rows = pageItems.map((n) => {
            const idNum = parseInt(String(n.id || ''), 10) || 0;
            const todoIdRaw = n.todo_id != null ? String(n.todo_id) : '';
            const todoId = todoIdRaw ? escapeHtml(todoIdRaw) : '';
            const noteTypeRaw = String(n.note_type || (n.todo_id ? 'attached' : 'project'));
            const categoryRaw = String(n.category || 'general');
            const created = showCreated ? escapeHtml(formatDate(n.created_at)) : '';
            const metaParts = [`#${idNum}`];
            if (showType) metaParts.push(noteTypeRaw);
            if (showCategory) metaParts.push(categoryRaw);
            if (showAttach && todoIdRaw) metaParts.push(`Todo #${todoIdRaw}`);
            const meta = metaParts.join(' · ');
            const desc = showSnippet ? escapeHtml(_noteSnippet(n.content, 140)) : '';
            const attachedTitle = (n.todo_id != null) ? escapeHtml(getTodoTitleForNote(n)) : '';
            const attachRow = (showAttach && n.todo_id != null)
                ? `<div class="flex items-center gap-2">
                        <span class="text-sm text-color-2">Attached to ${attachedTitle}</span>
                        <calcite-button appearance="outline" scale="s" icon-start="link"
                            onclick="event.stopPropagation(); router.navigate('/todo/${parseInt(String(n.todo_id), 10) || 0}')">
                            Open todo #${escapeHtml(String(n.todo_id))}
                        </calcite-button>
                   </div>`
                : '';
            return `
                <calcite-list-item value="${idNum}" label="${escapeHtml(meta)}" description="${created}">
                    <div slot="content-top" class="text-xs text-color-3">${escapeHtml(meta)}</div>
                    <div slot="content-bottom" class="space-y-1">
                        ${attachRow}
                        ${showSnippet ? `<div class="text-sm text-color-2">${desc || '—'}</div>` : ''}
                    </div>
                </calcite-list-item>
            `;
        }).join('');
        body = `<calcite-list id="ttMainNotesList" selection-mode="single" selection-appearance="highlight">${rows}</calcite-list>`;
    } else {
        const headerCells = [
            `<calcite-table-header heading="ID" alignment="end"></calcite-table-header>`,
            showType ? `<calcite-table-header heading="Type"></calcite-table-header>` : '',
            showCategory ? `<calcite-table-header heading="Category"></calcite-table-header>` : '',
            showAttach ? `<calcite-table-header heading="Attachment"></calcite-table-header>` : '',
            showCreated ? `<calcite-table-header heading="Created"></calcite-table-header>` : '',
        ].filter(Boolean).join('');

        const rows = pageItems.map((n) => {
            const idNum = parseInt(String(n.id || ''), 10) || 0;
            const todoId = n.todo_id ? escapeHtml(String(n.todo_id)) : '';
            const noteType = escapeHtml(String(n.note_type || (n.todo_id ? 'attached' : 'project')));
            const category = escapeHtml(String(n.category || 'general'));
            const created = showCreated ? escapeHtml(formatDate(n.created_at)) : '';
            const attachedTitle = (n.todo_id != null) ? escapeHtml(getTodoTitleForNote(n)) : '';
            const attachCell = (showAttach && n.todo_id != null)
                ? `<div class="flex items-center gap-2">
                        <span class="text-sm text-color-2">Attached to ${attachedTitle}</span>
                        <calcite-button appearance="outline" scale="s" icon-start="link"
                            onclick="event.stopPropagation(); router.navigate('/todo/${parseInt(String(n.todo_id), 10) || 0}')">
                            Open todo #${escapeHtml(String(n.todo_id))}
                        </calcite-button>
                   </div>`
                : '—';
            const cells = [
                `<calcite-table-cell alignment="end">#${idNum}</calcite-table-cell>`,
                showType ? `<calcite-table-cell>${noteType}</calcite-table-cell>` : '',
                showCategory ? `<calcite-table-cell>${category}</calcite-table-cell>` : '',
                showAttach ? `<calcite-table-cell>${attachCell}</calcite-table-cell>` : '',
                showCreated ? `<calcite-table-cell>${created}</calcite-table-cell>` : '',
            ].filter(Boolean).join('');

            return `
                <calcite-table-row data-tt-note-id="${idNum}" class="tt-main-note-row">
                    ${cells}
                </calcite-table-row>
            `;
        }).join('');
        body = `
            <calcite-table bordered striped caption="Notes">
                <calcite-table-row slot="table-header">
                    ${headerCells}
                </calcite-table-row>
                ${rows}
            </calcite-table>
        `;
    }

    return `
        <div class="space-y-3">
            <div class="flex items-center gap-3">
                <calcite-segmented-control id="ttMainNotesViewModeSeg" scale="s" value="${escapeHtml(view)}">
                    <calcite-segmented-control-item value="grid" ${view === 'grid' ? 'checked' : ''}>Grid</calcite-segmented-control-item>
                    <calcite-segmented-control-item value="list" ${view === 'list' ? 'checked' : ''}>List</calcite-segmented-control-item>
                    <calcite-segmented-control-item value="table" ${view === 'table' ? 'checked' : ''}>Table</calcite-segmented-control-item>
                </calcite-segmented-control>
                <div class="min-w-0">
                    <div class="text-xs text-color-3">Showing ${totalItems ? startIdx + 1 : 0}-${Math.min(startIdx + pageItems.length, totalItems)} of ${totalItems}</div>
                </div>
            </div>

            ${body}

            <calcite-pagination id="ttMainNotesPagination" scale="m" total-items="${totalItems}" page-size="${pageSize}" start-item="${startItem}"></calcite-pagination>
        </div>
    `;
}

async function renderNoteDetailView(params) {
    showLoading();
    const noteId = params && params.id ? parseInt(params.id, 10) : NaN;
    if (!noteId) {
        router.navigate('/notes');
        return;
    }
    try {
        setHeaderMode('notes');

        let notes = Array.isArray(window.ttAllNotesCache) ? window.ttAllNotesCache : null;
        if (!notes) {
            const listRes = await fetch('/api/notes');
            if (listRes.ok) notes = await listRes.json();
        }
        notes = Array.isArray(notes) ? notes : [];
        window.ttAllNotesCache = notes;

        const opts = getNotesRouteOptions();
        const filteredTypeCat = filterNotesByTypeAndCategory(notes, opts.noteType, opts.category);
        const filtered = filterNotesClientSide(filteredTypeCat, opts.searchQuery, opts.filterText);

        const res = await fetch(`/api/notes/${noteId}`);
        if (!res.ok) throw new Error('Failed to fetch note');
        const note = await res.json();

        const { startPanel, startShell, mainView } = getShellTargets();
        if (startShell) startShell.removeAttribute('collapsed');
        if (startPanel) startPanel.innerHTML = renderNotesBrowserPanelHTML(filtered, opts, notes);
        collapseDetailPanel();
        syncNotesNavFilters(notes || [], opts);

        if (mainView) mainView.innerHTML = renderNoteDetailHTML(note);

        syncNotesSelection(noteId);
        hideLoading();
        initializeNotesView();
        initializeNoteDetailView(note);
    } catch (e) {
        console.error('Error loading note detail:', e);
        showError('Failed to load note. Please try again.');
        hideLoading();
    }
}

/**
 * Add create note modal to the page
 */
function addCreateNoteModal() {
    // Check if modal already exists
    if (document.getElementById('createNoteModal')) return;
    
    const modal = document.createElement('calcite-dialog');
    modal.id = 'createNoteModal';
    modal.label = 'Create New Note';

    // Match Calcite dialog best practice (same as create todo dialog).
    modal.setAttribute('heading', 'New Note');
    modal.setAttribute('description', 'Create a new note');
    modal.setAttribute('modal', '');
    modal.setAttribute('placement', 'center');
    modal.setAttribute('scale', 'm');
    modal.setAttribute('width-scale', 's');
    modal.setAttribute('slot', 'dialogs');

    modal.innerHTML = `
        <form id="createNoteModalForm" class="space-y-4">
            <input type="hidden" name="todo_id" id="ttCreateNoteTodoIdInput" value="">
            <input type="hidden" name="category" id="ttCreateNoteCategoryInput" value="">

            <calcite-label>
                Type
                <calcite-segmented-control id="ttCreateNoteTypeSeg" scale="s" value="project">
                    <calcite-segmented-control-item value="project" checked>Project note</calcite-segmented-control-item>
                    <calcite-segmented-control-item value="attached">Attached note</calcite-segmented-control-item>
                </calcite-segmented-control>
            </calcite-label>

            <calcite-label>
                Category
                <calcite-combobox id="ttCreateNoteCategoryBox" selection-mode="single" allow-custom-values placeholder="general">
                    <calcite-combobox-item value="general" text-label="general" selected></calcite-combobox-item>
                    <calcite-combobox-item value="research" text-label="research"></calcite-combobox-item>
                    <calcite-combobox-item value="decision" text-label="decision"></calcite-combobox-item>
                    <calcite-combobox-item value="meeting" text-label="meeting"></calcite-combobox-item>
                </calcite-combobox>
            </calcite-label>

            <calcite-label id="ttCreateNoteTodoLabel" hidden>
                Attach to Todo
                <calcite-combobox id="ttCreateNoteTodoBox" selection-mode="single" placeholder="Select a todo...">
                    <calcite-combobox-item value="" text-label="Loading todos..."></calcite-combobox-item>
                </calcite-combobox>
            </calcite-label>

            <calcite-label>
                Title
                <calcite-input name="title" placeholder="Optional title"></calcite-input>
            </calcite-label>

            <calcite-label>
                Content*
                <tt-md-editor name="content" height="240px" placeholder="Content (Markdown)"></tt-md-editor>
            </calcite-label>
        </form>

        <calcite-button id="createNoteModalCancel" slot="footer-end" width="auto" appearance="outline" kind="neutral">
            Cancel
        </calcite-button>
        <calcite-button slot="footer-end" width="auto" type="submit" form="createNoteModalForm" appearance="solid">
            Create
        </calcite-button>
    `;

    const shell = document.querySelector('calcite-shell');
    (shell || document.body).appendChild(modal);
    // Toast UI editor mounts itself inside <tt-md-editor> instances.

    const typeSeg = document.getElementById('ttCreateNoteTypeSeg');
    const todoLabel = document.getElementById('ttCreateNoteTodoLabel');
    const todoBox = document.getElementById('ttCreateNoteTodoBox');
    const todoIdInput = document.getElementById('ttCreateNoteTodoIdInput');
    const categoryBox = document.getElementById('ttCreateNoteCategoryBox');
    const categoryInput = document.getElementById('ttCreateNoteCategoryInput');

    function _setComboboxSingleValue(box, value) {
        if (!box) return;
        const target = String(value || '');
        box.querySelectorAll('calcite-combobox-item').forEach((it) => {
            const v = String(it.getAttribute('value') || '');
            if (v === target && target !== '') it.setAttribute('selected', '');
            else it.removeAttribute('selected');
        });
        try {
            box.value = target;
        } catch (e) {}
    }

    function syncTypeUI() {
        const t = String((typeSeg && typeSeg.value) || 'project');
        const attached = t === 'attached';
        if (todoLabel) {
            if (attached) todoLabel.removeAttribute('hidden');
            else todoLabel.setAttribute('hidden', '');
        }
        if (!attached && todoIdInput) {
            todoIdInput.value = '';
            _setComboboxSingleValue(todoBox, '');
        }
    }

    // Keep hidden category input in sync (form submission compatibility)
    if (categoryBox && !categoryBox._ttBound) {
        categoryBox._ttBound = true;
        categoryBox.addEventListener('calciteComboboxChange', () => {
            let v = categoryBox.value;
            if (Array.isArray(v)) v = v[0];
            v = String(v || '').trim();
            if (categoryInput) categoryInput.value = v;
        });
        // Initialize
        if (categoryInput) categoryInput.value = 'general';
    }

    if (typeSeg && !typeSeg._ttBound) {
        typeSeg._ttBound = true;
        typeSeg.addEventListener('calciteSegmentedControlChange', () => syncTypeUI());
    }

    if (todoBox && !todoBox._ttBound) {
        todoBox._ttBound = true;
        todoBox.addEventListener('calciteComboboxChange', () => {
            let v = todoBox.value;
            if (Array.isArray(v)) v = v[0];
            v = String(v || '').trim();
            if (todoIdInput) todoIdInput.value = v;
        });
    }

    async function populateTodos() {
        if (!todoBox) return;
        try {
            const res = await fetch('/api/todos');
            if (!res.ok) throw new Error('Failed to fetch todos');
            const tree = await res.json();
            const flat = [];
            const walk = (arr, depth) => {
                for (const t of (arr || [])) {
                    flat.push({ id: t.id, title: t.title || `Todo #${t.id}`, depth: depth || 0 });
                    if (t.children && t.children.length) walk(t.children, (depth || 0) + 1);
                }
            };
            walk(tree, 0);
            const items = flat.map((t) => {
                const prefix = t.depth ? `${'—'.repeat(Math.min(6, t.depth))} ` : '';
                const id = escapeHtml(String(t.id));
                const label = escapeHtml(prefix + String(t.title || '').trim());
                return `<calcite-combobox-item value="${id}" text-label="${label}"></calcite-combobox-item>`;
            }).join('');
            todoBox.innerHTML = `<calcite-combobox-item value="" text-label="Select a todo..."></calcite-combobox-item>${items}`;
        } catch (e) {
            todoBox.innerHTML = `<calcite-combobox-item value="" text-label="Failed to load todos"></calcite-combobox-item>`;
        }
    }

    // Populate once
    populateTodos();
    syncTypeUI();

    // Expose helper to open/prefill the modal
    window.ttOpenCreateNoteModal = async function (prefill) {
        const p = prefill || {};
        const todoId = p.todoId ? String(p.todoId) : '';
        // Default to project note unless a todoId was provided
        if (typeSeg) {
            try { typeSeg.value = todoId ? 'attached' : 'project'; } catch (e) {}
        }
        syncTypeUI();
        if (todoId) {
            if (todoIdInput) todoIdInput.value = todoId;
            _setComboboxSingleValue(todoBox, todoId);
        }
        if (modal) modal.open = true;
    };
    
    // Handle form submission
    const form = document.getElementById('createNoteModalForm');
    const cancelBtn = document.getElementById('createNoteModalCancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.open = false;
        });
    }
    // Reset form whenever dialog closes.
    modal.addEventListener('calciteDialogClose', () => {
        try { form && form.reset(); } catch (e) {}
        try {
            if (categoryInput) categoryInput.value = 'general';
            if (typeSeg) typeSeg.value = 'project';
        } catch (e) {}
        syncTypeUI();
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        syncTypeUI();
        // Validate markdown content (required, since <tt-md-editor> uses a hidden input for form submission)
        try {
            const mdEl = form.querySelector('tt-md-editor[name="content"]');
            const content = mdEl ? String(mdEl.value || '').trim() : '';
            if (!content) {
                alert('Content is required');
                return;
            }
        } catch (e) {}
        const formData = new FormData(form);
        // Avoid FastAPI int parsing errors when optional fields are blank
        const tid = formData.get('todo_id');
        if (tid === '' || tid === null) formData.delete('todo_id');
        const cat = formData.get('category');
        if (cat === '' || cat === null) formData.delete('category');
        
        try {
            const response = await fetch('/api/notes/form', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok || response.status === 303 || response.status === 302) {
                modal.open = false;
                form.reset();
                // Reload the current view
                router.handleRoute();
            } else {
                alert('Failed to create note');
            }
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to create note');
        }
    });
}

/**
 * Delete a todo
 */
async function deleteTodo(todoId) {
    if (!confirm('Delete this todo and all subtasks?')) return;
    
    try {
        const response = await fetch(`/api/todos/${todoId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            router.navigate('/');
        } else {
            alert('Failed to delete todo');
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        alert('Failed to delete todo');
    }
}

/**
 * Delete a note
 */
async function deleteNote(noteId) {
    if (!confirm('Delete this note?')) return;
    
    try {
        const response = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            router.navigate('/notes');
        } else {
            alert('Failed to delete note');
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note');
    }
}

