// content.js
(() => {
  // Create overlay once, with all needed elements
  function createOverlay() {
    const template = document.createElement('template');
    template.innerHTML = `
      <div id="tab-location-overlay">
        <div class="tab-location-content">
          <div class="tab-location-header">
            <span id="tab-header-title">Loading...</span>
            <button id="tab-location-close">×</button>
          </div>
          <div class="tab-location-body">
            <div id="tab-section">Detecting section...</div>
            <div id="tab-subsection"></div>
            <div id="tab-race-details" class="tab-race-details"></div>
            <div id="tab-runners-container" class="tab-runners-container"></div>
            <div id="betfair-status" class="betfair-status">
              <div class="betfair-status-header">Betfair Status</div>
              <div class="betfair-status-content"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const overlay = template.content.firstElementChild;
    document.body.appendChild(overlay);

    // Add close button functionality
    document.getElementById('tab-location-close').addEventListener('click', () => {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.classList.remove('hidden');
      }, 30000); // Show again after 30 seconds
    });

    return overlay;
  }

  // Cache DOM elements to avoid repeated queries
  const elements = {
    headerTitle: null,
    sectionEl: null,
    subsectionEl: null,
    raceDetailsEl: null,
    runnersContainer: null,
    betfairStatusContent: null
  };

  // Store current race info
  let currentRaceInfo = {
    trackName: null,
    raceNumber: null
  };

  // Store Betfair odds
  let betfairOdds = {};
  let betfairOddsRetryCount = 0;
  const MAX_RETRIES = 3;

  // Cache DOM element references
  function cacheElements() {
    elements.headerTitle = document.getElementById('tab-header-title');
    elements.sectionEl = document.getElementById('tab-section');
    elements.subsectionEl = document.getElementById('tab-subsection');
    elements.raceDetailsEl = document.getElementById('tab-race-details');
    elements.runnersContainer = document.getElementById('tab-runners-container');
    elements.betfairStatusContent = document.querySelector('.betfair-status-content');
  }

  // Detect current section on tab.com.au
  function detectSection() {
    const url = window.location.href;
    
    let section = "Unknown";
    let subsection = "";
    
    // Main section detection
    if (url.includes('/racing/')) {
      section = "Racing";
      
      // Detect racing subsections
      if (url.includes('/thoroughbred/')) {
        subsection = "Thoroughbred";
      } else if (url.includes('/harness/')) {
        subsection = "Harness";
      } else if (url.includes('/greyhound/')) {
        subsection = "Greyhound";
      }
      
      // Update header title
      if (elements.headerTitle) {
        elements.headerTitle.textContent = "Racing";
      }
      
      // Only schedule runner detection when on racing pages
      requestAnimationFrame(() => {
        detectRaceDetails();
        detectRunners();
      });
      
    } else if (url.includes('/sports/')) {
      section = "Sports";
      
      // Update header title
      if (elements.headerTitle) {
        elements.headerTitle.textContent = "Sports";
      }
      
      // More efficient sports detection with a Map
      const sportPatterns = new Map([
        ['soccer', 'Soccer'],
        ['basketball', 'Basketball'],
        ['rugby', 'Rugby'],
        ['afl', 'AFL'],
        ['tennis', 'Tennis'],
        ['cricket', 'Cricket'],
        ['nrl', 'NRL']
      ]);
      
      for (const [pattern, label] of sportPatterns) {
        if (url.includes(`/${pattern}/`)) {
          subsection = label;
          
          // Update header with sport name
          if (elements.headerTitle) {
            elements.headerTitle.textContent = label;
          }
          break;
        }
      }
      
      clearRaceDetails();
      clearRunners();
      
    } else if (url.includes('/account/')) {
      section = "Account";
      
      // Update header title
      if (elements.headerTitle) {
        elements.headerTitle.textContent = "Account";
      }
      
      clearRaceDetails();
      clearRunners();
    } else if (url.includes('/promotions/')) {
      section = "Promotions";
      
      // Update header title
      if (elements.headerTitle) {
        elements.headerTitle.textContent = "Promotions";
      }
      
      clearRaceDetails();
      clearRunners();
    } else if (url.match(/^\/?$/)) {
      section = "Home";
      
      // Update header title
      if (elements.headerTitle) {
        elements.headerTitle.textContent = "Home";
      }
      
      clearRaceDetails();
      clearRunners();
    }

    // Update the overlay with detected information
    elements.sectionEl.textContent = section;
    elements.subsectionEl.textContent = subsection;
    
    // More efficient class handling
    elements.sectionEl.className = `section-${section.toLowerCase()}`;
  }

  // Clear race details display
  function clearRaceDetails() {
    if (elements.raceDetailsEl) {
      elements.raceDetailsEl.innerHTML = '';
    }
    // Reset current race info
    currentRaceInfo = {
      trackName: null,
      raceNumber: null
    };
  }

  // Clear runners display
  function clearRunners() {
    if (elements.runnersContainer) {
      elements.runnersContainer.innerHTML = '';
    }
    // Clear betfair odds
    betfairOdds = {};
  }

  // Detect race details on racing pages
  function detectRaceDetails() {
    if (!elements.raceDetailsEl) return;
    
    // Don't process if we're not on a racing page
    if (!window.location.href.includes('/racing/')) {
      clearRaceDetails();
      return;
    }
    
    // Clear existing race details
    clearRaceDetails();
    
    try {
      // Create a fragment to build the race details
      const fragment = document.createDocumentFragment();
      
      // Race number
      const raceNumberElement = document.querySelector('.race-number');
      let raceNumber = null;
      if (raceNumberElement) {
        const raceNumberText = raceNumberElement.textContent.trim();
        // Extract race number
        const raceNumberMatch = raceNumberText.match(/(\d+)/);
        if (raceNumberMatch) {
          raceNumber = raceNumberMatch[1];
        }
        
        const raceNumberDiv = document.createElement('div');
        raceNumberDiv.className = 'race-detail';
        raceNumberDiv.innerHTML = '<strong>Race:</strong> ' + raceNumberText;
        fragment.appendChild(raceNumberDiv);
      }
      
      // Race time
      const raceTimeElement = document.querySelector('.race-time');
      if (raceTimeElement) {
        const raceTimeDiv = document.createElement('div');
        raceTimeDiv.className = 'race-detail';
        raceTimeDiv.innerHTML = '<strong>Time:</strong> ' + raceTimeElement.textContent.trim();
        fragment.appendChild(raceTimeDiv);
      }
      
      // Track conditions
      const trackConditionElement = document.querySelector('.track-condition');
      if (trackConditionElement) {
        const trackConditionDiv = document.createElement('div');
        trackConditionDiv.className = 'race-detail';
        trackConditionDiv.innerHTML = '<strong>Track:</strong> ' + trackConditionElement.textContent.trim();
        fragment.appendChild(trackConditionDiv);
      }
      
      // Track name
      const trackNameElement = document.querySelector('.track-name');
      let trackName = null;
      if (trackNameElement) {
        trackName = trackNameElement.textContent.trim();
        const trackNameDiv = document.createElement('div');
        trackNameDiv.className = 'race-detail';
        trackNameDiv.innerHTML = '<strong>Venue:</strong> ' + trackName;
        fragment.appendChild(trackNameDiv);
      }
      
      // Race distance
      const raceDistanceElement = document.querySelector('.race-distance');
      if (raceDistanceElement) {
        const raceDistanceDiv = document.createElement('div');
        raceDistanceDiv.className = 'race-detail';
        raceDistanceDiv.innerHTML = '<strong>Distance:</strong> ' + raceDistanceElement.textContent.trim();
        fragment.appendChild(raceDistanceDiv);
      }
      
      // If we found any race details, add them to the container
      if (fragment.childNodes.length > 0) {
        const raceDetailsHeader = document.createElement('div');
        raceDetailsHeader.className = 'race-details-header';
        raceDetailsHeader.textContent = 'Race Details:';
        elements.raceDetailsEl.appendChild(raceDetailsHeader);
        elements.raceDetailsEl.appendChild(fragment);
        
        // Store current race info and request Betfair odds
        if (trackName && raceNumber) {
          currentRaceInfo = { trackName, raceNumber };
          requestBetfairOdds(trackName, raceNumber);
        }
      } else {
        const noDetailsMsg = document.createElement('div');
        noDetailsMsg.className = 'no-details';
        noDetailsMsg.textContent = 'No race details available.';
        elements.raceDetailsEl.appendChild(noDetailsMsg);
      }
    } catch (error) {
      console.error('Tab Location: Error detecting race details', error);
      const errorMsg = document.createElement('div');
      errorMsg.className = 'no-details';
      errorMsg.textContent = 'Failed to load race details.';
      elements.raceDetailsEl.appendChild(errorMsg);
    }
  }

  // Request Betfair odds from background script with retry logic
  function requestBetfairOdds(trackName, raceNumber) {
    console.log('Requesting Betfair odds for:', { trackName, raceNumber });
    
    // Reset retry count if this is a new race
    if (currentRaceInfo.trackName !== trackName || currentRaceInfo.raceNumber !== raceNumber) {
      betfairOddsRetryCount = 0;
    }
    
    chrome.runtime.sendMessage({
      action: "getRaceOdds",
      trackName: trackName,
      raceNumber: raceNumber
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
        handleBetfairOddsError();
      } else {
        console.log('Betfair odds request sent, response:', response);
      }
    });
  }

  // Handle Betfair odds errors and retry if needed
  function handleBetfairOddsError() {
    if (betfairOddsRetryCount < MAX_RETRIES) {
      betfairOddsRetryCount++;
      console.log(`Retrying Betfair odds request (attempt ${betfairOddsRetryCount}/${MAX_RETRIES})`);
      setTimeout(() => {
        requestBetfairOdds(currentRaceInfo.trackName, currentRaceInfo.raceNumber);
      }, 2000 * betfairOddsRetryCount); // Exponential backoff
    } else {
      console.error('Max retries reached for Betfair odds');
      // Show error in UI
      if (elements.runnersContainer) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'betfair-error';
        errorMsg.textContent = 'Unable to load Betfair odds. Please try refreshing the page.';
        elements.runnersContainer.appendChild(errorMsg);
      }
    }
  }

  // Update Betfair status display
  function updateBetfairStatus(message, type = 'info') {
    if (!elements.betfairStatusContent) return;
    
    const statusEntry = document.createElement('div');
    statusEntry.className = `status-entry ${type}`;
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'status-timestamp';
    timestampSpan.textContent = `[${timestamp}] `;
    statusEntry.appendChild(timestampSpan);
    
    // Add message
    const messageSpan = document.createElement('span');
    messageSpan.className = 'status-message';
    messageSpan.textContent = message;
    statusEntry.appendChild(messageSpan);
    
    // Add to status content
    elements.betfairStatusContent.appendChild(statusEntry);
    
    // Keep only last 10 messages
    const entries = elements.betfairStatusContent.querySelectorAll('.status-entry');
    if (entries.length > 10) {
      entries[0].remove();
    }
    
    // Scroll to bottom
    elements.betfairStatusContent.scrollTop = elements.betfairStatusContent.scrollHeight;
  }

  // Handle Betfair status updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    // Handle Betfair status updates
    if (request.action === "betfairStatus") {
      updateBetfairStatus(request.message, request.type);
      return;
    }
    
    if (request.action === "betfairOddsResult") {
      console.log('Processing Betfair odds result:', {
        currentTrack: currentRaceInfo.trackName,
        currentRace: currentRaceInfo.raceNumber,
        receivedTrack: request.trackName,
        receivedRace: request.raceNumber,
        odds: request.odds
      });
      
      // Make sure this is for the current race
      if (request.trackName === currentRaceInfo.trackName && 
          request.raceNumber === currentRaceInfo.raceNumber) {
        
        if (request.error) {
          console.error('Received error from Betfair:', request.error);
          updateBetfairStatus(`Error: ${request.error}`, 'error');
          handleBetfairOddsError();
          return;
        }
        
        betfairOdds = request.odds || {};
        console.log('Updated betfairOdds:', betfairOdds);
        
        // Reset retry count on success
        betfairOddsRetryCount = 0;
        
        // Update the display with new odds
        updateRunnerDisplay();
      } else {
        console.log('Received odds for different race, ignoring');
      }
    }
  });

  // Update the runner display with existing information and Betfair odds
  function updateRunnerDisplay() {
    console.log('Updating runner display with betfairOdds:', betfairOdds);
    // Only update if we have a runner container
    if (!elements.runnersContainer) {
      console.log('No runners container found');
      return;
    }
    
    // Remove any existing error message
    const existingError = elements.runnersContainer.querySelector('.betfair-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Find all runner items in our display
    const runnerItems = elements.runnersContainer.querySelectorAll('.runner-item');
    console.log('Found runner items:', runnerItems.length);
    
    runnerItems.forEach(item => {
      const nameElement = item.querySelector('.runner-name-text');
      if (!nameElement) {
        console.log('No name element found for runner item');
        return;
      }
      
      const runnerName = nameElement.textContent.trim();
      // Strip barrier number for matching with Betfair (format: "Runner Name (4)")
      const cleanName = runnerName.replace(/\s+\([0-9]+\)$/, '').trim();
      console.log('Processing runner:', { originalName: runnerName, cleanName });
      
      // Find Betfair odds for this runner
      const betfairOdd = findBetfairOddsForRunner(cleanName);
      console.log('Found Betfair odds for runner:', { cleanName, betfairOdd });
      
      // Get TAB odds if available
      const tabOddsElement = item.querySelector('.tab-odds');
      const tabOdd = tabOddsElement ? parseFloat(tabOddsElement.textContent) : null;
      console.log('Found TAB odds:', tabOdd);
      
      // Create or update odds container
      let oddsContainer = item.querySelector('.odds-container');
      if (!oddsContainer) {
        oddsContainer = document.createElement('div');
        oddsContainer.className = 'odds-container';
        item.appendChild(oddsContainer);
      }
      
      // Clear existing odds
      oddsContainer.innerHTML = '';
      
      // Add TAB odds if available
      if (tabOdd) {
        const tabOddsSpan = document.createElement('span');
        tabOddsSpan.className = 'tab-odds';
        tabOddsSpan.textContent = tabOdd.toFixed(2);
        oddsContainer.appendChild(tabOddsSpan);
      }
      
      // Add Betfair odds
      if (betfairOdd !== null) {
        const betfairOddsSpan = document.createElement('span');
        betfairOddsSpan.className = 'betfair-odds';
        betfairOddsSpan.textContent = betfairOdd.toFixed(2);
        oddsContainer.appendChild(betfairOddsSpan);
        
        // Add highlighting if Betfair odds are better
        if (tabOdd && betfairOdd < tabOdd) {
          item.classList.add('better-odds');
        } else {
          item.classList.remove('better-odds');
        }
      } else {
        // Show loading state for Betfair odds
        const loadingSpan = document.createElement('span');
        loadingSpan.className = 'odds-loading';
        loadingSpan.textContent = 'Loading BF...';
        oddsContainer.appendChild(loadingSpan);
      }
    });
  }

  // Find Betfair odds for a runner by name with improved fuzzy matching
  function findBetfairOddsForRunner(runnerName) {
    if (!betfairOdds) {
      console.log('No betfairOdds available');
      return null;
    }
    
    console.log('Looking for odds for runner:', runnerName);
    console.log('Available betfairOdds:', betfairOdds);
    
    // Try exact match first
    if (betfairOdds[runnerName] !== undefined) {
      console.log('Found exact match for:', runnerName);
      return betfairOdds[runnerName];
    }
    
    // Try case-insensitive match
    const lowerName = runnerName.toLowerCase();
    for (const [name, odds] of Object.entries(betfairOdds)) {
      if (name.toLowerCase() === lowerName) {
        console.log('Found case-insensitive match for:', runnerName);
        return odds;
      }
    }
    
    // Try partial match with improved matching logic
    const nameWords = lowerName.split(' ').filter(w => w.length > 2);
    let bestMatch = null;
    let bestMatchScore = 0;
    
    for (const [name, odds] of Object.entries(betfairOdds)) {
      const matchNameLower = name.toLowerCase();
      let matchScore = 0;
      
      // Check each word in the runner name
      for (const word of nameWords) {
        if (matchNameLower.includes(word)) {
          matchScore += word.length;
        }
      }
      
      // Calculate match percentage
      const matchPercentage = matchScore / nameWords.join('').length;
      
      // Update best match if this is better
      if (matchPercentage > bestMatchScore) {
        bestMatchScore = matchPercentage;
        bestMatch = odds;
      }
    }
    
    if (bestMatchScore >= 0.7) {
      console.log('Found partial match for:', runnerName, 'with score:', bestMatchScore);
    } else {
      console.log('No good match found for:', runnerName, 'best score:', bestMatchScore);
    }
    
    // Return best match if it's good enough (70% match)
    return bestMatchScore >= 0.7 ? bestMatch : null;
  }

  // Detect runners on racing pages with throttling
  let runnerDetectionTimeout = null;
  function detectRunners() {
    // Clear any pending detection
    if (runnerDetectionTimeout) {
      clearTimeout(runnerDetectionTimeout);
    }
    
    runnerDetectionTimeout = setTimeout(() => {
      if (!elements.runnersContainer) return;
      
      // Don't process if we're not on a racing page
      if (!window.location.href.includes('/racing/')) {
        clearRunners();
        return;
      }
      
      // Build DOM fragment in memory to avoid reflows
      const fragment = document.createDocumentFragment();
      
      // Create a header for the runners section
      const runnersHeader = document.createElement('div');
      runnersHeader.className = 'runners-header';
      runnersHeader.textContent = 'Runners:';
      fragment.appendChild(runnersHeader);
      
      try {
        // More efficient runner selection with context
        const runnerElements = document.querySelectorAll('div.runner-name');
        
        if (runnerElements.length > 0) {
          // Create a list element for runners
          const runnersList = document.createElement('ul');
          runnersList.className = 'runners-list';
          
          // Set a maximum number of runners to display
          const maxRunners = 10;
          const displayRunners = Math.min(runnerElements.length, maxRunners);
          
          // Extract runner names, barriers, and odds
          for (let i = 0; i < displayRunners; i++) {
            const element = runnerElements[i];
            
            // Extract text content safely
            let runnerName = '';
            let barrier = '';
            
            // Get the runner name - use textContent property of the element
            // and then extract the barrier if it exists
            const textContent = element.textContent.trim();
            
            // More efficient barrier extraction
            const barrierSpan = element.querySelector('.barrier');
            if (barrierSpan) {
              barrier = barrierSpan.textContent.trim();
              // Remove barrier text from runner name
              runnerName = textContent.replace(barrier, '').trim();
            } else {
              runnerName = textContent;
            }
            
            // Find the odds for this runner
            let tabOdds = "";
            
            // Find the nearest odds element
            // First, try to find parent runner container
            const runnerContainer = findRunnerContainer(element);
            if (runnerContainer) {
              // Look for odds within the runner container
              const oddsElement = runnerContainer.querySelector('div.animate-odd');
              if (oddsElement) {
                tabOdds = oddsElement.textContent.trim();
              }
            }
            
            // Create a list item for this runner with odds
            const listItem = document.createElement('li');
            listItem.className = 'runner-item';
            
            // Add runner name and barrier
            const nameSpan = document.createElement('span');
            nameSpan.className = 'runner-name-text';
            nameSpan.textContent = runnerName + (barrier ? ' ' + barrier : '');
            listItem.appendChild(nameSpan);
            
            // Add odds container with TAB odds
            const oddsContainer = document.createElement('div');
            oddsContainer.className = 'odds-container';
            
            // Add TAB odds
            if (tabOdds) {
              const tabOddsSpan = document.createElement('span');
              tabOddsSpan.className = 'tab-odds';
              tabOddsSpan.textContent = tabOdds;
              oddsContainer.appendChild(tabOddsSpan);
            }
            
            // Add Betfair odds placeholder (will be filled when data arrives)
            const cleanName = runnerName.replace(/\s+\([0-9]+\)$/, '').trim();
            const betfairOdd = findBetfairOddsForRunner(cleanName);
            if (betfairOdd !== null) {
              const betfairOddsSpan = document.createElement('span');
              betfairOddsSpan.className = 'betfair-odds';
              betfairOddsSpan.textContent = betfairOdd;
              oddsContainer.appendChild(betfairOddsSpan);
            }
            
            listItem.appendChild(oddsContainer);
            runnersList.appendChild(listItem);
          }
          
          // Add "more" indicator if needed
          if (runnerElements.length > maxRunners) {
            const moreItem = document.createElement('li');
            moreItem.textContent = `+ ${runnerElements.length - maxRunners} more`;
            runnersList.appendChild(moreItem);
          }
          
          fragment.appendChild(runnersList);
        } else {
          // If no runners found, show a message
          const noRunnersMsg = document.createElement('div');
          noRunnersMsg.className = 'no-runners';
          noRunnersMsg.textContent = 'No runners detected on this page.';
          fragment.appendChild(noRunnersMsg);
        }
      } catch (error) {
        // Error handling
        const errorMsg = document.createElement('div');
        errorMsg.className = 'no-runners';
        errorMsg.textContent = 'Failed to load runners.';
        fragment.appendChild(errorMsg);
        console.error('Tab Location: Error detecting runners', error);
      }
      
      // Clear previous runners and append new ones in one operation
      clearRunners();
      elements.runnersContainer.appendChild(fragment);
    }, 300); // Add a delay to prevent UI freezing
  }

  // Helper function to find the parent runner container
  function findRunnerContainer(element) {
    // Look for a parent element that contains the runner name and odds
    let parent = element.parentElement;
    let attempts = 0;
    const maxAttempts = 5; // Limit traversal depth to avoid performance issues
    
    while (parent && attempts < maxAttempts) {
      // Check if this parent contains odds
      if (parent.querySelector('div.animate-odd')) {
        return parent;
      }
      
      // Move up the DOM tree
      parent = parent.parentElement;
      attempts++;
    }
    
    // If no suitable container found, try finding odds near the element
    const oddsNearby = document.querySelector('div.animate-odd');
    if (oddsNearby) {
      return oddsNearby.parentElement;
    }
    
    return null;
  }

  // Optimized runner observer with debounce
  let observerTimeout = null;
  let observer = null;
  function setupRunnerObserver() {
    // Clean up any existing observer
    if (observer) {
      observer.disconnect();
    }
    
    observer = new MutationObserver((mutations) => {
      // Only process if we're on a racing page
      if (!window.location.href.includes('/racing/')) return;
      
      // Debounce the runner detection
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      
      observerTimeout = setTimeout(() => {
        detectRaceDetails();
        detectRunners();
      }, 500);
    });
    
    // Start observing with a more focused approach
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: false,
      characterData: false
    });
    
    return observer;
  }

  // URL change detector with performance optimizations
  function setupUrlChangeDetector() {
    let lastUrl = location.href;
    
    // Use a single observer for URL changes
    const urlObserver = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        detectSection();
        
        // Only setup runner observer when on racing pages
        if (url.includes('/racing/')) {
          setupRunnerObserver();
        } else if (observer) {
          observer.disconnect();
        }
      }
    });
    
    urlObserver.observe(document, {
      subtree: true, 
      childList: true,
      attributes: false,
      characterData: false
    });
    
    return urlObserver;
  }

  // Initialize the extension
  function init() {
    createOverlay();
    cacheElements();
    detectSection();
    
    // Only setup observer for runner changes if on racing page
    if (window.location.href.includes('/racing/')) {
      setupRunnerObserver();
    }
    
    // Setup URL change detector
    setupUrlChangeDetector();
  }

  // Start the extension when DOM is fully loaded
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();