document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName + 'Tab') {
          content.classList.add('active');
        }
      });
    });
  });

  // Function to display runner data
  function displayRunnerData(runnerData, lastUpdated, url) {
    const runnerDataDiv = document.getElementById('runnerData');
    const lastUpdatedDiv = document.getElementById('lastUpdated');
    const statusMessage = document.getElementById('statusMessage');
    
    if (runnerData && runnerData.length > 0) {
      // Clear loading message
      runnerDataDiv.innerHTML = '';
      
      // Show market info if available
      if (url) {
        const marketInfoDiv = document.createElement('div');
        marketInfoDiv.className = 'market-info';
        
        const marketId = url.split('/').pop().split('?')[0];
        marketInfoDiv.textContent = `Market ID: ${marketId}`;
        
        runnerDataDiv.appendChild(marketInfoDiv);
      }
      
      // Sort runners by name
      runnerData.sort((a, b) => a.name.localeCompare(b.name));
      
      // Add each runner's data
      runnerData.forEach(runner => {
        const runnerCard = document.createElement('div');
        runnerCard.className = 'runner-card';
        
        const runnerName = document.createElement('div');
        runnerName.className = 'runner-name';
        runnerName.textContent = runner.name;
        
        const backPriceRange = document.createElement('div');
        backPriceRange.className = 'price-range';
        
        // Create a container for the main price and change indicator
        const backContainer = document.createElement('div');
        backContainer.className = 'price-container';
        
        const backPrice = document.createElement('span');
        if (runner.bestBackAmount) {
          backPrice.textContent = `Best Back: ${runner.bestBackPrice || 'N/A'} ($${runner.bestBackAmount})`;
        } else if (runner.bestBackPrice) {
          backPrice.textContent = `Best Back: ${runner.bestBackPrice || 'N/A'}`;
        } else if (runner.minBackPrice) {
          // Fallback for old data format
          backPrice.textContent = `Back: ${runner.minBackPrice || 'N/A'}`;
        } else {
          backPrice.textContent = 'No back price available';
        }
        backContainer.appendChild(backPrice);
        
        // Add price change indicator if available
        if (runner.backPriceChange) {
          const changeIndicator = document.createElement('span');
          changeIndicator.className = 'price-change';
          changeIndicator.textContent = runner.backPriceChange > 0 
            ? `↑ +${runner.backPriceChange}` 
            : `↓ ${runner.backPriceChange}`;
          
          // Add color based on direction
          changeIndicator.classList.add(runner.backPriceChange > 0 ? 'increase' : 'decrease');
          
          backContainer.appendChild(changeIndicator);
        }
        
        backPriceRange.appendChild(backContainer);
        
        const layPriceRange = document.createElement('div');
        layPriceRange.className = 'price-range';
        
        // Create a container for the main price and change indicator
        const layContainer = document.createElement('div');
        layContainer.className = 'price-container';
        
        const layPrice = document.createElement('span');
        if (runner.bestLayAmount) {
          layPrice.textContent = `Best Lay: ${runner.bestLayPrice || 'N/A'} ($${runner.bestLayAmount})`;
        } else if (runner.bestLayPrice) {
          layPrice.textContent = `Best Lay: ${runner.bestLayPrice || 'N/A'}`;
        } else if (runner.minLayPrice) {
          // Fallback for old data format
          layPrice.textContent = `Lay: ${runner.minLayPrice || 'N/A'}`;
        } else {
          layPrice.textContent = 'No lay price available';
        }
        layContainer.appendChild(layPrice);
        
        // Add price change indicator if available
        if (runner.layPriceChange) {
          const changeIndicator = document.createElement('span');
          changeIndicator.className = 'price-change';
          changeIndicator.textContent = runner.layPriceChange > 0 
            ? `↑ +${runner.layPriceChange}` 
            : `↓ ${runner.layPriceChange}`;
          
          // Add color based on direction
          changeIndicator.classList.add(runner.layPriceChange > 0 ? 'increase' : 'decrease');
          
          layContainer.appendChild(changeIndicator);
        }
        
        layPriceRange.appendChild(layContainer);
        
        runnerCard.appendChild(runnerName);
        runnerCard.appendChild(backPriceRange);
        runnerCard.appendChild(layPriceRange);
        
        // Add timestamp if available
        if (runner.timestamp) {
          const runnerTime = document.createElement('div');
          runnerTime.className = 'runner-timestamp';
          const time = new Date(runner.timestamp);
          runnerTime.textContent = `Recorded: ${time.toLocaleTimeString()}`;
          runnerCard.appendChild(runnerTime);
        }
        
        runnerDataDiv.appendChild(runnerCard);
      });
      
      // Show last updated time
      if (lastUpdated) {
        const date = new Date(lastUpdated);
        lastUpdatedDiv.textContent = `Last updated: ${date.toLocaleTimeString()}`;
      }
    } else {
      runnerDataDiv.textContent = 'No data available. Please navigate to the betting website.';
    }
  }

  // Try to get data from Chrome storage
  try {
    chrome.storage.local.get(['runnerData', 'lastUpdated', 'url'], function(data) {
      if (chrome.runtime.lastError) {
        console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
        // Try to fall back to localStorage
        tryLocalStorageFallback();
        return;
      }
      
      displayRunnerData(data.runnerData, data.lastUpdated, data.url);
    });
  } catch (error) {
    console.error("Error with chrome.storage.local.get:", error);
    tryLocalStorageFallback();
  }
  
  // Fallback to localStorage if Chrome storage fails
  function tryLocalStorageFallback() {
    try {
      const backupData = localStorage.getItem('runnerDataBackup');
      if (backupData) {
        const parsedData = JSON.parse(backupData);
        displayRunnerData(parsedData.runnerData, parsedData.lastUpdated, parsedData.url);
        console.log("Used localStorage backup data");
      } else {
        document.getElementById('runnerData').textContent = 
          'Unable to retrieve data. Please navigate to the betting website.';
      }
    } catch (localStorageError) {
      console.error("Fallback to localStorage failed:", localStorageError);
      document.getElementById('runnerData').textContent = 
        'Error retrieving data. Please try reloading the extension.';
    }
  }
  
  // Add refresh button functionality
  const refreshButton = document.getElementById('refreshButton');
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      location.reload();
    });
  }
  
  // Load settings values
  const defaultSettings = {
    updateInterval: 5,
    displayMode: 'overlay',
    priceChangeThreshold: 1.0,
    enableNotifications: true,
    storeHistory: true,
    historyDuration: 7
  };
  
  function loadSettings() {
    chrome.storage.sync.get(defaultSettings, function(settings) {
      if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        return;
      }
      
      // Populate the form fields with the loaded settings
      document.getElementById('updateInterval').value = settings.updateInterval;
      document.getElementById('displayMode').value = settings.displayMode;
      document.getElementById('priceChangeThreshold').value = settings.priceChangeThreshold;
      document.getElementById('enableNotifications').checked = settings.enableNotifications;
      document.getElementById('storeHistory').checked = settings.storeHistory;
      document.getElementById('historyDuration').value = settings.historyDuration;
    });
  }
  
  // Load settings when the popup opens
  loadSettings();
  
  // Add save settings functionality
  const saveButton = document.getElementById('saveSettings');
  if (saveButton) {
    saveButton.addEventListener('click', function() {
      const settings = {
        updateInterval: parseInt(document.getElementById('updateInterval').value, 10) || defaultSettings.updateInterval,
        displayMode: document.getElementById('displayMode').value,
        priceChangeThreshold: parseFloat(document.getElementById('priceChangeThreshold').value) || defaultSettings.priceChangeThreshold,
        enableNotifications: document.getElementById('enableNotifications').checked,
        storeHistory: document.getElementById('storeHistory').checked,
        historyDuration: parseInt(document.getElementById('historyDuration').value, 10) || defaultSettings.historyDuration
      };
      
      // Save settings
      chrome.storage.sync.set(settings, function() {
        if (chrome.runtime.lastError) {
          console.error("Error saving settings:", chrome.runtime.lastError);
          return;
        }
        
        // Show success message
        const statusElement = document.getElementById('saveStatus');
        statusElement.textContent = 'Settings saved successfully!';
        statusElement.style.display = 'block';
        
        // Send message to content script to update settings
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'settingsUpdated',
              settings: settings
            }).catch(error => {
              console.log("Error sending settings to content script:", error);
            });
          }
        });
        
        // Hide the message after a short delay
        setTimeout(function() {
          statusElement.style.display = 'none';
        }, 3000);
      });
    });
  }
});