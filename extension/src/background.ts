// Service worker — minimal for Phase 6a.
//
// One job: when the user clicks the extension's toolbar icon, open the side
// panel for the current window. Without this, clicking the action does nothing.
// Chrome ≥ 114 provides `chrome.sidePanel.setPanelBehavior` which lets us
// open-on-click as the default behavior.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("[bg] setPanelBehavior failed:", err));
});
