(function () {
  // Set a flag to indicate this script has loaded
  window.hasContentScriptLoaded = true;
  console.log("Simplified content script loaded on Betfair horse racing page.");
  
  // Settings - hardcoded since we removed options page
  const settings = {
    updateInterval: 5, // seconds between updates
    histogramHeight: 60, // height of histogram in pixels
    histogramWidth: 280, // width of histogram in pixels
    backColor: '#2E7D32', // color for back prices
    layColor: '#C62828', // color for lay prices
    dataPointsToKeep: 60 // Number of data points to keep (5 minutes = 300 seconds / 5 seconds per update = 60 points)
  };
  
  // Store the history of price data for the current market
  let priceHistoryData = new Map(); // Map runner name to their history array
  
  // Helper function to safely access Chrome API
  function safelyUseStorage(data) {
    try {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.error("Storage error:", chrome.runtime.lastError);
        } else {
          console.log("Runner data saved to storage.");
        }
      });
    } catch (storageError) {
      console.error("Error accessing storage:", storageError);
    }
  }
  
  // Function to send price history to background script
  function storeHistory(runners, marketId) {
    try {
      chrome.runtime.sendMessage({
        action: "storeHistory",
        data: {
          marketId: marketId,
          runners: runners,
          timestamp: new Date().toISOString()
        }
      });
      
      // Update local price history for visualization
      updateLocalPriceHistory(runners);
    } catch (error) {
      console.error("Error storing history:", error);
    }
  }
  
  // Update local price history for visualization
  function updateLocalPriceHistory(runners) {
    if (!Array.isArray(runners)) return;
    
    runners.forEach(runner => {
      if (!runner.name) return;
      
      // Initialize history array if it doesn't exist
      if (!priceHistoryData.has(runner.name)) {
        priceHistoryData.set(runner.name, []);
      }
      
      const runnerHistory = priceHistoryData.get(runner.name);
      
      // Add current prices
      runnerHistory.push({
        timestamp: new Date().getTime(),
        backPrice: runner.bestBackPrice,
        layPrice: runner.bestLayPrice
      });
      
      // Keep only the last minute of data (settings.dataPointsToKeep points)
      while (runnerHistory.length > settings.dataPointsToKeep) {
        runnerHistory.shift(); // Remove oldest entry
      }
    });
  }
  
  // Function to extract betting data
  function scrapeRunnerPrices() {
    try {
      const runners = [];
      const marketId = window.location.pathname.split('/').pop().split('?')[0];
      
      // Get previous data to calculate changes
      const previousData = sessionStorage.getItem('runnerDataLatest');
      let previousRunners = {};
      if (previousData) {
        try {
          const parsed = JSON.parse(previousData);
          if (parsed.runnerData && Array.isArray(parsed.runnerData)) {
            previousRunners = parsed.runnerData.reduce((acc, runner) => {
              acc[runner.name] = runner;
              return acc;
            }, {});
          }
        } catch (e) {
          console.error("Error parsing previous data:", e);
        }
      }

      // Select all rows containing runner information
      const runnerRows = document.querySelectorAll('tr.runner-line');
      if (!runnerRows.length) {
        console.log("No runner rows found. Waiting for DOM updates...");
        return;
      }

      runnerRows.forEach((row) => {
        try {
          // Extract runner name
          const nameElement = row.querySelector('h3.runner-name') || row.querySelector('.runner-name');
          const runnerName = nameElement ? nameElement.textContent.trim() : 'Unknown Runner';

          // Get the best back price (rightmost back cell)
          const bestBackCell = row.querySelector('td.bet-buttons.back-cell.last-back-cell');
          let bestBackPrice = null;
          let bestBackAmount = null;
          
          if (bestBackCell) {
            // Try to find the price inside the button
            const priceButton = bestBackCell.querySelector('button');
            if (priceButton) {
              // Look for the price label
              const priceLabel = priceButton.querySelector('label.Zs3u5') || 
                              priceButton.querySelector('label[class*="AUP11"]');
              if (priceLabel) {
                bestBackPrice = parseFloat(priceLabel.textContent.trim());
              }
              
              // Look for the amount label
              const amountLabel = priceButton.querySelector('label.He6\\+y') || 
                              priceButton.querySelector('label[class*="Qe-26"]:not([class*="AUP11"])');
              if (amountLabel) {
                // Remove currency symbol if present
                bestBackAmount = parseFloat(amountLabel.textContent.trim().replace(/[$£€]/g, ''));
              }
            } else {
              // Fallback to get the content from the cell directly
              const cellText = bestBackCell.textContent.trim();
              bestBackPrice = parseFloat(cellText);
            }
          }

          // Get the best lay price (leftmost lay cell)
          const bestLayCell = row.querySelector('td.bet-buttons.lay-cell.first-lay-cell') || 
                            row.querySelector('td.bet-buttons.lay-cell:first-of-type');
          let bestLayPrice = null;
          let bestLayAmount = null;
          
          if (bestLayCell) {
            // Try to find the price inside the button
            const priceButton = bestLayCell.querySelector('button');
            if (priceButton) {
              // Look for the price label
              const priceLabel = priceButton.querySelector('label.Zs3u5') || 
                             priceButton.querySelector('label[class*="AUP11"]');
              if (priceLabel) {
                bestLayPrice = parseFloat(priceLabel.textContent.trim());
              }
              
              // Look for the amount label
              const amountLabel = priceButton.querySelector('label.He6\\+y') || 
                               priceButton.querySelector('label[class*="Qe-26"]:not([class*="AUP11"])');
              if (amountLabel) {
                // Remove currency symbol if present
                bestLayAmount = parseFloat(amountLabel.textContent.trim().replace(/[$£€]/g, ''));
              }
            } else {
              // Fallback to get the content from the cell directly
              const cellText = bestLayCell.textContent.trim();
              bestLayPrice = parseFloat(cellText);
            }
          }

          // Calculate price changes if we have previous data
          const backPriceChange = previousRunners[runnerName] && previousRunners[runnerName].bestBackPrice && bestBackPrice !== null
            ? (bestBackPrice - previousRunners[runnerName].bestBackPrice).toFixed(2) 
            : null;
          const layPriceChange = previousRunners[runnerName] && previousRunners[runnerName].bestLayPrice && bestLayPrice !== null 
            ? (bestLayPrice - previousRunners[runnerName].bestLayPrice).toFixed(2) 
            : null;

          // Only add runner if we have at least one price
          if (bestBackPrice !== null || bestLayPrice !== null) {
            runners.push({
              name: runnerName,
              bestBackPrice,
              bestBackAmount,
              bestLayPrice,
              bestLayAmount,
              backPriceChange: backPriceChange !== null ? parseFloat(backPriceChange) : null,
              layPriceChange: layPriceChange !== null ? parseFloat(layPriceChange) : null,
              timestamp: new Date().toISOString()
            });
          }
        } catch (rowError) {
          console.error("Error processing row:", rowError);
        }
      });

      console.log("Extracted Runners:", runners.length);

      // Store latest data in session storage
      const dataToStore = { 
        runnerData: runners, 
        lastUpdated: new Date().toISOString(),
        url: window.location.href,
        marketId: marketId
      };
      
      // Use session storage for the latest data (cleared when tab closes)
      sessionStorage.setItem('runnerDataLatest', JSON.stringify(dataToStore));
      
      // Add to history and notify background script
      storeHistory(runners, marketId);

      // Update the display on the page
      updatePageDisplay(runners, marketId);
    } catch (error) {
      console.error("Error in scrapeRunnerPrices:", error);
    }
  }
  
  // Draw histogram on canvas showing price history
  function drawHistogram(canvas, runnerName) {
    if (!canvas || !runnerName) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const history = priceHistoryData.get(runnerName) || [];
    if (history.length < 2) {
      // Not enough data points yet
      ctx.font = '12px Arial';
      ctx.fillStyle = '#777';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting price data...', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Find min and max prices for scaling
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    history.forEach(point => {
      if (point.backPrice && point.backPrice < minPrice) minPrice = point.backPrice;
      if (point.layPrice && point.layPrice < minPrice) minPrice = point.layPrice;
      if (point.backPrice && point.backPrice > maxPrice) maxPrice = point.backPrice;
      if (point.layPrice && point.layPrice > maxPrice) maxPrice = point.layPrice;
    });
    
    // Add 10% padding to the range
    const range = maxPrice - minPrice;
    minPrice = Math.max(1.01, minPrice - range * 0.1);
    maxPrice = maxPrice + range * 0.1;
    
    // Calculate bar width
    const barWidth = canvas.width / history.length;
    
    // Draw grid lines
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines (3 lines)
    for (let i = 1; i < 4; i++) {
      const y = canvas.height * (i / 4);
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    
    // Vertical grid lines
    for (let i = 1; i < history.length; i++) {
      const x = i * barWidth;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    ctx.stroke();
    
    // Function to convert price to Y coordinate
    const priceToY = (price) => {
      if (!price) return null;
      return canvas.height - ((price - minPrice) / (maxPrice - minPrice) * canvas.height);
    };
    
    // Draw back price line
    ctx.beginPath();
    ctx.strokeStyle = settings.backColor;
    ctx.lineWidth = 2;
    let firstPoint = true;
    
    for (let i = 0; i < history.length; i++) {
      const point = history[i];
      const x = i * barWidth + barWidth / 2;
      const y = priceToY(point.backPrice);
      
      if (y !== null) {
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
    
    // Draw lay price line
    ctx.beginPath();
    ctx.strokeStyle = settings.layColor;
    ctx.lineWidth = 2;
    firstPoint = true;
    
    for (let i = 0; i < history.length; i++) {
      const point = history[i];
      const x = i * barWidth + barWidth / 2;
      const y = priceToY(point.layPrice);
      
      if (y !== null) {
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }
  
  // Function to export price history
  function exportPriceHistory() {
    chrome.runtime.sendMessage({ action: "exportHistory" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error exporting history:", chrome.runtime.lastError);
        alert("Error exporting price history. Please try again.");
        return;
      }
      
      if (response && response.history) {
        try {
          // Convert the history to a JSON string
          const historyJson = JSON.stringify(response.history, null, 2);
          
          // Create a Blob with the data
          const blob = new Blob([historyJson], { type: 'application/json' });
          
          // Create a URL for the Blob
          const url = URL.createObjectURL(blob);
          
          // Create a download link and click it
          const a = document.createElement('a');
          a.href = url;
          a.download = `price_history_${new Date().toISOString().replace(/:/g, '-')}.json`;
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
          
          console.log("Price history exported successfully");
        } catch (error) {
          console.error("Error creating export file:", error);
          alert("Error creating export file. Please try again.");
        }
      } else {
        alert("No price history data available for export.");
      }
    });
  }
  
  // Function to create and update the display on the page
  function updatePageDisplay(runners, marketId) {
    try {
      let container = document.getElementById('price-tracker-container');

      // Create container if it doesn't exist
      if (!container) {
        container = document.createElement('div');
        container.id = 'price-tracker-container';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.style.backgroundColor = '#f8f9fa';
        container.style.border = '1px solid #dee2e6';
        container.style.borderRadius = '4px';
        container.style.padding = '10px';
        container.style.zIndex = '9999';
        container.style.maxHeight = '80vh';
        container.style.overflowY = 'auto';
        container.style.width = '300px';
        container.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';

        // Add a header with controls
        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.style.marginBottom = '10px';
        
        const header = document.createElement('h3');
        header.textContent = 'Price Tracker';
        header.style.margin = '0';
        
        const controlsDiv = document.createElement('div');
        
        // Export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export';
        exportButton.style.background = '#4CAF50';
        exportButton.style.color = 'white';
        exportButton.style.border = 'none';
        exportButton.style.borderRadius = '4px';
        exportButton.style.padding = '4px 8px';
        exportButton.style.marginRight = '5px';
        exportButton.style.cursor = 'pointer';
        exportButton.onclick = exportPriceHistory;
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#777';
        closeButton.style.padding = '0 5px';
        closeButton.onclick = function() {
          container.style.display = 'none';
        };
        
        controlsDiv.appendChild(exportButton);
        controlsDiv.appendChild(closeButton);
        
        headerDiv.appendChild(header);
        headerDiv.appendChild(controlsDiv);
        container.appendChild(headerDiv);

        document.body.appendChild(container);
      }

      // Clear existing content (except header)
      const headerDiv = container.firstChild;
      container.innerHTML = '';
      container.appendChild(headerDiv);

      // Add market info if available
      if (marketId) {
        const marketInfoDiv = document.createElement('div');
        marketInfoDiv.style.backgroundColor = '#e9ecef';
        marketInfoDiv.style.padding = '8px';
        marketInfoDiv.style.borderRadius = '4px';
        marketInfoDiv.style.marginBottom = '10px';
        marketInfoDiv.style.fontSize = '14px';
        
        marketInfoDiv.textContent = `Market ID: ${marketId}`;
        container.appendChild(marketInfoDiv);
      }

      // Add runner information
      runners.forEach((runner) => {
        const runnerDiv = document.createElement('div');
        runnerDiv.style.marginBottom = '15px';
        runnerDiv.style.padding = '8px';
        runnerDiv.style.backgroundColor = '#ffffff';
        runnerDiv.style.borderRadius = '4px';
        runnerDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

        const nameElement = document.createElement('div');
        nameElement.textContent = runner.name;
        nameElement.style.fontWeight = 'bold';
        nameElement.style.fontSize = '14px';
        nameElement.style.marginBottom = '5px';

        const pricesRow = document.createElement('div');
        pricesRow.style.display = 'flex';
        pricesRow.style.justifyContent = 'space-between';
        pricesRow.style.alignItems = 'flex-start';
        pricesRow.style.marginBottom = '8px';
        
        const pricesCol = document.createElement('div');
        pricesCol.style.flexBasis = '120px';
        
        const backPriceDisplay = document.createElement('div');
        backPriceDisplay.style.display = 'flex';
        backPriceDisplay.style.justifyContent = 'space-between';
        backPriceDisplay.style.alignItems = 'center';
        backPriceDisplay.style.marginBottom = '3px';
        
        const backLabel = document.createElement('span');
        if (runner.bestBackAmount) {
          backLabel.textContent = `Back: ${runner.bestBackPrice || 'N/A'} ($${runner.bestBackAmount})`;
        } else {
          backLabel.textContent = `Back: ${runner.bestBackPrice || 'N/A'}`;
        }
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
        if (runner.bestLayAmount) {
          layLabel.textContent = `Lay: ${runner.bestLayPrice || 'N/A'} ($${runner.bestLayAmount})`;
        } else {
          layLabel.textContent = `Lay: ${runner.bestLayPrice || 'N/A'}`;
        }
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
        
        pricesCol.appendChild(backPriceDisplay);
        pricesCol.appendChild(layPriceDisplay);
        pricesRow.appendChild(pricesCol);
        
        // Create the histogram
        const canvasContainer = document.createElement('div');
        canvasContainer.style.flexGrow = '1';
        canvasContainer.style.flexBasis = '160px';
        canvasContainer.style.height = `${settings.histogramHeight}px`;
        canvasContainer.style.marginLeft = '10px';
        canvasContainer.style.border = '1px solid #e0e0e0';
        canvasContainer.style.borderRadius = '3px';
        canvasContainer.style.backgroundColor = '#fff';
        
        const canvas = document.createElement('canvas');
        canvas.width = settings.histogramWidth;
        canvas.height = settings.histogramHeight;
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        canvasContainer.appendChild(canvas);
        pricesRow.appendChild(canvasContainer);
        
        // Draw the histogram
        setTimeout(() => drawHistogram(canvas, runner.name), 0);

        runnerDiv.appendChild(nameElement);
        runnerDiv.appendChild(pricesRow);
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
  
  // Set up a more efficient mutation observer with error handling
  let observerTimeout = null;
  let isObserving = true;
  
  const observer = new MutationObserver((mutations) => {
    try {
      // Debounce the observer to prevent too many executions
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      
      // Only proceed if we should be observing
      if (isObserving) {
        observerTimeout = setTimeout(() => {
          console.log("DOM updated, reinitializing scraper...");
          scrapeRunnerPrices();
        }, 1000); // Wait 1 second after DOM changes before scraping
      }
    } catch (error) {
      console.error("Error in mutation observer:", error);
      // If we encounter an error, try to gracefully disconnect the observer
      try {
        observer.disconnect();
        isObserving = false;
        console.log("Observer disconnected due to error");
      } catch (e) {
        console.error("Failed to disconnect observer:", e);
      }
    }
  });
  
  // Start observing the body with a safety wrapper
  try {
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (error) {
    console.error("Failed to start observer:", error);
    isObserving = false;
  }
  
  // Add a cleanup function for page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    try {
      if (isObserving) {
        observer.disconnect();
        isObserving = false;
        console.log("Observer disconnected during page unload");
      }
      if (observerTimeout) {
        clearTimeout(observerTimeout);
        observerTimeout = null;
      }
      
      // Clear session storage
      sessionStorage.removeItem('runnerDataLatest');
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  });
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleOverlay") {
      const container = document.getElementById('price-tracker-container');
      if (container) {
        // Toggle visibility
        if (container.style.display === 'none') {
          container.style.display = 'block';
        } else {
          container.style.display = 'none';
        }
      } else {
        // If container doesn't exist yet, trigger the scraping process
        scrapeRunnerPrices();
      }
    }
    return true;
  });
  
  // Register with the background script
  try {
    chrome.runtime.sendMessage({ action: "contentScriptLoaded" });
  } catch (error) {
    console.error("Error registering with background script:", error);
  }
  
  // Run the scraper after a short delay to ensure the page is ready
  setTimeout(scrapeRunnerPrices, 1000);
  
  // Set up interval for regular updates
  window.scrapeInterval = setInterval(scrapeRunnerPrices, settings.updateInterval * 1000);
})();