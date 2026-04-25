// SnapNote Content Script
(function () {
  if (window.__snapnoteInjected) return;
  window.__snapnoteInjected = true;

  const COLORS = {
    yellow: { bg: "#FFF176", border: "#F9A825", text: "#333" },
    green:  { bg: "#C8E6C9", border: "#388E3C", text: "#333" },
    blue:   { bg: "#BBDEFB", border: "#1565C0", text: "#333" },
    pink:   { bg: "#F8BBD0", border: "#C2185B", text: "#333" },
    purple: { bg: "#E1BEE7", border: "#6A1B9A", text: "#333" }
  };

  let tooltip = null;
  let selectedText = "";
  let selectedRange = null;
  let currentTheme = 'light';

  // Load initial theme
  chrome.storage.sync.get('theme', (data) => {
    currentTheme = data.theme || 'light';
  });

  // Listen for theme changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.theme) {
      currentTheme = changes.theme.newValue || 'light';
      if (tooltip) {
        if (currentTheme === 'dark') {
          tooltip.classList.add('dark-theme');
        } else {
          tooltip.classList.remove('dark-theme');
        }
      }
    }
  });

  // Create tooltip element
  function createTooltip() {
    const el = document.createElement("div");
    el.id = "snapnote-tooltip";
    if (currentTheme === 'dark') {
      el.classList.add('dark-theme');
    }
    el.innerHTML = `
      <div class="sn-tooltip-inner">
        <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="SnapNote" class="sn-logo-img" />
        <div class="sn-colors">
          ${Object.entries(COLORS).map(([name, c]) =>
            `<button class="sn-color-btn" data-color="${name}" style="background:${c.bg};border-color:${c.border}" title="${name}"></button>`
          ).join("")}
        </div>
        <button class="sn-save-btn" id="sn-save-btn">Save Note</button>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelectorAll(".sn-color-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        el.querySelectorAll(".sn-color-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        el.dataset.selectedColor = btn.dataset.color;
      });
    });

    // Default color
    el.querySelector('[data-color="yellow"]').classList.add("active");
    el.dataset.selectedColor = "yellow";

    document.getElementById("sn-save-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      saveNote(el.dataset.selectedColor);
    });

    return el;
  }

  function showTooltip(x, y) {
    if (!tooltip) tooltip = createTooltip();
    tooltip.style.display = "block";

    // Position above selection
    const tooltipW = 260;
    const left = Math.min(x - tooltipW / 2, window.innerWidth - tooltipW - 12);
    tooltip.style.left = Math.max(8, left) + "px";
    tooltip.style.top = (y + window.scrollY - 64) + "px";

    // Animate in
    tooltip.classList.remove("sn-visible");
    requestAnimationFrame(() => tooltip.classList.add("sn-visible"));
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.classList.remove("sn-visible");
      setTimeout(() => { if (tooltip) tooltip.style.display = "none"; }, 180);
    }
  }

  function saveNote(color) {
    if (!selectedText.trim()) return;
    const note = {
      id: Date.now(),
      text: selectedText.trim(),
      url: location.href,
      pageTitle: document.title,
      color: color || "yellow",
      tag: "",
      createdAt: new Date().toISOString()
    };

    chrome.storage.local.get({ notes: [] }, (data) => {
      const notes = data.notes;
      notes.unshift(note);
      chrome.storage.local.set({ notes }, () => {
        showSavedFeedback();
        highlightSelection(color);
        hideTooltip();
      });
    });
  }

  function showSavedFeedback() {
    const feedback = document.createElement("div");
    feedback.id = "sn-feedback";
    if (currentTheme === 'dark') {
      feedback.classList.add('dark-theme');
    }
    feedback.textContent = "✦ Note saved!";
    document.body.appendChild(feedback);
    requestAnimationFrame(() => feedback.classList.add("sn-visible"));
    setTimeout(() => {
      feedback.classList.remove("sn-visible");
      setTimeout(() => feedback.remove(), 400);
    }, 1800);
  }

  function highlightSelection(color) {
    if (!selectedRange) return;
    const c = COLORS[color] || COLORS.yellow;
    try {
      const mark = document.createElement("mark");
      mark.className = "snapnote-highlight";
      mark.style.cssText = `background:${c.bg};border-bottom:2px solid ${c.border};color:inherit;padding:0 1px;border-radius:2px;`;
      mark.title = "SnapNote highlight";
      selectedRange.surroundContents(mark);
    } catch (e) {
      // Ignore complex selections (cross-element)
    }
  }

  document.addEventListener("mouseup", (e) => {
    if (tooltip && tooltip.contains(e.target)) return;

    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text.length > 2) {
        selectedText = text;
        try { selectedRange = sel.getRangeAt(0).cloneRange(); } catch (_) {}
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showTooltip(rect.left + rect.width / 2, rect.top);
      } else {
        hideTooltip();
        selectedText = "";
        selectedRange = null;
      }
    }, 10);
  });

  document.addEventListener("keydown", (e) => {
    const isSaveShortcut = (e.key.toLowerCase() === "s") && (e.shiftKey && (e.ctrlKey || e.metaKey));
    if (isSaveShortcut) {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text.length > 2) {
        selectedText = text;
        try { selectedRange = sel.getRangeAt(0).cloneRange(); } catch (_) { selectedRange = null; }
        const color = tooltip?.dataset.selectedColor || "yellow";
        saveNote(color);
        e.preventDefault();
      }
    }

    if (e.key === "Escape") hideTooltip();
  });

  document.addEventListener("scroll", () => {
    if (tooltip && tooltip.style.display === "block") hideTooltip();
  });
})();
