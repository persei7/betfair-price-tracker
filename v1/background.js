// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Racing Odds Overlay extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    oddsSource: 'mock',
    highlightBetterOdds: true,
    autoRefresh: true,
    refreshInterval: 30
  });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshOdds') {
    // In a real implementation, this would fetch fresh odds from your alternative source
    console.log('Received request to refresh odds');
    
    // Send a message to content script to refresh odds
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'refreshOdds'});
        sendResponse({status: 'refresh-initiated'});
      } else {
        sendResponse({status: 'no-active-tab'});
      }
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
});