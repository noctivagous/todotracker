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

    // NOTE: We already filter todos in JS before rendering; applying Calcite list.filterText
    // can cause "double filtering" when snippets are rendered via slotted content (not description attr).

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
            <input type="hidden" name="author" id="ttCreateTodoAuthorInput" value="" />
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

            <calcite-label>
                Author
                <span class="text-color-3 text-xs">(optional)</span>
                <calcite-input type="text" id="ttCreateTodoAuthorDisplay" placeholder=""></calcite-input>
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
    const authorInput = document.getElementById('ttCreateTodoAuthorInput');
    const authorDisplay = document.getElementById('ttCreateTodoAuthorDisplay');
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
            if (authorInput) authorInput.value = '';
            if (authorDisplay) authorDisplay.value = '';
        } catch (e) {}
        try {
            modal.setAttribute('heading', 'New Todo');
            modal.setAttribute('description', 'Create a new todo item');
        } catch (e) {}
    });

    // Keep hidden author input in sync
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const auth = formData.get('author');
        if (auth === '' || auth === null) formData.delete('author');
        
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

        // Prefill author based on settings (only when sign posts are enabled)
        try {
            const s = ttGetSettings();
            const enabled = !!(s && s.advanced && s.advanced.sign_posts_with_author_name);
            const defAuthor = (s && s.advanced && s.advanced.author_name) ? String(s.advanced.author_name) : 'admin';
            const authorVal = enabled ? defAuthor : '';
            if (authorDisplay) authorDisplay.value = authorVal;
            if (authorInput) authorInput.value = authorVal;
        } catch (e) {}

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
            } else if (field === 'author') {
                el.value = todo.author || '';
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
            } else if (field === 'author') {
                patch.author = String(value || '').trim() || null;
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
            <calcite-list-item value="${id}" label="${label}">
                <calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${status || ''}</calcite-chip>
                ${subCount > 0 ? `<calcite-chip slot="actions-end" scale="s" appearance="outline" class="tt-subtasks-chip">Subtasks (${subCount})</calcite-chip>` : ''}
                <calcite-button slot="actions-end" appearance="transparent" scale="s" icon-start="launch"
                    onclick="event.stopPropagation(); router.navigate('/todo/${id}')">Open</calcite-button>
                <div slot="content-bottom" class="markdown-render text-xs text-color-3">${desc || ''}</div>
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
    const settings = ttGetSettings();
    const showAuthorSignposts = !!(settings && settings.advanced && settings.advanced.sign_posts_with_author_name);

    const items = [];
    for (const t of (Array.isArray(todos) ? todos : [])) {
        const label = escapeHtml(t.title || '');
        const desc = showDescription ? escapeHtml(_truncate(t.description || '', 140)) : '';
        const author = escapeHtml(String((t.author || '')).trim());
        const metaParts = [`#${t.id}`];
        if (showStatus) metaParts.push(replaceUnderscores(t.status));
        const meta = metaParts.join(' · ');
        const subCount = ttCountSubtasks(t);

        items.push(`
            <calcite-list-item value="${t.id}" label="${label}" metadata="${escapeHtml(meta)}">
                ${showStatus ? `<calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                ${subCount > 0 ? `<calcite-chip slot="actions-end" scale="s" appearance="outline" class="tt-subtasks-chip">Subtasks (${subCount})</calcite-chip>` : ''}
                <div slot="content" class="tt-main-list-content min-w-0">
                    <div class="tt-main-todo-title truncate">${label}</div>
                    ${showDescription ? `<div class="markdown-render text-xs text-color-3">${desc || ''}</div>` : ''}
                    ${showAuthorSignposts && author ? `<div class="text-xs text-color-3 truncate">${author}</div>` : ''}
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
    const showAuthorSignposts = !!(settings && settings.advanced && settings.advanced.sign_posts_with_author_name);
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
        const author = escapeHtml(String((t.author || '')).trim());
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
                    ${showDescription ? `<div class="markdown-render text-sm text-color-2">${desc || 'No description'}</div>` : ''}
                    ${showAuthorSignposts && author ? `<div class="text-xs text-color-3">${author}</div>` : ''}
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
                    <calcite-list-item value="${t.id}" label="${label}" metadata="${escapeHtml(meta)}">
                        ${showStatus ? `<calcite-chip slot="content-start" scale="s" appearance="solid" class="status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                        <div slot="content" class="tt-main-list-content min-w-0">
                            <div class="tt-main-todo-title truncate">${label}</div>
                            ${showDescription ? `<div class="markdown-render text-xs text-color-3">${desc || ''}</div>` : ''}
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
            <calcite-list-item value="${t.id}" label="${label}" metadata="${escapeHtml(meta)}">
                ${showStatus ? `<calcite-chip slot="content-start" scale="s" appearance="solid" class="tt-browser-status-chip tt-browser-status-chip--side status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                <div slot="content" class="tt-browser-item-content min-w-0">
                    ${showStatus ? `<calcite-chip scale="s" appearance="solid" class="tt-browser-status-chip tt-browser-status-chip--top status-${escapeHtml(t.status)}">${escapeHtml(replaceUnderscores(t.status))}</calcite-chip>` : ''}
                    <div class="tt-browser-item-title font-bold">
                        <span class="tt-browser-item-title-text">${label}</span>
                        <span class="tt-browser-item-id text-color-3">#${id}</span>
                        </div>
                    ${showDescription ? `<div class="tt-browser-item-desc markdown-render text-xs text-color-3">${desc || ''}</div>` : ''}
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
    const showAuthorSignposts = !!(settings && settings.advanced && settings.advanced.sign_posts_with_author_name);

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

    const authorText = escapeHtml(String((t.author || '')).trim());

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
        `
            <calcite-label>
                Author
                <calcite-input data-tt-field="author" data-tt-todo-id="${t.id}" value="${escapeHtml(String(t.author || ''))}"></calcite-input>
            </calcite-label>
        `,
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
                    ${showAuthorSignposts && authorText ? `<div class="text-xs text-color-3">${authorText}</div>` : ''}

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

