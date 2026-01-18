function renderMarkdown(element) {
    if (!element || typeof marked === 'undefined') return;
    const markdownText = element.textContent || element.innerText;
    if (!markdownText || markdownText.trim() === '') return;
    try {
        const unsafeHtml = marked.parse(markdownText);
        // IMPORTANT: marked allows raw HTML by default. Always sanitize before injecting.
        // We prefer DOMPurify if present; otherwise fall back to plain text (safe).
        let safeHtml = null;
        if (typeof DOMPurify !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
            safeHtml = DOMPurify.sanitize(unsafeHtml, { USE_PROFILES: { html: true } });
        }
        if (safeHtml == null) {
            // Safe fallback: do not inject unsanitized HTML.
            element.textContent = markdownText;
            element.classList.add('markdown-content');
            return;
        }
        element.innerHTML = safeHtml;
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
    advanced: {
        // If enabled, show "sign posts" (author attribution) in list/cards.
        sign_posts_with_author_name: false,
        // Default author to prefill on create when sign posts are enabled.
        author_name: "admin",
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
            if (el.tagName === 'CALCITE-INPUT') el.value = (v == null) ? '' : String(v);
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
        else if (el.tagName === 'CALCITE-INPUT') nextValue = String(el.value || '');
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

    root.querySelectorAll('calcite-input[data-tt-setting]').forEach((inp) => {
        if (inp._ttBoundSettings) return;
        inp._ttBoundSettings = true;
        inp.addEventListener('calciteInputChange', () => ttSettingsApplyFromEl(inp));
        inp.addEventListener('change', () => ttSettingsApplyFromEl(inp));
        inp.addEventListener('input', () => ttSettingsApplyFromEl(inp));
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

