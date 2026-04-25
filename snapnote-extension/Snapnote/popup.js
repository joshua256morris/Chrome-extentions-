// SnapNote Popup
const COLORS = {
  yellow: "#F9A825",
  green:  "#388E3C",
  blue:   "#1565C0",
  pink:   "#C2185B",
  purple: "#6A1B9A"
};

let allNotes = [];
let currentTab = "all";
let sortOrder = "newest";
let currentPageUrl = "";
let searchQuery = "";

// Init
document.addEventListener("DOMContentLoaded", async () => {
  // Get current page URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentPageUrl = tab?.url || "";

  loadNotes();
  setupEvents();
  loadTheme();
});

function loadNotes() {
  chrome.storage.local.get({ notes: [] }, ({ notes }) => {
    allNotes = notes;
    renderNotes();
  });
}

function setupEvents() {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      renderNotes();
    });
  });

  // Search
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderNotes();
  });

  // Sort
  document.getElementById("sortBtn").addEventListener("click", () => {
    sortOrder = sortOrder === "newest" ? "oldest" : "newest";
    document.getElementById("sortBtn").title = sortOrder === "newest" ? "Newest first" : "Oldest first";
    renderNotes();
  });

  // Export
  document.getElementById("exportBtn").addEventListener("click", exportNotes);

  // Add note
  document.getElementById("addNoteBtn").addEventListener("click", addManualNote);
  document.getElementById("manualNoteInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addManualNote(); }
  });

  // Clear all
  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (confirm("Delete all notes? This cannot be undone.")) {
      chrome.storage.local.set({ notes: [] }, () => {
        allNotes = [];
        renderNotes();
      });
    }
  });

  // Theme toggle
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Note dialog controls
  document.getElementById('noteDialogClose').addEventListener('click', hideNoteDialog);
  document.getElementById('noteDialogOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'noteDialogOverlay') hideNoteDialog();
  });
}

function getFilteredNotes() {
  let notes = [...allNotes];

  // Tab filter
  if (currentTab === "page") {
    notes = notes.filter(n => n.url === currentPageUrl);
  } else if (currentTab === "tagged") {
    notes = notes.filter(n => n.tag && n.tag.trim());
  }

  // Search filter
  if (searchQuery) {
    notes = notes.filter(n =>
      n.text.toLowerCase().includes(searchQuery) ||
      (n.tag || "").toLowerCase().includes(searchQuery) ||
      (n.pageTitle || "").toLowerCase().includes(searchQuery)
    );
  }

  // Sort
  notes.sort((a, b) => {
    const da = new Date(a.createdAt), db = new Date(b.createdAt);
    return sortOrder === "newest" ? db - da : da - db;
  });

  return notes;
}

function renderNotes() {
  const filtered = getFilteredNotes();
  const list = document.getElementById("notesList");
  const total = allNotes.length;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("statsText").innerHTML = `<strong>${total}</strong> note${total !== 1 ? "s" : ""} saved`;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${searchQuery ? "🔍" : currentTab === "page" ? "📄" : '<img src="icons/icon48.png" alt="SnapNote logo" class="empty-logo" />'}</div>
        <div class="empty-title">${searchQuery ? "No results found" : currentTab === "page" ? "No notes on this page" : "No notes yet"}</div>
        <div class="empty-sub">${searchQuery ? "Try a different search term." : "Highlight any text on a webpage and click <b>Save Note</b> to get started."}</div>
      </div>
    `;
    return;
  }

  list.innerHTML = "";
  filtered.forEach(note => {
    const card = createNoteCard(note);
    list.appendChild(card);
  });
}

function createNoteCard(note) {
  const card = document.createElement("div");
  card.className = "note-card";
  card.dataset.id = note.id;

  const color = COLORS[note.color] || COLORS.yellow;
  const domain = getDomain(note.url);
  const favicon = `https://www.google.com/s2/favicons?sz=16&domain=${domain}`;
  const dateStr = formatDate(note.createdAt);
  const shortUrl = domain || "manual";

  card.innerHTML = `
    <div class="note-color-bar" style="background:${color}"></div>
    <div class="note-header">
      <div class="note-source">
        ${note.url ? `<img class="note-favicon" src="${favicon}" alt="" onerror="this.style.display='none'" />` : ""}
        <span class="note-page-title" title="${escHtml(note.pageTitle || note.url || "Manual note")}">
          ${escHtml(note.pageTitle || shortUrl || "Manual note")}
        </span>
      </div>
      <div class="note-actions">
        <button class="note-action-btn copy" data-id="${note.id}" title="Copy text">⎘</button>
        <button class="note-action-btn delete" data-id="${note.id}" title="Delete">✕</button>
      </div>
    </div>
    <div class="note-text">${escHtml(note.text)}</div>
    <div class="note-footer">
      <input type="text" class="note-tag-input" placeholder="# add tag" value="${escHtml(note.tag || "")}" data-id="${note.id}" maxlength="30" spellcheck="false" />
      <span class="note-date">${dateStr}</span>
      ${note.url ? `<a class="note-link" href="${note.url}" target="_blank" title="${escHtml(note.url)}">${shortUrl}</a>` : ""}
    </div>
  `;

  // Copy button
  card.querySelector(".note-action-btn.copy").addEventListener("click", () => {
    navigator.clipboard.writeText(note.text).then(() => showCopyFlash());
  });

  // Delete button
  card.querySelector(".note-action-btn.delete").addEventListener("click", () => {
    deleteNote(note.id);
  });

  // Tag input
  const tagInput = card.querySelector(".note-tag-input");
  tagInput.addEventListener("change", (e) => {
    updateNoteTag(note.id, e.target.value.trim());
  });

  // Hover tooltip
  card.addEventListener('mouseenter', () => showNoteTooltip(note, card));
  card.addEventListener('mouseleave', hideNoteTooltip);

  // Click to open detail dialog
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.note-action-btn') && !e.target.closest('.note-tag-input') && !e.target.closest('.note-link')) {
      showNoteDialog(note);
    }
  });

  return card;
}

function deleteNote(id) {
  allNotes = allNotes.filter(n => n.id !== id);
  chrome.storage.local.set({ notes: allNotes }, renderNotes);
}

function updateNoteTag(id, tag) {
  const note = allNotes.find(n => n.id === id);
  if (note) {
    note.tag = tag;
    chrome.storage.local.set({ notes: allNotes });
  }
}

function addManualNote() {
  const input = document.getElementById("manualNoteInput");
  const text = input.value.trim();
  if (!text) return;

  const note = {
    id: Date.now(),
    text,
    url: currentPageUrl,
    pageTitle: "",
    color: "yellow",
    tag: "",
    createdAt: new Date().toISOString()
  };

  // Try to get page title
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) note.pageTitle = tabs[0].title || "";
    allNotes.unshift(note);
    chrome.storage.local.set({ notes: allNotes }, () => {
      renderNotes();
      input.value = "";
      // Switch back to All tab
      if (currentTab !== "all") {
        document.querySelector('[data-tab="all"]').click();
      }
    });
  });
}

function buildExportDocHtml(notes) {
  const rows = notes.map((n, index) => {
    const created = new Date(n.createdAt).toLocaleString();
    const pageTitle = escHtml(n.pageTitle || n.url || "Manual note");
    const sourceUrl = n.url ? escHtml(n.url) : "–";
    const text = escHtml(n.text).replace(/\n/g, "<br>");
    const tag = escHtml(n.tag || "None");

    return `
      <li style="margin-bottom: 22px; padding: 14px; border: 1px solid #d8dce7; border-radius: 12px; background: #fbfbfb;">
        <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #111;">${index + 1}. ${pageTitle}</div>
        <div style="font-size: 13px; line-height: 1.5; margin-bottom: 10px; color: #4f5565;">
          <strong>Date:</strong> ${created}<br>
          <strong>Source:</strong> ${sourceUrl}<br>
          <strong>Tag:</strong> ${tag}
        </div>
        <div style="font-size: 14px; line-height: 1.7; padding: 12px; background: #ffffff; border-left: 4px solid #8b5cf6; white-space: pre-wrap; color: #1f2937;">
          ${text}
        </div>
      </li>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SnapNote Export</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; margin: 24px;">
  <h1 style="font-size: 24px; margin-bottom: 6px;">SnapNote Export</h1>
  <p style="margin-top:0; margin-bottom:18px; color:#4b5563;">Export generated on ${new Date().toLocaleString()}</p>
  <ol style="padding-left:18px; margin:0;">${rows}</ol>
</body>
</html>`;
}

function exportNotes() {
  const notes = getFilteredNotes();
  if (notes.length === 0) {
    alert("No notes available to export.");
    return;
  }

  const formatSelect = document.getElementById("exportFormat");
  const selection = formatSelect?.value || "doc";
  let blob;
  let filename;

  if (selection === "txt") {
    const lines = notes.map(n => {
      const d = new Date(n.createdAt).toLocaleString();
      return `[${d}] ${n.pageTitle || n.url || "Manual"}\n${n.text}${n.tag ? "\nTag: " + n.tag : ""}\nSource: ${n.url || "–"}`;
    });
    const content = lines.join("\n\n---\n\n");
    blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    filename = `snapnote-export-${new Date().toISOString().slice(0, 10)}.txt`;
  } else {
    const content = buildExportDocHtml(notes);
    blob = new Blob([content], { type: "application/msword;charset=utf-8" });
    filename = `snapnote-export-${new Date().toISOString().slice(0, 10)}.doc`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch { return ""; }
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function escHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showCopyFlash() {
  const el = document.getElementById("copyFlash");
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1500);
}

// ─── Theme Functions ───────────────────────────────────────────────────────

function loadTheme() {
  chrome.storage.sync.get('theme', (data) => {
    if (data.theme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  });
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  if (isDark) {
    document.body.classList.remove('dark-theme');
    chrome.storage.sync.set({ theme: 'light' });
  } else {
    document.body.classList.add('dark-theme');
    chrome.storage.sync.set({ theme: 'dark' });
  }
}

// ─── Note Preview Functions ───────────────────────────────────────────────

function showNoteTooltip(note, card) {
  const tooltip = document.getElementById('noteTooltip');
  const content = tooltip.querySelector('.note-tooltip-content');
  content.textContent = note.text;

  const rect = card.getBoundingClientRect();
  tooltip.style.left = (rect.left + rect.width / 2 - 150) + 'px'; // Center horizontally
  tooltip.style.top = (rect.top - 10 - tooltip.offsetHeight) + 'px'; // Above the card

  // Ensure it doesn't go off screen
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.left < 10) tooltip.style.left = '10px';
  if (tooltipRect.right > window.innerWidth - 10) tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
  if (tooltipRect.top < 10) tooltip.style.top = (rect.bottom + 10) + 'px'; // Below if above doesn't fit

  tooltip.classList.add('show');
}

function hideNoteTooltip() {
  const tooltip = document.getElementById('noteTooltip');
  tooltip.classList.remove('show');
}

function showNoteDialog(note) {
  const overlay = document.getElementById('noteDialogOverlay');
  const body = document.getElementById('noteDialogBody');
  const footer = document.getElementById('noteDialogFooter');

  const pageTitle = note.pageTitle || note.url || 'Manual note';
  const source = note.url ? note.url : 'Manual note';
  const tag = note.tag ? `<span class="note-dialog-tag">#${escHtml(note.tag)}</span>` : '';
  const date = formatDate(note.createdAt);

  body.innerHTML = `<strong>${escHtml(pageTitle)}</strong><p style="margin: 10px 0 0;">${escHtml(note.text).replace(/\n/g, '<br>')}</p>`;
  footer.innerHTML = `${tag}<span>${date}</span>${note.url ? `<a class="note-link" href="${escHtml(note.url)}" target="_blank">Open source</a>` : ''}`;

  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideNoteDialog() {
  const overlay = document.getElementById('noteDialogOverlay');
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
}
