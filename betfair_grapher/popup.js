document.addEventListener('DOMContentLoaded', function() {
  // Function to display runner data
  function displayRunnerData(runnerData, lastUpdated) {
    const runnerDataDiv = document.getElementById('runnerData');
    const lastUpdatedDiv = document.getElementById('lastUpdated');
    
    if (runnerData && runnerData.length > 0) {
      // Clear loading message
      runnerDataDiv.innerHTML = '';
      
      // Add each runner's data
      runnerData.forEach(runner => {
        const runnerCard = document.createElement('div');
        runnerCard.className = 'runner-card';
        
        const runnerName = document.createElement('div');
        runnerName.className = 'runner-name';
        runnerName.textContent = runner.name;
        
        const backPriceRange = document.createElement('div');
        backPriceRange.className = 'price-range';
        backPriceRange.textContent = `Back: Min: ${runner.minBackPrice || 'N/A'} | Max: ${runner.maxBackPrice || 'N/A'}`;
        
        const layPriceRange = document.createElement('div');
        layPriceRange.className = 'price-range';
        layPriceRange.textContent = `Lay: Min: ${runner.minLayPrice || 'N/A'} | Max: ${runner.maxLayPrice || 'N/A'}`;
        
        runnerCard.appendChild(runnerName);
        runnerCard.appendChild(backPriceRange);
        runnerCard.appendChild(layPriceRange);
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
    chrome.storage.local.get(['runnerData', 'lastUpdated'], function(data) {
      if (chrome.runtime.lastError) {
        console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
        // Try to fall back to localStorage
        tryLocalStorageFallback();
        return;
      }
      
      displayRunnerData(data.runnerData, data.lastUpdated);
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
        displayRunnerData(parsedData.runnerData, parsedData.lastUpdated);
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
});