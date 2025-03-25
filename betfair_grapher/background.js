// Store information about which tabs have the content script
const injectedTabs = new Map();

// Handle errors to prevent extension context invalidation
function handleError(error) {
  console.error("Extension error:", error);
}

// Message handler to receive registration from content scripts
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "contentScriptLoaded" && sender.tab) {
    injectedTabs.set(sender.tab.id, true);
    console.log(`Content script registered in tab ${sender.tab.id}`);
    return true;
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (injectedTabs.has(tabId)) {
    injectedTabs.delete(tabId);
    console.log(`Tab ${tabId} closed, removed from tracking`);
  }
});

// Only inject if the script hasn't been injected already
function injectContentScriptIfNeeded(tabId, url) {
  // Only proceed for Betfair horse racing pages
  if (!url.includes("betfair.com.au/exchange/plus/horse-racing")) {
    return;
  }

  // Check if we've already injected into this tab
  if (injectedTabs.has(tabId)) {
    console.log(`Tab ${tabId} already has content script`);
    return;
  }

  console.log(`Injecting content script into tab ${tabId}`);
  
  // Mark this tab as injected before we actually inject
  // This prevents race conditions where we might try to inject twice
  injectedTabs.set(tabId, true);
  
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"]
  })
  .then(() => {
    console.log(`Successfully injected content script into tab ${tabId}`);
  })
  .catch((error) => {
    console.error(`Failed to inject into tab ${tabId}:`, error);
    // If injection failed, remove from our tracking
    injectedTabs.delete(tabId);
  });
}

// Listen for navigation events with URL filtering to reduce overhead
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    console.log("Detected navigation to a new page:", details.url);
    injectContentScriptIfNeeded(details.tabId, details.url);
  },
  { url: [{ hostContains: "betfair.com.au" }] }
);

chrome.webNavigation.onCompleted.addListener(
  (details) => {
    console.log("Page load completed:", details.url);
    injectContentScriptIfNeeded(details.tabId, details.url);
  },
  { url: [{ hostContains: "betfair.com.au" }] }
);

// Keep the service worker alive
function keepAlive() {
  console.log("Keeping service worker alive...");
  setTimeout(keepAlive, 20000); // Run every 20 seconds
}

// Start the keep-alive loop
keepAlive();

console.log("Background script initialized");