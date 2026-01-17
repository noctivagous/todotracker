// Toast UI WYSIWYG Markdown editor wrapper.
// - User edits rich text (WYSIWYG) using Toast UI's built-in toolbar.
// - App stores Markdown (this.value) and emits bubbling input/change events for existing autosave logic.

(function () {
  class TtMdEditor extends HTMLElement {
    static get observedAttributes() {
      return ["value", "height", "placeholder", "name"];
    }

    constructor() {
      super();
      this._editor = null;
      this._hostEl = null;
      this._hiddenInput = null;
      this._value = "";
      this._pendingValue = null;
      this._waitTimer = null;
      this._syncTimer = null;
    }

    connectedCallback() {
      // Minimal light-DOM to allow Toast UI CSS to apply (Toast UI doesn't play nicely with Shadow DOM styling).
      if (!this._hostEl) {
        const host = document.createElement("div");
        host.className = "tt-md-editor-host";
        this._hostEl = host;
        this.appendChild(host);
      }

      this._ensureHiddenInput();

      // Capture any initial value (attribute or property).
      const attrVal = this.getAttribute("value");
      if (attrVal != null && this._pendingValue == null) this._pendingValue = String(attrVal);

      this._ensureEditor();
    }

    disconnectedCallback() {
      if (this._waitTimer) {
        clearInterval(this._waitTimer);
        this._waitTimer = null;
      }
      if (this._syncTimer) {
        clearTimeout(this._syncTimer);
        this._syncTimer = null;
      }
      try {
        if (this._editor && typeof this._editor.destroy === "function") this._editor.destroy();
      } catch (e) {}
      this._editor = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "value") {
        // External update.
        this.value = newValue == null ? "" : String(newValue);
      } else if (name === "name") {
        this._ensureHiddenInput();
      } else if (name === "height") {
        // Not all Toast UI versions support resizing post-init; ignore if already created.
        if (this._hostEl) this._hostEl.style.minHeight = String(newValue || "");
      } else if (name === "placeholder") {
        // no-op after init; placeholder is set at init.
      }
    }

    get value() {
      // Always return Markdown.
      if (this._editor && typeof this._editor.getMarkdown === "function") {
        try {
          return String(this._editor.getMarkdown() || "");
        } catch (e) {}
      }
      return String(this._value || "");
    }

    set value(v) {
      const next = String(v == null ? "" : v);
      this._value = next;
      this._pendingValue = next;

      this._ensureHiddenInput();
      if (this._hiddenInput) this._hiddenInput.value = next;

      // If editor exists, apply immediately.
      if (this._editor) this._applyPendingValue();
    }

    _ensureHiddenInput() {
      const name = this.getAttribute("name");
      if (!name) return;

      if (!this._hiddenInput) {
        const inp = document.createElement("input");
        inp.type = "hidden";
        inp.className = "tt-md-editor-hidden";
        this._hiddenInput = inp;
        this.insertBefore(inp, this.firstChild);
      }

      this._hiddenInput.name = name;
      this._hiddenInput.value = this._pendingValue != null ? String(this._pendingValue) : String(this._value || "");
    }

    _ensureEditor() {
      if (this._editor) return;
      if (!this._hostEl) return;

      const boot = () => {
        try {
          const toast = window.toastui;
          const Editor = toast && toast.Editor;
          if (!Editor) return false;

          const isDark = document.documentElement.classList.contains("calcite-mode-dark") || document.body.classList.contains("calcite-mode-dark");
          if (isDark) this._hostEl.classList.add("toastui-editor-dark");
          else this._hostEl.classList.remove("toastui-editor-dark");

          const height = this.getAttribute("height") || "240px";
          const placeholder = this.getAttribute("placeholder") || "";
          const initialValue = this._pendingValue != null ? String(this._pendingValue) : String(this._value || "");

          // Use Toast UI's built-in toolbar (do not override toolbarItems).
          this._editor = new Editor({
            el: this._hostEl,
            height,
            initialEditType: "wysiwyg",
            previewStyle: "vertical",
            initialValue,
            placeholder,
            usageStatistics: false,
          });

          // Apply any pending value (in case initialization consumed an earlier snapshot).
          this._applyPendingValue();

          // Change -> bubble to app.
          const onChange = () => this._scheduleSyncFromEditor();
          try {
            if (this._editor && typeof this._editor.on === "function") this._editor.on("change", onChange);
          } catch (e) {}

          // Fallback: poll on focus out if 'on' isn't present (older builds).
          this.addEventListener("focusout", onChange);

          return true;
        } catch (e) {
          console.error("tt-md-editor init failed:", e);
          return false;
        }
      };

      if (boot()) return;

      // Wait for toastui to load.
      if (this._waitTimer) return;
      let tries = 0;
      this._waitTimer = setInterval(() => {
        tries++;
        if (boot() || tries > 200) {
          clearInterval(this._waitTimer);
          this._waitTimer = null;
        }
      }, 50);
    }

    _applyPendingValue() {
      if (!this._editor) return;
      const v = this._pendingValue;
      if (v == null) return;
      this._pendingValue = null;
      try {
        if (typeof this._editor.setMarkdown === "function") this._editor.setMarkdown(String(v || ""));
      } catch (e) {}
    }

    _scheduleSyncFromEditor() {
      if (this._syncTimer) clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => {
        this._syncTimer = null;
        this._syncFromEditor();
      }, 150);
    }

    _syncFromEditor() {
      const md = this.value;
      this._value = md;
      if (this._hiddenInput) this._hiddenInput.value = md;

      // Existing app logic listens to 'change' (and calcite events on Calcite fields).
      try {
        this.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) {}
      try {
        this.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {}
    }
  }

  try {
    if (window.customElements && !window.customElements.get("tt-md-editor")) {
      window.customElements.define("tt-md-editor", TtMdEditor);
    }
  } catch (e) {}
})();


