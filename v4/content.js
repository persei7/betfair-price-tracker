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
    runnersContainer: null
  };

  // Cache DOM element references
  function cacheElements() {
    elements.headerTitle = document.getElementById('tab-header-title');
    elements.sectionEl = document.getElementById('tab-section');
    elements.subsectionEl = document.getElementById('tab-subsection');
    elements.raceDetailsEl = document.getElementById('tab-race-details');
    elements.runnersContainer = document.getElementById('tab-runners-container');
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
  }

  // Clear runners display
  function clearRunners() {
    if (elements.runnersContainer) {
      elements.runnersContainer.innerHTML = '';
    }
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
      if (raceNumberElement) {
        const raceNumberDiv = document.createElement('div');
        raceNumberDiv.className = 'race-detail';
        raceNumberDiv.innerHTML = '<strong>Race:</strong> ' + raceNumberElement.textContent.trim();
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
      if (trackNameElement) {
        const trackNameDiv = document.createElement('div');
        trackNameDiv.className = 'race-detail';
        trackNameDiv.innerHTML = '<strong>Venue:</strong> ' + trackNameElement.textContent.trim();
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
            let odds = "";
            
            // Find the nearest odds element
            // First, try to find parent runner container
            const runnerContainer = findRunnerContainer(element);
            if (runnerContainer) {
              // Look for odds within the runner container
              const oddsElement = runnerContainer.querySelector('div.animate-odd');
              if (oddsElement) {
                odds = oddsElement.textContent.trim();
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
            
            // Add odds if available
            if (odds) {
              const oddsSpan = document.createElement('span');
              oddsSpan.className = 'runner-odds';
              oddsSpan.textContent = odds;
              listItem.appendChild(oddsSpan);
            }
            
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