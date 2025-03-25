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
      } else {
        backPrice.textContent = `Best Back: ${runner.bestBackPrice || 'N/A'}`;
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
      } else {
        layPrice.textContent = `Best Lay: ${runner.bestLayPrice || 'N/A'}`;
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