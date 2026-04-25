# ✦ SnapNote – Highlight & Save Chrome Extension

SnapNote lets you capture text from any webpage as saved notes with a single click. Highlight text, choose a color, and save it instantly — then manage notes from the popup panel.

## Features

- 🖊️ **Save highlighted text** from any page using the inline tooltip
- 🎨 **Five highlight colors**: Yellow, Green, Blue, Pink, Purple
- 🔍 **Search notes** by text, page title, or tag
- 📄 **Page filter** to view notes from the current tab only
- 🏷️ **Tag notes** directly inside the popup
- ✏️ **Add manual notes** from the popup panel
- ⬇️ **Export notes** as a `.txt` file
- 🗑️ **Delete notes** individually or clear all notes
- 🌙 **Light/dark theme toggle** for the popup

## Installation

1. Download or unzip this folder
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `Snapnote` folder
6. The SnapNote icon will appear in the toolbar

## How to Use

### Highlight & Save
1. Open any website
2. Select text with your mouse
3. The SnapNote tooltip appears near your selection
4. Choose a highlight color
5. Click **Save Note**
6. A confirmation toast appears and the text is saved

### Manage Notes
- Open the popup from the toolbar icon
- Use the tabs to switch between **All**, **This Page**, and **Tagged** notes
- Search notes from the top input
- Click the delete button on a note card to remove it
- Edit tags directly on each note card

### Add Manual Notes
- Type a note in the manual note input
- Press `Enter` or click the add button to save

### Export
- Pick the export format from the dropdown in the popup header
- Click the export button to download notes immediately
- Use `DOC` for a Word-style export with bullets, metadata, and styled note blocks
- Use `TXT` for a simpler plain text export

## Project Files

```
Snapnote/
├── manifest.json       # Chrome extension configuration
├── background.js       # Service worker for background actions
├── content.js          # Page injection and highlight tooltip logic
├── content.css         # Styles for tooltip and page highlights
├── popup.html          # Extension popup UI
├── popup.js            # Popup behavior and note management
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Notes

- Notes are saved locally using Chrome storage
- Highlights use inline `mark` styling and are applied on the page after saving
- The extension supports all pages via `<all_urls>` host permissions

## Copyright

© Saint_gallery
