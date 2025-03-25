(function () {
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
  
            // Extract back prices
            const backPriceElements = row.querySelectorAll('td.bet-buttons.back-cell');
            const backPrices = Array.from(backPriceElements)
              .map((el) => {
                const text = el.textContent.trim();
                const parsed = parseFloat(text);
                return isNaN(parsed) ? null : parsed;
              })
              .filter(price => price !== null);
  
            // Extract lay prices
            const layPriceElements = row.querySelectorAll('td.bet-buttons.lay-cell');
            const layPrices = Array.from(layPriceElements)
              .map((el) => {
                const text = el.textContent.trim();
                const parsed = parseFloat(text);
                return isNaN(parsed) ? null : parsed;
              })
              .filter(price => price !== null);
  
            // If we have back or lay prices, calculate min and max
            if (backPrices.length > 0 || layPrices.length > 0) {
              const minBackPrice = backPrices.length > 0 ? Math.min(...backPrices) : null;
              const maxBackPrice = backPrices.length > 0 ? Math.max(...backPrices) : null;
              const minLayPrice = layPrices.length > 0 ? Math.min(...layPrices) : null;
              const maxLayPrice = layPrices.length > 0 ? Math.max(...layPrices) : null;
  
              runners.push({
                name: runnerName,
                backPrices,
                layPrices,
                minBackPrice,
                maxBackPrice,
                minLayPrice,
                maxLayPrice,
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
          lastUpdated: new Date().toISOString() 
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
  
          // Add a header with close button
          const headerDiv = document.createElement('div');
          headerDiv.style.display = 'flex';
          headerDiv.style.justifyContent = 'space-between';
          headerDiv.style.alignItems = 'center';
          headerDiv.style.marginBottom = '10px';
          
          const header = document.createElement('h3');
          header.textContent = 'Runner Price Tracker';
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
          runnerDiv.style.padding = '5px';
          runnerDiv.style.backgroundColor = '#ffffff';
          runnerDiv.style.borderRadius = '4px';
  
          const nameElement = document.createElement('div');
          nameElement.textContent = runner.name;
          nameElement.style.fontWeight = 'bold';
  
          const backPriceRange = document.createElement('div');
          backPriceRange.textContent = `Back Prices: Min: ${runner.minBackPrice || 'N/A'}, Max: ${runner.maxBackPrice || 'N/A'}`;
  
          const layPriceRange = document.createElement('div');
          layPriceRange.textContent = `Lay Prices: Min: ${runner.minLayPrice || 'N/A'}, Max: ${runner.maxLayPrice || 'N/A'}`;
  
          runnerDiv.appendChild(nameElement);
          runnerDiv.appendChild(backPriceRange);
          runnerDiv.appendChild(layPriceRange);
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