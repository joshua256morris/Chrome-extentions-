// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "snapnote-save",
    title: "Save to SnapNote",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "snapnote-save" && info.selectionText) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: saveSelectionFromContextMenu,
      args: [info.selectionText, tab.url, tab.title]
    });
  }
});

function saveSelectionFromContextMenu(text, url, pageTitle) {
  chrome.storage.local.get({ notes: [] }, (data) => {
    const notes = data.notes;
    notes.unshift({
      id: Date.now(),
      text: text,
      url: url,
      pageTitle: pageTitle,
      color: "yellow",
      tag: "",
      createdAt: new Date().toISOString()
    });
    chrome.storage.local.set({ notes });
  });
}
