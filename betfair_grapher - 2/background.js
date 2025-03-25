// Store information about which tabs have the content script
const injectedTabs = new Map();
const priceHistory = new Map(); // Store price history by market ID

// Handle errors to prevent extension context invalidation
function handleError(error) {
  console.error("Extension error:", error);
}

// Message handler to receive registration from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === "contentScriptLoaded" && sender.tab) {
      injectedTabs.set(sender.tab.id, true);
      console.log(`Content script registered in tab ${sender.tab.id}`);
      return true;
    }
    
    // Handle price alerts
    if (message.action === "priceAlert") {
      showPriceAlert(message.data);
      return true;
    }
    
    // Handle data storage for history
    if (message.action === "storeHistory" && message.data) {
      storeHistoryData(message.data);
      return true;
    }
  } catch (error) {
    handleError(error);
  }
  
  return false;
});

// Function to handle price alerts
function showPriceAlert(data) {
  if (!data || !data.runner) return;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: `${data.runner} Price Alert`,
    message: `${data.type} price has ${data.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(data.change)} to ${data.newPrice}`,
    priority: 2
  });
}

// Store price history data
function storeHistoryData(data) {
  if (!data || !data.marketId || !data.runners) return;
  
  const marketId = data.marketId;
  const timestamp = data.timestamp || new Date().toISOString();
  
  if (!priceHistory.has(marketId)) {
    priceHistory.set(marketId, []);
  }
  
  const marketHistory = priceHistory.get(marketId);
  marketHistory.push({
    timestamp,
    runners: data.runners
  });
  
  // Keep history size manageable
  if (marketHistory.length > 100) {
    marketHistory.shift(); // Remove oldest entry
  }
  
  // Store the updated history
  chrome.storage.local.set({
    priceHistory: Object.fromEntries(priceHistory)
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error storing price history:", chrome.runtime.lastError);
    }
  });
}

// Clean up history based on settings
function cleanupHistory() {
  chrome.storage.sync.get({ historyDuration: 7, storeHistory: true }, (settings) => {
    if (!settings.storeHistory) {
      // Clear all history if history storage is disabled
      priceHistory.clear();
      chrome.storage.local.remove('priceHistory');
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.historyDuration);
    
    let removedEntries = 0;
    
    // Filter out old entries
    priceHistory.forEach((history, marketId) => {
      const newHistory = history.filter(entry => {
        return new Date(entry.timestamp) >= cutoffDate;
      });
      
      removedEntries += (history.length - newHistory.length);
      
      if (newHistory.length === 0) {
        priceHistory.delete(marketId);
      } else {
        priceHistory.set(marketId, newHistory);
      }
    });
    
    if (removedEntries > 0) {
      console.log(`Cleaned up ${removedEntries} old history entries`);
      
      // Save the cleaned history
      chrome.storage.local.set({
        priceHistory: Object.fromEntries(priceHistory)
      });
    }
  });
}

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

// Load history data when the background script starts
function loadStoredHistory() {
  chrome.storage.local.get('priceHistory', (data) => {
    if (chrome.runtime.lastError) {
      console.error("Error loading history:", chrome.runtime.lastError);
      return;
    }
    
    if (data.priceHistory) {
      // Convert from object to Map
      Object.entries(data.priceHistory).forEach(([marketId, history]) => {
        priceHistory.set(marketId, history);
      });
      console.log(`Loaded price history for ${priceHistory.size} markets`);
    }
  });
}

// Run cleanup daily
function scheduleHistoryCleanup() {
  cleanupHistory();
  // Schedule next cleanup in 24 hours
  setTimeout(scheduleHistoryCleanup, 24 * 60 * 60 * 1000);
}

// Keep the service worker alive
function keepAlive() {
  console.log("Keeping service worker alive...");
  setTimeout(keepAlive, 20000); // Run every 20 seconds
}

// Initialize
loadStoredHistory();
scheduleHistoryCleanup();
keepAlive();

console.log("Background script initialized");

function updatePageDisplay(runners) {
  try {
    let container = document.getElementById('price-tracker-container');

    // Create container if it doesn't exist
    if (!container) {
      // ... [existing container creation code] ...
    }

    // Clear existing content (except header)
    const headerDiv = container.firstChild;
    container.innerHTML = '';
    container.appendChild(headerDiv);

    // Add runner information
    runners.forEach((runner) => {
      const runnerDiv = document.createElement('div');
      runnerDiv.style.marginBottom = '10px';
      runnerDiv.style.padding = '8px';
      runnerDiv.style.backgroundColor = '#ffffff';
      runnerDiv.style.borderRadius = '4px';
      runnerDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

      const nameElement = document.createElement('div');
      nameElement.textContent = runner.name;
      nameElement.style.fontWeight = 'bold';
      nameElement.style.fontSize = '14px';
      nameElement.style.marginBottom = '5px';

      const backPriceDisplay = document.createElement('div');
      backPriceDisplay.style.display = 'flex';
      backPriceDisplay.style.justifyContent = 'space-between';
      backPriceDisplay.style.alignItems = 'center';
      backPriceDisplay.style.marginBottom = '3px';
      
      const backLabel = document.createElement('span');
      backLabel.textContent = `Best Back: ${runner.bestBackPrice || 'N/A'}`;
      backPriceDisplay.appendChild(backLabel);
      
      // Add price change indicator for back prices
      if (runner.backPriceChange) {
        const priceChangeElement = document.createElement('span');
        priceChangeElement.textContent = runner.backPriceChange > 0 
          ? `+${runner.backPriceChange}` 
          : `${runner.backPriceChange}`;
        priceChangeElement.style.marginLeft = '5px';
        priceChangeElement.style.fontWeight = 'bold';
        priceChangeElement.style.color = runner.backPriceChange > 0 
          ? '#28a745' // Green for price increase
          : runner.backPriceChange < 0 
            ? '#dc3545' // Red for price decrease
            : '#6c757d'; // Gray for no change
        backPriceDisplay.appendChild(priceChangeElement);
      }

      const layPriceDisplay = document.createElement('div');
      layPriceDisplay.style.display = 'flex';
      layPriceDisplay.style.justifyContent = 'space-between';
      layPriceDisplay.style.alignItems = 'center';
      
      const layLabel = document.createElement('span');
      layLabel.textContent = `Best Lay: ${runner.bestLayPrice || 'N/A'}`;
      layPriceDisplay.appendChild(layLabel);
      
      // Add price change indicator for lay prices
      if (runner.layPriceChange) {
        const priceChangeElement = document.createElement('span');
        priceChangeElement.textContent = runner.layPriceChange > 0 
          ? `+${runner.layPriceChange}` 
          : `${runner.layPriceChange}`;
        priceChangeElement.style.marginLeft = '5px';
        priceChangeElement.style.fontWeight = 'bold';
        priceChangeElement.style.color = runner.layPriceChange > 0 
          ? '#28a745' // Green for price increase
          : runner.layPriceChange < 0 
            ? '#dc3545' // Red for price decrease
            : '#6c757d'; // Gray for no change
        layPriceDisplay.appendChild(priceChangeElement);
      }

      runnerDiv.appendChild(nameElement);
      runnerDiv.appendChild(backPriceDisplay);
      runnerDiv.appendChild(layPriceDisplay);
      container.appendChild(runnerDiv);
    });
    
    // Add a footer with timestamp
    const footer = document.createElement('div');
    footer.style.fontSize = '12px';
    footer.style.color = '#6c757d';
    footer.style.marginTop = '10px';
    footer.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    container.appendChild(footer);
    
  } catch (error) {
    console.error("Error in updatePageDisplay:", error);
  }
}