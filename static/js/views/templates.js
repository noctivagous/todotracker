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

    // Master-detail inspector panel (used by SPA shell endPanel/mainView).
    // Uses JsViews data-linking for incremental updates, while remaining render() friendly.
    'todo-detail-panel': `
        <div class="tt-todo-detail-root space-y-3">
            <div class="flex items-center justify-between gap-2">
                <calcite-button appearance="outline" scale="s" onclick="router.navigate('/')">← Back</calcite-button>
                <span data-link="html{:depsChipHtml}">{{:depsChipHtml}}</span>
            </div>

            <calcite-card>
                <div slot="title" class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                        <div class="text-xs text-color-3 truncate" data-link="text{:titleMeta}">{{>titleMeta}}</div>
                        <calcite-chip id="ttAutosaveChip" appearance="outline" scale="s">Saved</calcite-chip>
                    </div>

                    <span data-link="html{:authorSignpostHtml}">{{:authorSignpostHtml}}</span>

                    <span data-link="html{:topFieldsGridHtml}">{{:topFieldsGridHtml}}</span>

                    <calcite-input class="tt-title-input" scale="l" data-tt-field="title" data-tt-todo-id="{{:todoId}}"></calcite-input>

                    <span data-link="html{:descriptionBlockHtml}">{{:descriptionBlockHtml}}</span>
                </div>

                <div class="space-y-3">
                    <span data-link="html{:tagsBlockHtml}">{{:tagsBlockHtml}}</span>

                    <span data-link="html{:infoFieldsGridHtml}">{{:infoFieldsGridHtml}}</span>

                    <span data-link="html{:advancedFieldsGridHtml}">{{:advancedFieldsGridHtml}}</span>

                    <span data-link="html{:relatesPanelHtml}">{{:relatesPanelHtml}}</span>
                    <span data-link="html{:attachmentsPanelHtml}">{{:attachmentsPanelHtml}}</span>
                    <span data-link="html{:subtasksPanelHtml}">{{:subtasksPanelHtml}}</span>
                    <span data-link="html{:progressBlockHtml}">{{:progressBlockHtml}}</span>
                    <span data-link="html{:depsPanelHtml}">{{:depsPanelHtml}}</span>
                    <span data-link="html{:notesPanelHtml}">{{:notesPanelHtml}}</span>
                </div>
            </calcite-card>
        </div>
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


// NOTE: In the split-file setup, helpers like `renderTodoItem` are declared in later scripts.
// We intentionally do NOT auto-register templates here.
// `app.js` calls `ensureTemplatesRegistered()` once all view scripts are loaded.
