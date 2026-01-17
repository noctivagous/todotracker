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

/**
 * Todos List View
 */
async function renderTodosView() {
    showLoading();
    const params = getQueryParams();
    const status = params.status || 'pending';
    const queued = params.queued === 'true';
    const sortBy = params.sort_by || 'updated_at';
    const sortDir = params.sort_dir || 'desc';
    const searchQuery = params.q;

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

        // Render browser panel + main placeholder (master-detail)
        const { startPanel, mainView } = getShellTargets();
        if (startPanel) {
            startPanel.innerHTML = renderTodoBrowserPanelHTML(todos, stats, {
                status,
                queued,
                sortBy,
                sortDir,
                searchQuery
            });
        }
        if (mainView) {
            mainView.innerHTML = renderTodoMainPlaceholderHTML(stats);
        }

        // Cache full tree for dependency dropdowns, etc.
        window.ttAllTodosCache = allTodos;

        // Default: no selection, detail panel closed
        collapseDetailPanel();

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
    // Search input handler (browser panel or legacy view)
    const searchInput = document.getElementById('ttBrowserSearchInput') || document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    router.navigate(`/?q=${encodeURIComponent(query)}`);
                } else {
                    router.navigate('/');
                }
            }
        });
    }

    // Status segmented control (browser panel)
    const statusSeg = document.getElementById('ttBrowserStatusSeg');
    if (statusSeg) {
        statusSeg.addEventListener('calciteSegmentedControlChange', () => {
            const v = statusSeg.value || 'pending';
            router.navigate(`/?status=${encodeURIComponent(v)}`);
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
    modal.label = 'Create New Todo';
    
    modal.innerHTML = `
        <form id="createModalForm" slot="content" class="space-y-4">
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
        
        <calcite-button slot="primary" type="submit" form="createModalForm" appearance="solid">
            Create
        </calcite-button>
        <calcite-button slot="secondary" onclick="document.getElementById('createModal').open = false" appearance="outline">
            Cancel
        </calcite-button>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    const form = document.getElementById('createModalForm');
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

function renderTodoMainPlaceholderHTML(stats) {
    return `
        <calcite-card>
            <div slot="title">TodoTracker</div>
            <div class="space-y-3">
                <p class="text-color-2">Select a todo from the list to view and edit all properties in the right panel.</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <calcite-chip appearance="outline">Total: ${stats.total}</calcite-chip>
                    <calcite-chip appearance="outline">Pending: ${stats.pending}</calcite-chip>
                    <calcite-chip appearance="outline">In Progress: ${stats.in_progress}</calcite-chip>
                    <calcite-chip appearance="outline">Completed: ${stats.completed}</calcite-chip>
                </div>
            </div>
        </calcite-card>
    `;
}

function _truncate(s, n) {
    if (!s) return '';
    const t = String(s);
    return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function renderTodoBrowserPanelHTML(todos, stats, options) {
    const status = options.status || 'pending';
    const searchQuery = options.searchQuery || '';
    return `
        <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <div class="text-sm text-color-2">Todos</div>
                    <div class="text-xs text-color-3">Total ${stats.total} · Pending ${stats.pending} · In Progress ${stats.in_progress} · Completed ${stats.completed}</div>
                </div>
                <calcite-button appearance="solid" scale="s" onclick="document.getElementById('createModal').open = true">+ New</calcite-button>
            </div>

            <calcite-input id="ttBrowserSearchInput" type="text" placeholder="Search (Enter)..." value="${escapeHtml(searchQuery)}" scale="m"></calcite-input>

            <calcite-segmented-control id="ttBrowserStatusSeg" scale="s" value="${escapeHtml(status)}">
                <calcite-segmented-control-item value="all" ${status === 'all' ? 'checked' : ''}>All</calcite-segmented-control-item>
                <calcite-segmented-control-item value="pending" ${status === 'pending' ? 'checked' : ''}>Pending</calcite-segmented-control-item>
                <calcite-segmented-control-item value="in_progress" ${status === 'in_progress' ? 'checked' : ''}>In Progress</calcite-segmented-control-item>
                <calcite-segmented-control-item value="completed" ${status === 'completed' ? 'checked' : ''}>Completed</calcite-segmented-control-item>
                <calcite-segmented-control-item value="cancelled" ${status === 'cancelled' ? 'checked' : ''}>Cancelled</calcite-segmented-control-item>
            </calcite-segmented-control>

            <calcite-list id="ttTodoBrowserList" display-mode="nested" filter-enabled filter-placeholder="Filter list..." selection-mode="single" selection-appearance="highlight">
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
                        <div class="text-xs text-color-3">Todo #${t.id}</div>
                        <calcite-chip id="ttAutosaveChip" appearance="outline" scale="s">Saved</calcite-chip>
                    </div>
                    <calcite-input data-tt-field="title" data-tt-todo-id="${t.id}" value="${escapeHtml(t.title || '')}"></calcite-input>
                </div>
                <div class="space-y-3">
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

                    <calcite-label>
                        Tags (comma-separated)
                        <calcite-input data-tt-field="tag_names" data-tt-todo-id="${t.id}" value="${escapeHtml(tagsCsv)}"></calcite-input>
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

                    <calcite-label>
                        Description (markdown)
                        <calcite-text-area rows="8" data-tt-field="description" data-tt-todo-id="${t.id}"></calcite-text-area>
                    </calcite-label>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <calcite-label>
                            ✅ Work Completed
                            <calcite-text-area rows="4" data-tt-field="work_completed" data-tt-todo-id="${t.id}"></calcite-text-area>
                        </calcite-label>
                        <calcite-label>
                            📋 Work Remaining
                            <calcite-text-area rows="4" data-tt-field="work_remaining" data-tt-todo-id="${t.id}"></calcite-text-area>
                        </calcite-label>
                        <calcite-label>
                            ⚠️ Implementation Issues
                            <calcite-text-area rows="4" data-tt-field="implementation_issues" data-tt-todo-id="${t.id}"></calcite-text-area>
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

                    <calcite-notice open scale="s">
                        <div slot="message">
                            Created: ${escapeHtml(formatDate(t.created_at))}${t.updated_at && t.updated_at !== t.created_at ? ' · Updated: ' + escapeHtml(formatDate(t.updated_at)) : ''}
                        </div>
                    </calcite-notice>
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
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('Failed to fetch notes');
        const notes = await response.json();

        // Notes uses the main content area; collapse master-detail panels.
        const { startPanel, mainView } = getShellTargets();
        if (startPanel) startPanel.innerHTML = '';
        collapseDetailPanel();

        const view = mainView || document.getElementById('app-view');
        view.innerHTML = await renderNotesHTML(notes);
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
    // Render markdown
    document.querySelectorAll('.markdown-render').forEach(el => {
        renderMarkdown(el);
    });
    
    // Add create note modal
    addCreateNoteModal();
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

