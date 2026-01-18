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

function ttSettingsTextRow(label, description, path, placeholder) {
    const l = escapeHtml(String(label || ''));
    const d = escapeHtml(String(description || ''));
    const p = escapeHtml(String(path || ''));
    const ph = escapeHtml(String(placeholder || ''));
    // Value is synced via ttSettingsSyncControls() after render.
    return `
        <calcite-list-item label="${l}" description="${d}">
            <calcite-input slot="actions-end" scale="s" placeholder="${ph}" data-tt-setting="${p}"></calcite-input>
        </calcite-list-item>
    `;
}

function renderSettingsViewHTML() {
    // Ensure settings are loaded so layout is applied on first paint.
    const s = ttGetSettings();
    const widthMode = escapeHtml(String((s && s.layout && s.layout.width_mode) || 'full'));
    const maxWidthPx = clampInt((s && s.layout && s.layout.max_width_px) ? s.layout.max_width_px : 1100, 1100, 900, 2000);
    const snappedMaxWidthPx = clampInt(Math.round(maxWidthPx / 100) * 100, 1100, 900, 2000);
    const isMax = String(widthMode || 'full') === 'max';

    const layoutTab = `
        <calcite-block-group>
            <calcite-block heading="Layout" description="Adjust defaults" open>
                <calcite-list>
                    ${ttSettingsSwitchRow('Dark theme', 'Use dark theme instead of light (default: light)', 'layout.theme_dark')}
                    <calcite-list-item
                        label="Content width"
                        description="Full width, or centered with adjustable max width"
                    >
                        <span slot="actions-end" class="tt-settings-width-controls">
                            <calcite-segmented-control
                                scale="s"
                                data-tt-setting="layout.width_mode"
                                value="${widthMode}"
                            >
                                <calcite-segmented-control-item value="full" ${!isMax ? 'checked' : ''}>Full width</calcite-segmented-control-item>
                                <calcite-segmented-control-item value="max" ${isMax ? 'checked' : ''}>Centered (${snappedMaxWidthPx}px)</calcite-segmented-control-item>
                            </calcite-segmented-control>
                            <calcite-slider
                                class="tt-settings-width-slider"
                                scale="s"
                                min="900"
                                max="2000"
                                step="100"
                                value="${snappedMaxWidthPx}"
                                data-tt-setting="layout.max_width_px"
                                ${isMax ? '' : 'disabled'}
                            ></calcite-slider>
                        </span>
                    </calcite-list-item>
                </calcite-list>
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
                    ${ttSettingsSwitchRow('Sign posts with author name', 'Show author attribution on todo/note cards and list items', 'advanced.sign_posts_with_author_name')}
                    ${ttSettingsTextRow('Author name', 'Default author to prefill on new todos/notes (when sign posts are enabled)', 'advanced.author_name', 'admin')}
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
    ttSettingsSyncLayoutWidthControls(document);
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

    // Left panel minimize toggle (shared helper, used by Todos + Notes)
    try { ttBindLeftPanelMinimizeToggle(); } catch (e) {}

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

    // NOTE: We already filter notes in JS before rendering; applying Calcite list.filterText
    // can cause "double filtering" when the snippet is rendered via slotted content (not description attr).

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
    const showAuthorSignposts = !!(settings && settings.advanced && settings.advanced.sign_posts_with_author_name);

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
        const author = escapeHtml(String((n.author || '')).trim());
        const metaParts = [`#${id}`];
        if (showType) metaParts.push(noteTypeRaw);
        if (showCategory) metaParts.push(categoryRaw);
        if (showAttach && todoIdRaw) metaParts.push(`Todo #${todoIdRaw}`);
        const meta = metaParts.join(' · ');
        const created = showCreated ? escapeHtml(formatDate(n.created_at)) : '';
        const snippet = showSnippet ? escapeHtml(_noteSnippet(n.content, 140)) : '';
        const authorRow = (showAuthorSignposts && author)
            ? `<div class="text-xs text-color-3">${author}</div>`
            : '';
        return `
            <calcite-list-item value="${id}" label="${label}" description="${created}" metadata="${escapeHtml(meta)}">
                <div slot="content-top" class="text-xs text-color-3">${escapeHtml(meta)}</div>
                <div slot="content-bottom" class="space-y-1">
                    ${showSnippet ? `<div class="markdown-render text-sm text-color-2">${snippet || '—'}</div>` : ''}
                    ${authorRow}
                </div>
            </calcite-list-item>
        `;
    }).join('');

    return `
        <div class="space-y-3 tt-browser-panel">
            <div class="flex items-center gap-2">
                <calcite-button id="ttLeftPanelToggleBtn" appearance="transparent" scale="s" kind="neutral" title="Minimize/expand left panel" icon-start="chevrons-left"></calcite-button>
            </div>

            <calcite-list id="ttNotesBrowserList" display-mode="nested" selection-mode="single" selection-appearance="highlight">
                ${listItems || '<calcite-list-item label="No notes" description="Create your first note with New."></calcite-list-item>'}
            </calcite-list>
        </div>
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
    const showAuthorSignposts = !!(settings && settings.advanced && settings.advanced.sign_posts_with_author_name);

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
    const authorText = escapeHtml(String((n.author || '')).trim());

    return `
        <calcite-card>
            <div slot="title">${escapeHtml(String((n.title || '')).trim()) || `Note #${id}`}</div>
            ${subtitle ? `<div slot="subtitle" class="text-xs text-color-3">${subtitle}</div>` : ''}
            ${showAuthorSignposts && authorText ? `<div class="text-xs text-color-3">${authorText}</div>` : ''}
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

                <calcite-label>
                    Author
                    <calcite-input data-tt-note-field="author" data-tt-note-id="${idNum || 0}" value="${escapeHtml(String(n.author || ''))}"></calcite-input>
                </calcite-label>

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
            if (field === 'author') patch.author = String(value || '').trim() || null;
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
    const showAuthorSignposts = !!(settings && settings.advanced && settings.advanced.sign_posts_with_author_name);
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
        const author = escapeHtml(String((n.author || '')).trim());
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
            ? `<div class="space-y-1 mt-2">
                    <div class="text-sm text-color-2">Attached to ${attachedTitle}</div>
                    <calcite-button appearance="outline" scale="s" icon-start="link"
                        onclick="event.stopPropagation(); router.navigate('/todo/${parseInt(String(n.todo_id), 10) || 0}')">
                        Open todo #${escapeHtml(String(n.todo_id))}
                    </calcite-button>
               </div>`
            : '';
        const authorRow = (showAuthorSignposts && author)
            ? `<div class="text-xs text-color-3">${author}</div>`
            : '';
        return `
            <calcite-card class="tt-note-card cursor-pointer tt-hover-card" onclick="router.navigate('/notes/${idNum}')">
                <div slot="title">${title || `Note #${id}`}</div>
                <div slot="subtitle" class="text-xs text-color-3">${escapeHtml([meta, created].filter(Boolean).join(' · '))}</div>
                ${showSnippet ? `<div class="markdown-render text-sm text-color-2">${snippet || '—'}</div>` : ''}
                ${authorRow}
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
            const author = escapeHtml(String((n.author || '')).trim());
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
            const authorRow = (showAuthorSignposts && author)
                ? `<div class="text-xs text-color-3">${author}</div>`
                : '';
            return `
                <calcite-list-item value="${idNum}" label="${escapeHtml(meta)}" description="${created}">
                    <div slot="content-top" class="text-xs text-color-3">${escapeHtml(meta)}</div>
                    <div slot="content-bottom" class="space-y-1">
                        ${attachRow}
                        ${showSnippet ? `<div class="markdown-render text-sm text-color-2">${desc || '—'}</div>` : ''}
                        ${authorRow}
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
            <input type="hidden" name="author" id="ttCreateNoteAuthorInput" value="">

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
                Author
                <calcite-input name="author_display" id="ttCreateNoteAuthorDisplay" placeholder="(optional)"></calcite-input>
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
    const authorInput = document.getElementById('ttCreateNoteAuthorInput');
    const authorDisplay = document.getElementById('ttCreateNoteAuthorDisplay');

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

    // Keep hidden author input in sync (form submission compatibility)
    if (authorDisplay && !authorDisplay._ttBound) {
        authorDisplay._ttBound = true;
        const syncAuthor = () => {
            const v = String(authorDisplay.value || '').trim();
            if (authorInput) authorInput.value = v;
        };
        authorDisplay.addEventListener('calciteInputChange', syncAuthor);
        authorDisplay.addEventListener('input', syncAuthor);
        authorDisplay.addEventListener('change', syncAuthor);
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
        // Prefill author based on settings (only when sign posts are enabled)
        try {
            const s = ttGetSettings();
            const enabled = !!(s && s.advanced && s.advanced.sign_posts_with_author_name);
            const defAuthor = (s && s.advanced && s.advanced.author_name) ? String(s.advanced.author_name) : 'admin';
            const authorVal = enabled ? defAuthor : '';
            if (authorDisplay) authorDisplay.value = authorVal;
            if (authorInput) authorInput.value = authorVal;
        } catch (e) {}
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
            if (authorInput) authorInput.value = '';
            if (authorDisplay) authorDisplay.value = '';
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
        const auth = formData.get('author');
        if (auth === '' || auth === null) formData.delete('author');
        
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

