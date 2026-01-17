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
                               scale="m">
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
                            {{if todo_id}} | <a href="#/todo/{{:todo_id}}" class="underline">Linked to todo #{{:todo_id}}</a> {{/if}}
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

function setHeaderMode(mode) {
    const m = mode === 'notes' ? 'notes' : 'todos';
    const headerStatusSeg = document.getElementById('ttHeaderStatusSeg');
    const headerStatusSelect = document.getElementById('ttHeaderStatusSelect');
    const navSearch = document.getElementById('ttNavSearchInput');
    const navFilter = document.getElementById('ttNavFilterInput');
    const headerNewBtn = document.getElementById('ttHeaderNewTodoBtn');

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
        navSearch.placeholder = m === 'notes' ? 'Search notes (Enter)...' : 'Search todos (Enter)...';
    }
    if (navFilter) {
        navFilter.placeholder = m === 'notes' ? 'Filter notes (live)...' : 'Filter (live)...';
    }
    if (headerNewBtn) {
        headerNewBtn.innerHTML = 'New';
        headerNewBtn.setAttribute('icon-start', 'plus');
        headerNewBtn.title = m === 'notes' ? 'Create note' : 'Create todo';
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
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    
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
            n.content || '',
            n.created_at || '',
        ].join(' ').toLowerCase();
        return hay.includes(q);
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
        const { startPanel, mainView } = getShellTargets();
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

    // Global navigation-secondary search (Enter)
    const navSearch = document.getElementById('ttNavSearchInput');
    if (navSearch && !navSearch._ttBound) {
        navSearch._ttBound = true;
        navSearch.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            if (navSearch._ttSyncing) return;
            const query = (navSearch.value || '').trim();
            if (isNotesMode()) {
                navigateNotesWithParamPatch({ q: query });
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
                    navigateNotesWithParamPatch({ filter: q });
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

                // First, clear any inline size constraints to reset Calcite's internal state
                try {
                    await startShell.updateSize({ inline: null });
                } catch (e) {}

                // Wait a tick for the size reset to propagate
                await new Promise(resolve => setTimeout(resolve, 0));

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

                // Wait another tick before re-enabling resizable to ensure size is fully set
                await new Promise(resolve => setTimeout(resolve, 0));

                if (prevResizable === 'true') {
                    try { startShell.setAttribute('resizable', ''); } catch (e) {}
                }

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
            <calcite-label>
                Title*
                <calcite-input type="text" name="title" required></calcite-input>
            </calcite-label>
            
            <calcite-label>
                Description
                <calcite-text-area name="description" rows="3"></calcite-text-area>
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
            }
        } catch (e) {
            // Non-fatal: some Calcite elements may not be ready immediately.
        }
    }

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
            }

            if (Object.keys(patch).length === 0) return;
            const debounceMs = (field === 'status' || field === 'category') ? 0 : 450;
            scheduleAutosave(todoId, patch, debounceMs);
        };

        el.addEventListener('calciteInputChange', handler);
        el.addEventListener('calciteSelectChange', handler);
        el.addEventListener('change', handler);
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

function renderTodosGridCardsHTML(flatTodos) {
    const flat = Array.isArray(flatTodos) ? flatTodos : [];
    if (!flat.length) return '';

    return flat.map((t) => {
        const title = escapeHtml(t.title || '');
        const desc = escapeHtml(_truncate(t.description || '', 140));
        const status = escapeHtml(t.status || '');
        const category = escapeHtml(t.category || '');
        const meta = `#${t.id} · ${replaceUnderscores(t.status)}`;
        const topic = t.topic ? `<calcite-chip appearance="outline" scale="s" icon-start="folder" class="tt-topic-chip">${escapeHtml(t.topic)}</calcite-chip>` : '';
        const tags = Array.isArray(t.tags)
            ? t.tags.slice(0, 3).map((x) => `<calcite-chip appearance="outline" scale="s">🏷️ ${escapeHtml(x.name || '')}</calcite-chip>`).join('')
            : '';

        return `
            <calcite-card class="cursor-pointer" onclick="router.navigate('/todo/${t.id}')">
                <div slot="title" class="tt-main-todo-title truncate">${title}</div>
                <div slot="subtitle" class="text-xs text-color-3">${escapeHtml(meta)}</div>
                <div class="space-y-2">
                    <div class="flex items-center flex-wrap gap-1.5">
                        <calcite-chip appearance="solid" scale="s" class="status-${status}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>
                        <calcite-chip appearance="outline" scale="s" class="category-${category}">${category}</calcite-chip>
                        ${topic}
                    </div>
                    <div class="text-sm text-color-2">${desc || 'No description'}</div>
                    ${tags ? `<div class="flex items-center flex-wrap gap-1.5">${tags}</div>` : ''}
                </div>
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
    const o = options || {};
    const view = (o.view === 'list' || o.view === 'table') ? o.view : 'grid';

    const flatAll = flattenTodos(todosTree || []);
    const totalItems = flatAll.length;
    const pageSize = clampInt(o.pageSize, 24, 5, 200);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, clampInt(o.page, 1, 1, 999999)), totalPages);
    const startIdx = (page - 1) * pageSize;
    const pageItems = flatAll.slice(startIdx, startIdx + pageSize);
    const startItem = totalItems ? (startIdx + 1) : 1;

    let body = '';
    if (!pageItems.length) {
        body = `<calcite-card><div slot="title">Todos</div><div class="text-color-2">No todos match the current filters.</div></calcite-card>`;
    } else if (view === 'grid') {
        body = `<div class="grid grid-cols-1 md:grid-cols-3 gap-3">${renderTodosGridCardsHTML(pageItems)}</div>`;
    } else if (view === 'list') {
        const items = pageItems.map((t) => {
            const label = escapeHtml(t.title || '');
            const desc = escapeHtml(_truncate(t.description || '', 140));
            const meta = `#${t.id} · ${replaceUnderscores(t.status)}`;
            return `
                <calcite-list-item value="${t.id}" label="${label}" description="${desc}" metadata="${escapeHtml(meta)}">
                    <calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>
                    <div slot="content" class="tt-main-list-content min-w-0">
                        <div class="tt-main-todo-title truncate">${label}</div>
                        <div class="text-xs text-color-3 truncate">${desc || ''}</div>
                    </div>
                </calcite-list-item>
            `;
        }).join('');
        body = `<calcite-list id="ttMainTodosList" selection-mode="single" selection-appearance="highlight">${items}</calcite-list>`;
    } else {
        const rows = pageItems.map((t) => {
            const title = escapeHtml(_truncate(t.title || '', 80));
            const status = escapeHtml(replaceUnderscores(t.status || ''));
            const cat = escapeHtml(t.category || '');
            const queue = escapeHtml(String(t.queue || 0));
            const updated = escapeHtml(formatDate(t.updated_at || t.created_at || ''));
            return `
                <calcite-table-row data-tt-todo-id="${t.id}" class="tt-main-table-row">
                    <calcite-table-cell alignment="end">#${t.id}</calcite-table-cell>
                    <calcite-table-cell>${title}</calcite-table-cell>
                    <calcite-table-cell><calcite-chip scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${status}</calcite-chip></calcite-table-cell>
                    <calcite-table-cell>${cat}</calcite-table-cell>
                    <calcite-table-cell alignment="end">${queue}</calcite-table-cell>
                    <calcite-table-cell>${updated}</calcite-table-cell>
                </calcite-table-row>
            `;
        }).join('');
        body = `
            <calcite-table bordered striped caption="Todos">
                <calcite-table-row slot="table-header">
                    <calcite-table-header heading="ID" alignment="end"></calcite-table-header>
                    <calcite-table-header heading="Title"></calcite-table-header>
                    <calcite-table-header heading="Status"></calcite-table-header>
                    <calcite-table-header heading="Category"></calcite-table-header>
                    <calcite-table-header heading="Queue" alignment="end"></calcite-table-header>
                    <calcite-table-header heading="Updated"></calcite-table-header>
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
    const items = [];
    for (const t of todos) {
        const label = escapeHtml(t.title || '');
        const desc = escapeHtml(_truncate(t.description || '', 120));
        const meta = `#${t.id} · ${replaceUnderscores(t.status)}`;
        items.push(`
            <calcite-list-item value="${t.id}" label="${label}" description="${desc}" metadata="${escapeHtml(meta)}">
                <calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>
                ${Array.isArray(t.children) && t.children.length ? renderTodoBrowserListItemsHTML(t.children) : ''}
            </calcite-list-item>
        `);
    }
    return items.join('');
}

function renderTodoDetailPanelHTML(todoDetail) {
    const t = todoDetail || {};
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
                            Todo #${t.id}
                            <span class="text-color-3"> · </span>
                            Created: ${escapeHtml(formatDate(t.created_at))}
                            ${t.updated_at && t.updated_at !== t.created_at ? ' · Updated: ' + escapeHtml(formatDate(t.updated_at)) : ''}
                        </div>
                        <calcite-chip id="ttAutosaveChip" appearance="outline" scale="s">Saved</calcite-chip>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <calcite-label>
                            Status
                            <calcite-select data-tt-field="status" data-tt-todo-id="${t.id}">
                                <calcite-option value="pending" ${t.status === 'pending' ? 'selected' : ''}>pending</calcite-option>
                                <calcite-option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>in_progress</calcite-option>
                                <calcite-option value="completed" ${t.status === 'completed' ? 'selected' : ''}>completed</calcite-option>
                                <calcite-option value="cancelled" ${t.status === 'cancelled' ? 'selected' : ''}>cancelled</calcite-option>
                            </calcite-select>
                        </calcite-label>

                        <calcite-label>
                            Category
                            <calcite-select data-tt-field="category" data-tt-todo-id="${t.id}">
                                <calcite-option value="feature" ${t.category === 'feature' ? 'selected' : ''}>feature</calcite-option>
                                <calcite-option value="issue" ${t.category === 'issue' ? 'selected' : ''}>issue</calcite-option>
                                <calcite-option value="bug" ${t.category === 'bug' ? 'selected' : ''}>bug</calcite-option>
                            </calcite-select>
                        </calcite-label>

                        <calcite-label>
                            Topic
                            <calcite-input data-tt-field="topic" data-tt-todo-id="${t.id}" value="${escapeHtml(t.topic || '')}"></calcite-input>
                        </calcite-label>
                    </div>

                    <calcite-input class="tt-title-input" scale="l" data-tt-field="title" data-tt-todo-id="${t.id}" value="${escapeHtml(t.title || '')}"></calcite-input>

                    <calcite-label>
                        Description (markdown)
                        <calcite-text-area rows="16" data-tt-field="description" data-tt-todo-id="${t.id}"></calcite-text-area>
                    </calcite-label>
                </div>
                <div class="space-y-3">
                    <calcite-label>
                        Tags (comma-separated)
                        <calcite-input class="tt-tags-input" scale="s" data-tt-field="tag_names" data-tt-todo-id="${t.id}" value="${escapeHtml(tagsCsv)}"></calcite-input>
                    </calcite-label>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <calcite-label>
                            Queue Position
                            <calcite-input type="number" min="0" data-tt-field="queue" data-tt-todo-id="${t.id}" value="${escapeHtml(String(t.queue || 0))}"></calcite-input>
                        </calcite-label>
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
                        <calcite-label>
                            Task Size (1-5)
                            <calcite-input type="number" min="1" max="5" data-tt-field="task_size" data-tt-todo-id="${t.id}" value="${escapeHtml(t.task_size == null ? '' : String(t.task_size))}"></calcite-input>
                        </calcite-label>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <calcite-label>
                            ✅ Work Completed
                            <calcite-text-area rows="6" data-tt-field="work_completed" data-tt-todo-id="${t.id}"></calcite-text-area>
                        </calcite-label>
                        <calcite-label>
                            📋 Work Remaining
                            <calcite-text-area rows="6" data-tt-field="work_remaining" data-tt-todo-id="${t.id}"></calcite-text-area>
                        </calcite-label>
                        <calcite-label>
                            ⚠️ Implementation Issues
                            <calcite-text-area rows="6" data-tt-field="implementation_issues" data-tt-todo-id="${t.id}"></calcite-text-area>
                        </calcite-label>
                    </div>

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

                    ${(t.notes && t.notes.length) ? `
                        <calcite-panel>
                            <div slot="header">Notes (${t.notes.length})</div>
                            <div class="space-y-2">
                                ${t.notes.map((n) => `<div class="tt-surface p-3"><div class="markdown-render">${escapeHtml(n.content || '')}</div><div class="text-xs text-color-3 mt-1">${escapeHtml(formatDate(n.created_at))}</div></div>`).join('')}
                            </div>
                        </calcite-panel>
                    ` : ''}

                    <!-- Created/Updated shown in header next to Todo # -->
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
        const filtered = filterNotesClientSide(notes, opts.searchQuery, opts.filterText);
        window.ttAllNotesCache = notes || [];

        // Notes uses master-detail too: list in panel-start, detail in main.
        const { startPanel, startShell, mainView } = getShellTargets();
        if (startShell) startShell.removeAttribute('collapsed');
        if (startPanel) startPanel.innerHTML = renderNotesBrowserPanelHTML(filtered);
        collapseDetailPanel();

        const view = mainView || document.getElementById('app-view');
        view.innerHTML = renderMainNotesPlaceholderHTML(filtered);
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

    // Render markdown
    document.querySelectorAll('.markdown-render').forEach(el => {
        renderMarkdown(el);
    });
    
    // Add create note modal
    addCreateNoteModal();

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
    }

    // Apply navigation-secondary filter text to the notes list
    if (list) {
        const filterText = (document.getElementById('ttNavFilterInput') && document.getElementById('ttNavFilterInput').value) || '';
        try { list.filterText = filterText; } catch (e) {}
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

function renderNotesBrowserPanelHTML(notes) {
    const items = (Array.isArray(notes) ? notes : []);
    const listItems = items.map((n) => {
        const id = escapeHtml(String(n.id || ''));
        const todoId = n.todo_id ? escapeHtml(String(n.todo_id)) : '';
        const meta = todoId ? `Note #${id} · Todo #${todoId}` : `Note #${id}`;
        const created = escapeHtml(formatDate(n.created_at));
        const snippet = escapeHtml(_noteSnippet(n.content, 140));
        return `
            <calcite-list-item value="${id}" label="${escapeHtml(meta)}" description="${created}">
                <div slot="content-top" class="text-xs text-color-3">${escapeHtml(meta)}</div>
                <div slot="content-bottom" class="text-sm text-color-2">${snippet || '—'}</div>
            </calcite-list-item>
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
    const idNum = parseInt(String(n.id || ''), 10);
    const id = escapeHtml(String(idNum || ''));
    const created = escapeHtml(formatDate(n.created_at));
    const todoId = n.todo_id ? parseInt(String(n.todo_id), 10) : null;
    const todoLink = todoId
        ? `<calcite-button appearance="outline" scale="s" icon-start="link" onclick="router.navigate('/todo/${todoId}')">Open Todo #${todoId}</calcite-button>`
        : '';

    return `
        <calcite-card>
            <div slot="title">Note #${id}</div>
            <div slot="subtitle" class="text-xs text-color-3">Created: ${created}</div>
            <div class="space-y-3">
                ${todoLink ? `<div class="flex gap-2">${todoLink}</div>` : ''}
                <div class="markdown-render">${escapeHtml(n.content || '')}</div>
                <div class="flex gap-2">
                    <calcite-button appearance="solid" kind="danger" scale="s" icon-start="trash" onclick="deleteNote(${idNum || 0})">Delete</calcite-button>
                </div>
            </div>
        </calcite-card>
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
        const filtered = filterNotesClientSide(notes, opts.searchQuery, opts.filterText);

        const res = await fetch(`/api/notes/${noteId}`);
        if (!res.ok) throw new Error('Failed to fetch note');
        const note = await res.json();

        const { startPanel, startShell, mainView } = getShellTargets();
        if (startShell) startShell.removeAttribute('collapsed');
        if (startPanel) startPanel.innerHTML = renderNotesBrowserPanelHTML(filtered);
        collapseDetailPanel();

        if (mainView) mainView.innerHTML = renderNoteDetailHTML(note);

        syncNotesSelection(noteId);
        hideLoading();
        initializeNotesView();
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
    
    modal.innerHTML = `
        <form id="createNoteModalForm" slot="content" class="space-y-4">
            <calcite-label>
                Content*
                <calcite-text-area name="content" rows="5" required></calcite-text-area>
            </calcite-label>
        </form>
        
        <calcite-button slot="primary" type="submit" form="createNoteModalForm" appearance="solid">
            Create
        </calcite-button>
        <calcite-button slot="secondary" onclick="document.getElementById('createNoteModal').open = false" appearance="outline">
            Cancel
        </calcite-button>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    const form = document.getElementById('createNoteModalForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
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

