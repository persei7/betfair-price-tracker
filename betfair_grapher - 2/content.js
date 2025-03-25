(function () {
    // Settings configuration
    const defaultSettings = {
      updateInterval: 5,
      displayMode: 'overlay',
      priceChangeThreshold: 1.0,
      enableNotifications: true,
      storeHistory: true,
      historyDuration: 7
    };
    
    let settings = { ...defaultSettings };
    
    // Load settings when the script starts
    function loadSettings() {
      try {
        chrome.storage.sync.get(defaultSettings, (items) => {
          if (chrome.runtime.lastError) {
            console.error('Error loading settings:', chrome.runtime.lastError);
            return;
          }
          
          settings = items;
          console.log('Loaded settings:', settings);
          
          // Apply initial settings
          updateDisplayMode(settings.displayMode);
          updateRefreshInterval(settings.updateInterval);
        });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
    
    // Listen for settings updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'settingsUpdated') {
        settings = message.settings;
        console.log('Updated settings:', settings);
        
        // Apply new settings
        updateDisplayMode(settings.displayMode);
        updateRefreshInterval(settings.updateInterval);
        
        // Send response to confirm receipt
        sendResponse({ status: 'Settings updated successfully' });
        return true; // Keep message channel open for async response
      }
    });
    
    // Helper function to update the display mode
    function updateDisplayMode(mode) {
      const container = document.getElementById('price-tracker-container');
      if (!container) return;
    
      switch (mode) {
        case 'overlay':
          container.style.position = 'fixed';
          container.style.top = '10px';
          container.style.right = '10px';
          container.style.width = '300px';
          container.style.height = 'auto';
          container.style.maxHeight = '80vh';
          container.style.display = 'block';
          break;
        case 'sidebar':
          container.style.position = 'fixed';
          container.style.top = '0';
          container.style.right = '0';
          container.style.width = '300px';
          container.style.height = '100vh';
          container.style.maxHeight = '100vh';
          container.style.borderRadius = '0';
          container.style.display = 'block';
          break;
        case 'popup':
          container.style.display = 'none';
          break;
      }
    }
    
    // Helper function to update the refresh interval
    function updateRefreshInterval(seconds) {
      if (window.scrapeInterval) {
        clearInterval(window.scrapeInterval);
      }
      window.scrapeInterval = setInterval(scrapeRunnerPrices, seconds * 1000);
      console.log(`Updated refresh interval to ${seconds} seconds`);
    }
    
    // Function to check for significant price changes and send notifications if needed
    function checkForSignificantPriceChanges(runner, previousRunners) {
      if (!settings.enableNotifications) return;
      
      const threshold = settings.priceChangeThreshold / 100; // Convert percentage to decimal
      const prevRunner = previousRunners[runner.name];
      
      // Only check if we have previous data to compare against
      if (!prevRunner) return;
      
      // Check for significant back price changes
      if (runner.bestBackPrice && prevRunner.bestBackPrice && 
          Math.abs((runner.bestBackPrice - prevRunner.bestBackPrice) / prevRunner.bestBackPrice) >= threshold) {
        
        const change = runner.bestBackPrice - prevRunner.bestBackPrice;
        const direction = change > 0 ? 'increased' : 'decreased';
        
        // Send message to background script to create notification
        chrome.runtime.sendMessage({
          action: 'priceAlert',
          data: {
            runner: runner.name,
            type: 'Back',
            change: change,
            newPrice: runner.bestBackPrice,
            oldPrice: prevRunner.bestBackPrice
          }
        }).catch(error => {
          console.log("Error sending notification:", error);
          
          // Fallback to local notification if message sending fails
          if (Notification.permission === "granted") {
            new Notification(`${runner.name} Price Change`, {
              body: `Back price has ${direction} by ${Math.abs(change).toFixed(2)} to ${runner.bestBackPrice}`,
              icon: chrome.runtime.getURL('images/icon128.png')
            });
          }
        });
      }
      
      // Check for significant lay price changes
      if (runner.bestLayPrice && prevRunner.bestLayPrice && 
          Math.abs((runner.bestLayPrice - prevRunner.bestLayPrice) / prevRunner.bestLayPrice) >= threshold) {
        
        const change = runner.bestLayPrice - prevRunner.bestLayPrice;
        const direction = change > 0 ? 'increased' : 'decreased';
        
        // Send message to background script to create notification
        chrome.runtime.sendMessage({
          action: 'priceAlert',
          data: {
            runner: runner.name,
            type: 'Lay',
            change: change,
            newPrice: runner.bestLayPrice,
            oldPrice: prevRunner.bestLayPrice
          }
        }).catch(error => {
          console.log("Error sending notification:", error);
          
          // Fallback to local notification if message sending fails
          if (Notification.permission === "granted") {
            new Notification(`${runner.name} Price Change`, {
              body: `Lay price has ${direction} by ${Math.abs(change).toFixed(2)} to ${runner.bestLayPrice}`,
              icon: chrome.runtime.getURL('images/icon128.png')
            });
          }
        });
      }
    }
    
    // Set a flag to indicate this script has loaded
    window.hasContentScriptLoaded = true;
    
    console.log("Content script loaded on Betfair horse racing page.");
  
    // Helper function to safely access Chrome API
    function safelyUseStorage(data) {
      try {
        // Check if chrome exists and has storage API
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(data, () => {
            if (chrome.runtime.lastError) {
              console.error("Storage error:", chrome.runtime.lastError);
              // Fall back to local storage as a backup
              localStorage.setItem('runnerDataBackup', JSON.stringify(data));
            } else {
              console.log("Runner data saved to storage.");
            }
          });
        } else {
          // If Chrome API is not available, use localStorage as fallback
          console.log("Chrome storage API not available, using localStorage");
          localStorage.setItem('runnerDataBackup', JSON.stringify(data));
        }
      } catch (storageError) {
        console.error("Error accessing storage:", storageError);
        try {
          // Last resort fallback
          localStorage.setItem('runnerDataBackup', JSON.stringify(data));
        } catch (e) {
          console.error("All storage methods failed");
        }
      }
    }
  
    // Function to extract betting data
    function scrapeRunnerPrices() {
      try {
        const runners = [];
        
        // Get previous data to calculate changes
        const previousData = localStorage.getItem('runnerDataBackup');
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

        console.log("Extracted Runners:", runners);

        // Safely save the data using our helper function
        const dataToStore = { 
          runnerData: runners, 
          lastUpdated: new Date().toISOString(),
          url: window.location.href,
          marketId: window.location.pathname.split('/').pop().split('?')[0]
        };
        
        safelyUseStorage(dataToStore);

        // Update the display on the page
        updatePageDisplay(runners);
      } catch (error) {
        console.error("Error in scrapeRunnerPrices:", error);
      }
    }
  
    // Function to create and update the display on the page
    function updatePageDisplay(runners) {
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

          // Add a header with close button
          const headerDiv = document.createElement('div');
          headerDiv.style.display = 'flex';
          headerDiv.style.justifyContent = 'space-between';
          headerDiv.style.alignItems = 'center';
          headerDiv.style.marginBottom = '10px';
          
          const header = document.createElement('h3');
          header.textContent = 'Best Prices Tracker';
          header.style.margin = '0';
          
          const closeButton = document.createElement('button');
          closeButton.textContent = '×';
          closeButton.style.background = 'none';
          closeButton.style.border = 'none';
          closeButton.style.fontSize = '20px';
          closeButton.style.cursor = 'pointer';
          closeButton.onclick = function() {
            container.style.display = 'none';
          };
          
          headerDiv.appendChild(header);
          headerDiv.appendChild(closeButton);
          container.appendChild(headerDiv);

          document.body.appendChild(container);
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
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    });
  
    // Run the scraper after a short delay to ensure the page is ready
    setTimeout(scrapeRunnerPrices, 1000);
  })();