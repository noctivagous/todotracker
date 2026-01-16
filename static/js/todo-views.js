/**
 * Todo Views with JsRender templates and Calcite components
 * Implements Compact/Medium/Full view modes with inline editing
 */

// Wait for jQuery and JsRender to be available
(function() {
    'use strict';

    // Ensure jQuery and JsRender are loaded
    function waitForDependencies(callback) {
        if (typeof $ !== 'undefined' && typeof $.templates !== 'undefined' && typeof $.observable !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForDependencies(callback), 100);
        }
    }

    // Initialize when dependencies are ready
    waitForDependencies(function() {
        initializeTodoViews();
    });

    /**
     * Initialize todo views system
     */
    function initializeTodoViews() {
        // Register JsRender helpers
        if ($.views && $.views.helpers) {
            $.views.helpers({
                replaceUnderscores: function(str) {
                    return (str || '').replace(/_/g, ' ');
                },
                formatDate: function(dateString) {
                    if (!dateString) return '';
                    const date = new Date(dateString);
                    return date.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                },
                truncateDescription: function(text, maxLength) {
                    if (!text) return '';
                    maxLength = maxLength || 150;
                    if (text.length <= maxLength) return text;
                    return text.substring(0, maxLength) + '...';
                }
            });
        }

        // Register todo item template
        registerTodoItemTemplate();

        // Initialize view mode system
        initializeViewModeSystem();
    }

    /**
     * Register JsRender template for todo items
     */
    function registerTodoItemTemplate() {
        const todoItemTemplate = `
            {{if viewMode === 'compact'}}
                <calcite-accordion-item 
                    heading="{{:title}}" 
                    expanded="{{:expanded}}"
                    data-todo-id="{{:id}}"
                    class="tt-todo-item todo-item {{:status}}">
                    <div slot="actions-start" class="flex items-center gap-1.5 flex-wrap">
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
                    <div slot="actions-end" class="tt-no-nav" onclick="event.stopPropagation()">
                        <calcite-button href="/todo/{{:id}}" appearance="outline" scale="s">View</calcite-button>
                        <form action="/api/todos/{{:id}}/delete" method="POST" class="inline" onsubmit="return confirm('Delete this todo and all subtasks?')">
                            <calcite-button type="submit" appearance="solid" kind="danger" scale="s">Delete</calcite-button>
                        </form>
                    </div>
                    <div class="tt-todo-details-content space-y-2">
                        {{:~renderTodoDetails(#data)}}
                        {{if children && children.length > 0}}
                            <div class="tt-children-block ml-6 mt-3 space-y-2">
                                {{for children}}
                                    {{:~renderTodoItem(#data)}}
                                {{/for}}
                            </div>
                        {{/if}}
                    </div>
                </calcite-accordion-item>
            {{else}}
                <calcite-card class="tt-todo-item todo-item {{:status}}" data-todo-id="{{:id}}" data-url="/todo/{{:id}}">
                    <div slot="title" class="flex items-start justify-between gap-2">
                        <div class="flex-1 space-y-1.5 min-w-0">
                            <div class="flex items-center flex-wrap gap-1.5">
                                {{if viewMode === 'full' && editingEnabled}}
                                    <calcite-inline-editable 
                                        editing-enabled="true" 
                                        controls="true"
                                        data-todo-id="{{:id}}"
                                        class="tt-inline-edit-title">
                                        <calcite-input-text value="{{:title}}" data-role="titleInput"></calcite-input-text>
                                    </calcite-inline-editable>
                                {{else}}
                                    <span class="tt-todo-title-display text-lg font-semibold">{{:title}}</span>
                                {{/if}}
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
                        <div class="tt-no-nav flex flex-col items-end gap-1.5" onclick="event.stopPropagation()">
                            <div class="flex space-x-1.5">
                                <calcite-button href="/todo/{{:id}}" appearance="outline" scale="s">View</calcite-button>
                                {{if viewMode === 'full'}}
                                    {{if editingEnabled}}
                                        <calcite-button type="button" appearance="solid" scale="s" data-action="save" data-todo-id="{{:id}}">Save</calcite-button>
                                        <calcite-button type="button" appearance="outline" scale="s" data-action="cancel" data-todo-id="{{:id}}">Cancel</calcite-button>
                                    {{else}}
                                        <calcite-button type="button" appearance="outline" scale="s" data-action="edit" data-todo-id="{{:id}}">Edit</calcite-button>
                                    {{/if}}
                                {{/if}}
                                <form action="/api/todos/{{:id}}/delete" method="POST" class="inline" onsubmit="return confirm('Delete this todo and all subtasks?')" onclick="event.stopPropagation()">
                                    <calcite-button type="submit" appearance="solid" kind="danger" scale="s">Delete</calcite-button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div slot="content" class="tt-todo-details-content space-y-2">
                        {{:~renderTodoDetails(#data)}}
                        {{if children && children.length > 0}}
                            <div class="tt-children-block ml-6 mt-3 space-y-2">
                                {{for children}}
                                    {{:~renderTodoItem(#data)}}
                                {{/for}}
                            </div>
                        {{/if}}
                    </div>
                </calcite-card>
            {{/if}}
        `;

        // Register template for todo details (description, progress, etc.)
        const todoDetailsTemplate = `
            <div class="tt-todo-details-grid grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2">
                <div class="tt-todo-details-left space-y-2 min-w-0">
                    {{if viewMode === 'full' && editingEnabled}}
                        <calcite-label>
                            Description
                            <calcite-text-area 
                                data-role="descInput" 
                                rows="4" 
                                value="{{:description || ''}}"
                                onclick="event.stopPropagation()">
                            </calcite-text-area>
                        </calcite-label>
                    {{else}}
                        {{if viewMode === 'medium'}}
                            <div class="tt-todo-description-display text-sm text-color-2 markdown-render" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                                {{:~truncateDescription(description, 200)}}
                            </div>
                        {{else}}
                            <div class="tt-todo-description-display text-sm text-color-2 markdown-render {{if viewMode === 'full'}}tt-desc-columns{{/if}}">
                                {{:description || 'No description'}}
                            </div>
                        {{/if}}
                    {{/if}}
                    {{if (work_completed || work_remaining || implementation_issues) && viewMode !== 'medium'}}
                        <calcite-panel>
                            <div slot="header">Progress</div>
                            <div class="space-y-2">
                                {{if work_completed}}
                                    <div class="tt-todo-progress-completed">
                                        <strong>Work completed:</strong>
                                        <div class="tt-todo-progress-completed-content text-color-2 markdown-render">{{:work_completed}}</div>
                                    </div>
                                {{/if}}
                                {{if work_remaining}}
                                    <div class="tt-todo-progress-remaining">
                                        <strong>Work remaining:</strong>
                                        <div class="tt-todo-progress-remaining-content text-color-2 markdown-render">{{:work_remaining}}</div>
                                    </div>
                                {{/if}}
                                {{if implementation_issues}}
                                    <div class="tt-todo-progress-issues">
                                        <strong>Issues:</strong>
                                        <div class="tt-todo-progress-issues-content text-color-2 markdown-render">{{:implementation_issues}}</div>
                                    </div>
                                {{/if}}
                            </div>
                        </calcite-panel>
                    {{/if}}
                    <calcite-notice scale="s" open>
                        <div slot="message">
                            Created: {{:~formatDate(created_at)}}
                            {{if updated_at && updated_at !== created_at}} | Updated: {{:~formatDate(updated_at)}}{{/if}}
                        </div>
                    </calcite-notice>
                </div>
                {{if viewMode === 'full' || (viewMode === 'compact' && expanded)}}
                    <div class="tt-controls-block tt-todo-controls-box space-y-2 tt-no-nav" onclick="event.stopPropagation()">
                        <calcite-panel>
                            <div slot="header">Queue Controls</div>
                            <div class="space-y-2">
                                <form action="{{if queue && queue > 0}}/api/todos/{{:id}}/queue/remove{{else}}/api/todos/{{:id}}/queue/add{{/if}}" method="POST" class="tt-todo-queue-toggle-form">
                                    <calcite-label>
                                        <calcite-switch {{if queue && queue > 0}}checked{{/if}} onchange="this.closest('form').submit()"></calcite-switch>
                                        Queued
                                    </calcite-label>
                                </form>
                                {{if queue && queue > 0}}
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold text-color-brand">#{{:queue}}</span>
                                        <form action="/api/todos/{{:id}}/queue/up" method="POST" class="inline">
                                            <button type="submit" {{if queue <= 1}}disabled{{/if}} class="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40">↑</button>
                                        </form>
                                        <form action="/api/todos/{{:id}}/queue/down" method="POST" class="inline">
                                            <button type="submit" class="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40">↓</button>
                                        </form>
                                    </div>
                                {{/if}}
                                <div class="space-y-2">
                                    <calcite-label>
                                        Priority Class
                                        <calcite-select name="priority_class" data-todo-id="{{:id}}" data-field="priority_class" scale="s" onclick="event.stopPropagation()">
                                            <calcite-option value="" {{if !priority_class}}selected{{/if}}></calcite-option>
                                            <calcite-option value="A" {{if priority_class === 'A'}}selected{{/if}}>A</calcite-option>
                                            <calcite-option value="B" {{if priority_class === 'B'}}selected{{/if}}>B</calcite-option>
                                            <calcite-option value="C" {{if priority_class === 'C'}}selected{{/if}}>C</calcite-option>
                                            <calcite-option value="D" {{if priority_class === 'D'}}selected{{/if}}>D</calcite-option>
                                            <calcite-option value="E" {{if priority_class === 'E'}}selected{{/if}}>E</calcite-option>
                                        </calcite-select>
                                    </calcite-label>
                                    <calcite-label>
                                        Task Size (1-5)
                                        <calcite-segmented-control onclick="event.stopPropagation()">
                                            <calcite-segmented-control-item value="1" {{if task_size === 1}}checked{{/if}} data-action="set-task-size" data-value="1">1</calcite-segmented-control-item>
                                            <calcite-segmented-control-item value="2" {{if task_size === 2}}checked{{/if}} data-action="set-task-size" data-value="2">2</calcite-segmented-control-item>
                                            <calcite-segmented-control-item value="3" {{if task_size === 3}}checked{{/if}} data-action="set-task-size" data-value="3">3</calcite-segmented-control-item>
                                            <calcite-segmented-control-item value="4" {{if task_size === 4}}checked{{/if}} data-action="set-task-size" data-value="4">4</calcite-segmented-control-item>
                                            <calcite-segmented-control-item value="5" {{if task_size === 5}}checked{{/if}} data-action="set-task-size" data-value="5">5</calcite-segmented-control-item>
                                        </calcite-segmented-control>
                                    </calcite-label>
                                </div>
                            </div>
                        </calcite-panel>
                    </div>
                {{/if}}
            </div>
        `;

        // Register templates
        $.templates('todoItem', todoItemTemplate);
        $.templates('todoDetails', todoDetailsTemplate);

        // Register helper to render todo details
        if ($.views && $.views.helpers) {
            $.views.helpers({
                renderTodoDetails: function(todo) {
                    const template = $.templates.todoDetails;
                    // Get current view mode from parent context or global
                    const viewMode = this.viewMode || (window.getCurrentViewMode ? window.getCurrentViewMode() : 'full');
                    return template.render({
                        ...todo,
                        viewMode: viewMode
                    });
                },
                renderTodoItem: function(todo) {
                    const template = $.templates.todoItem;
                    // Get current view mode from parent context or global
                    const viewMode = this.viewMode || (window.getCurrentViewMode ? window.getCurrentViewMode() : 'full');
                    // Get expanded state for compact view
                    const expanded = todo.expanded !== undefined ? todo.expanded : false;
                    // Get editing state
                    const editingEnabled = todo.editingEnabled !== undefined ? todo.editingEnabled : false;
                    // Pass viewMode to children via context
                    const context = { viewMode: viewMode };
                    return template.render({
                        ...todo,
                        viewMode: viewMode,
                        expanded: expanded,
                        editingEnabled: editingEnabled
                    }, context);
                }
            });
        }
    }

    /**
     * Initialize view mode system
     */
    function initializeViewModeSystem() {
        const VIEW_KEY = 'tt-view-mode';
        const DESC_COLS_KEY = 'tt-desc-columns';
        const DEFAULT_VIEW = 'full';
        const DEFAULT_DESC_COLS = 2;

        // Get current view mode
        window.getCurrentViewMode = function() {
            try {
                return localStorage.getItem(VIEW_KEY) || DEFAULT_VIEW;
            } catch (e) {
                return DEFAULT_VIEW;
            }
        };

        // Set view mode
        window.setViewMode = function(mode) {
            try {
                localStorage.setItem(VIEW_KEY, mode);
            } catch (e) {}
            document.documentElement.setAttribute('data-tt-view', mode);
            
            // Re-render todos if list exists
            if (window.rerenderTodos) {
                window.rerenderTodos();
            }
        };

        // Get description columns
        window.getDescCols = function() {
            try {
                const v = parseInt(localStorage.getItem(DESC_COLS_KEY) || String(DEFAULT_DESC_COLS), 10);
                if (Number.isFinite(v) && v >= 1 && v <= 3) return v;
            } catch (e) {}
            return DEFAULT_DESC_COLS;
        };

        // Set description columns
        window.setDescCols = function(cols) {
            try {
                localStorage.setItem(DESC_COLS_KEY, String(cols));
            } catch (e) {}
            document.documentElement.style.setProperty('--tt-desc-columns', String(cols));
        };

        // Initialize from localStorage
        const initialView = window.getCurrentViewMode();
        const initialCols = window.getDescCols();
        window.setDescCols(initialCols);
        window.setViewMode(initialView);
    }

    /**
     * Create observable todo model
     */
    window.createObservableTodo = function(todoData) {
        if (typeof $.observable === 'undefined') {
            console.error('JsViews not loaded');
            return todoData;
        }

        const observable = $.observable(todoData);
        
        // Add methods for state management
        observable.setExpanded = function(expanded) {
            observable.setProperty('expanded', expanded);
            // Persist to localStorage
            if (todoData.id) {
                try {
                    localStorage.setItem(`tt-accordion-${todoData.id}`, expanded ? '1' : '0');
                } catch (e) {}
            }
        };

        observable.setEditing = function(editing) {
            observable.setProperty('editingEnabled', editing);
        };

        return observable;
    };

    /**
     * Initialize accordion event handlers for compact view
     */
    window.initializeAccordionHandlers = function() {
        document.addEventListener('calciteAccordionItemExpand', function(e) {
            const item = e.target;
            const todoId = item.getAttribute('data-todo-id');
            if (todoId) {
                try {
                    localStorage.setItem(`tt-accordion-${todoId}`, '1');
                } catch (err) {}
            }
        });

        document.addEventListener('calciteAccordionItemCollapse', function(e) {
            const item = e.target;
            const todoId = item.getAttribute('data-todo-id');
            if (todoId) {
                try {
                    localStorage.setItem(`tt-accordion-${todoId}`, '0');
                } catch (err) {}
            }
        });
    };

    /**
     * Initialize inline editing handlers
     */
    window.initializeInlineEditing = function() {
        let currentEditingId = null;

        // Handle edit button clicks
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action="edit"]');
            if (target && window.getCurrentViewMode() === 'full') {
                const todoId = parseInt(target.getAttribute('data-todo-id'));
                if (todoId) {
                    enterEditMode(todoId);
                }
            }
        });

        // Handle save button clicks
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action="save"]');
            if (target) {
                const todoId = parseInt(target.getAttribute('data-todo-id'));
                if (todoId) {
                    saveEdit(todoId);
                }
            }
        });

        // Handle cancel button clicks
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-action="cancel"]');
            if (target) {
                const todoId = parseInt(target.getAttribute('data-todo-id'));
                if (todoId) {
                    cancelEdit(todoId);
                }
            }
        });

        // Handle Calcite Inline Editable confirm event
        document.addEventListener('calciteInlineEditableEditConfirm', async function(e) {
            const inlineEditable = e.target;
            const todoId = parseInt(inlineEditable.getAttribute('data-todo-id'));
            if (todoId) {
                const input = inlineEditable.querySelector('calcite-input-text');
                const newTitle = input ? input.value.trim() : '';
                if (newTitle) {
                    await saveTodoField(todoId, 'title', newTitle);
                }
            }
        });

        function enterEditMode(todoId) {
            if (currentEditingId && currentEditingId !== todoId) {
                cancelEdit(currentEditingId);
            }
            currentEditingId = todoId;
            const item = document.querySelector(`[data-todo-id="${todoId}"]`);
            if (item) {
                item.setAttribute('data-tt-editing', '1');
                // Enable inline editable
                const inlineEditable = item.querySelector('.tt-inline-edit-title');
                if (inlineEditable) {
                    inlineEditable.editingEnabled = true;
                }
            }
        }

        function cancelEdit(todoId) {
            const item = document.querySelector(`[data-todo-id="${todoId}"]`);
            if (item) {
                item.removeAttribute('data-tt-editing');
                const inlineEditable = item.querySelector('.tt-inline-edit-title');
                if (inlineEditable) {
                    inlineEditable.editingEnabled = false;
                }
            }
            if (currentEditingId === todoId) {
                currentEditingId = null;
            }
        }

        async function saveEdit(todoId) {
            const item = document.querySelector(`[data-todo-id="${todoId}"]`);
            if (!item) return;

            const titleInput = item.querySelector('[data-role="titleInput"]');
            const descInput = item.querySelector('[data-role="descInput"]');
            const newTitle = titleInput ? (titleInput.value || titleInput.getAttribute('value') || '').trim() : '';
            const newDesc = descInput ? descInput.value : '';

            if (!newTitle) {
                alert('Title is required.');
                if (titleInput) titleInput.focus();
                return;
            }

            try {
                const formData = new FormData();
                formData.append('title', newTitle);
                formData.append('description', newDesc);

                const resp = await fetch(`/api/todos/${todoId}/update`, {
                    method: 'POST',
                    body: formData,
                    redirect: 'manual'
                });

                if (resp.ok || resp.status === 303 || resp.status === 302) {
                    // Update display
                    const titleDisplay = item.querySelector('.tt-todo-title-display');
                    if (titleDisplay) titleDisplay.textContent = newTitle;
                    
                    const descDisplay = item.querySelector('.tt-todo-description-display');
                    if (descDisplay) {
                        descDisplay.textContent = newDesc || 'No description';
                        if (typeof renderMarkdown === 'function') {
                            renderMarkdown(descDisplay);
                        }
                    }

                    cancelEdit(todoId);
                } else {
                    throw new Error(`Update failed (${resp.status})`);
                }
            } catch (e) {
                console.error(e);
                alert('Failed to save changes. Please try again.');
            }
        }

        async function saveTodoField(todoId, field, value) {
            const formData = new FormData();
            formData.append(field, value);

            try {
                const resp = await fetch(`/api/todos/${todoId}/update`, {
                    method: 'POST',
                    body: formData,
                    redirect: 'manual'
                });

                if (!resp.ok && resp.status !== 303 && resp.status !== 302) {
                    throw new Error(`Update failed (${resp.status})`);
                }
            } catch (e) {
                console.error('Error updating todo:', e);
                throw e;
            }
        }
    };

    // Initialize handlers when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.initializeAccordionHandlers();
            window.initializeInlineEditing();
        });
    } else {
        window.initializeAccordionHandlers();
        window.initializeInlineEditing();
    }

})();

