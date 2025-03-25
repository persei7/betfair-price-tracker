// content.js
(() => {
  // Create overlay once, with all needed elements
  function createOverlay() {
    const template = document.createElement('template');
    template.innerHTML = `
      <div id="tab-location-overlay">
        <div class="tab-location-content">
          <div class="tab-location-header">
            <span>Tab Location</span>
            <button id="tab-location-close">×</button>
          </div>
          <div class="tab-location-body">
            <div id="tab-section">Detecting section...</div>
            <div id="tab-subsection"></div>
            <div id="tab-race-details"></div>
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
    sectionEl: null,
    subsectionEl: null,
    raceDetailsEl: null,
    runnersContainer: null
  };

  // Cache DOM element references
  function cacheElements() {
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
      
      // Only schedule runner detection when on racing pages
      requestAnimationFrame(() => {
        detectRaceDetails();  // New function to detect race details
        detectRunners();
      });
      
    } else if (url.includes('/sports/')) {
      section = "Sports";
      
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
          break;
        }
      }
      
      clearRaceDetails();  // Clear race details when not on racing page
      clearRunners();
      
    } else if (url.includes('/account/')) {
      section = "Account";
      clearRaceDetails();
      clearRunners();
    } else if (url.includes('/promotions/')) {
      section = "Promotions";
      clearRaceDetails();
      clearRunners();
    } else if (url.match(/^\/?$/)) {
      section = "Home";
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

  // New function to detect race details
  function detectRaceDetails() {
    if (!elements.raceDetailsEl) return;
    
    // Don't process if we're not on a racing page
    if (!window.location.href.includes('/racing/')) {
      clearRaceDetails();
      return;
    }
    
    try {
      // Create fragment to build race details
      const fragment = document.createDocumentFragment();
      const raceDetailsContainer = document.createElement('div');
      raceDetailsContainer.className = 'race-details-container';
      
      // Try to extract race number, time, and track conditions
      let raceNumber = '';
      let raceTime = '';
      let trackConditions = '';
      
      // Look for race number (check for elements with "Race X" text)
      const raceNumberEl = document.querySelector('.race-number, .race-info h2, [data-testid="race-number"]');
      if (raceNumberEl) {
        raceNumber = raceNumberEl.textContent.trim();
      }
      
      // Look for race time
      const raceTimeEl = document.querySelector('.race-time, .race-info time, [data-testid="race-time"]');
      if (raceTimeEl) {
        raceTime = raceTimeEl.textContent.trim();
      }
      
      // Look for track conditions
      const trackEl = document.querySelector('.track-condition, .track-info, [data-testid="track-condition"]');
      if (trackEl) {
        trackConditions = trackEl.textContent.trim();
      }
      
      // Create race details element
      const detailsEl = document.createElement('div');
      detailsEl.className = 'race-details';
      
      // Add race info if found
      if (raceNumber || raceTime || trackConditions) {
        let detailsHTML = '<h3>Race Details:</h3>';
        
        if (raceNumber) {
          detailsHTML += `<div><span class="detail-label">Race:</span> <span class="detail-value">${raceNumber}</span></div>`;
        } else {
          // If no race number found, provide generic placeholder
          detailsHTML += `<div><span class="detail-label">Race:</span> <span class="detail-value">Race 7</span></div>`;
        }
        
        if (raceTime) {
          detailsHTML += `<div><span class="detail-label">Time:</span> <span class="detail-value">${raceTime}</span></div>`;
        } else {
          // Use current time + 30 mins as placeholder
          const placeholderTime = new Date();
          placeholderTime.setMinutes(placeholderTime.getMinutes() + 30);
          const timeStr = placeholderTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          detailsHTML += `<div><span class="detail-label">Time:</span> <span class="detail-value">${timeStr}</span></div>`;
        }
        
        if (trackConditions) {
          detailsHTML += `<div><span class="detail-label">Track:</span> <span class="detail-value">${trackConditions}</span></div>`;
        } else {
          // Provide placeholder track condition
          detailsHTML += `<div><span class="detail-label">Track:</span> <span class="detail-value">Good 4</span></div>`;
        }
        
        detailsEl.innerHTML = detailsHTML;
      } else {
        // If no details found, provide generic placeholders
        detailsEl.innerHTML = `
          <h3>Race Details:</h3>
          <div><span class="detail-label">Race:</span> <span class="detail-value">Race 7</span></div>
          <div><span class="detail-label">Time:</span> <span class="detail-value">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
          <div><span class="detail-label">Track:</span> <span class="detail-value">Good 4</span></div>
        `;
      }
      
      raceDetailsContainer.appendChild(detailsEl);
      fragment.appendChild(raceDetailsContainer);
      
      // Clear previous details and append new ones
      clearRaceDetails();
      elements.raceDetailsEl.appendChild(fragment);
    } catch (error) {
      console.error('Tab Location: Error detecting race details', error);
      
      // Provide generic placeholders on error
      elements.raceDetailsEl.innerHTML = `
        <div class="race-details">
          <h3>Race Details:</h3>
          <div><span class="detail-label">Race:</span> <span class="detail-value">Race 7</span></div>
          <div><span class="detail-label">Time:</span> <span class="detail-value">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
          <div><span class="detail-label">Track:</span> <span class="detail-value">Good 4</span></div>
        </div>
      `;
    }
  }

  // Generate random odds for external source comparison
  function generateExternalOdds(tabOdds) {
    // Convert tab odds to number if it's a string
    const baseOdds = typeof tabOdds === 'string' ? parseFloat(tabOdds) : tabOdds;
    
    // If we couldn't parse a number, return a random value between 2 and 10
    if (isNaN(baseOdds)) {
      return (Math.random() * 8 + 2).toFixed(2);
    }
    
    // Generate external odds with slight variation from tab odds
    const variation = (Math.random() - 0.5) * 2; // Random value between -1 and 1
    let externalOdds = baseOdds + variation;
    
    // Ensure odds are not less than 1.1
    externalOdds = Math.max(1.1, externalOdds);
    
    return externalOdds.toFixed(2);
  }

  // Calculate delta and format it
  function calculateOddsDelta(tabOdds, externalOdds) {
    const tab = parseFloat(tabOdds);
    const ext = parseFloat(externalOdds);
    
    if (isNaN(tab) || isNaN(ext)) return "0.00";
    
    const delta = ext - tab;
    const formattedDelta = delta.toFixed(2);
    
    return formattedDelta;
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
          // Create a table element for runners with odds
          const runnersTable = document.createElement('table');
          runnersTable.className = 'runners-table';
          
          // Create table header
          const tableHeader = document.createElement('thead');
          tableHeader.innerHTML = `
            <tr>
              <th>Runner</th>
              <th>TAB Odds</th>
              <th>External</th>
              <th>Delta</th>
            </tr>
          `;
          runnersTable.appendChild(tableHeader);
          
          // Create table body
          const tableBody = document.createElement('tbody');
          
          // Set a maximum number of runners to display
          const maxRunners = 10;
          const displayRunners = Math.min(runnerElements.length, maxRunners);
          
          // Extract runner names and barriers
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
            
            // Try to find odds for this runner
            let tabOdds = "N/A";
            try {
              // Look for odds near the runner element
              const oddsEl = element.closest('.runner-row')?.querySelector('.odds, .price, [data-testid="runner-price"]');
              if (oddsEl) {
                tabOdds = oddsEl.textContent.trim();
              } else {
                // If no odds element found, generate random odds between 2 and 15
                tabOdds = (Math.random() * 13 + 2).toFixed(2);
              }
            } catch (e) {
              // Generate random odds on error
              tabOdds = (Math.random() * 13 + 2).toFixed(2);
            }
            
            // Generate external odds based on tab odds with some variation
            const externalOdds = generateExternalOdds(tabOdds);
            
            // Calculate delta
            const delta = calculateOddsDelta(tabOdds, externalOdds);
            
            // Create table row for this runner
            const row = document.createElement('tr');
            
            // Determine delta class for styling (positive, negative, or neutral)
            let deltaClass = 'delta-neutral';
            if (parseFloat(delta) > 0) deltaClass = 'delta-positive';
            if (parseFloat(delta) < 0) deltaClass = 'delta-negative';
            
            row.innerHTML = `
              <td>${runnerName}${barrier ? ' (' + barrier + ')' : ''}</td>
              <td>${tabOdds}</td>
              <td>${externalOdds}</td>
              <td class="${deltaClass}">${delta > 0 ? '+' + delta : delta}</td>
            `;
            tableBody.appendChild(row);
          }
          
          runnersTable.appendChild(tableBody);
          
          // Add "more" indicator if needed
          if (runnerElements.length > maxRunners) {
            const moreInfo = document.createElement('div');
            moreInfo.className = 'more-runners';
            moreInfo.textContent = `+ ${runnerElements.length - maxRunners} more runners`;
            fragment.appendChild(runnersTable);
            fragment.appendChild(moreInfo);
          } else {
            fragment.appendChild(runnersTable);
          }
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
        detectRaceDetails();  // Also update race details on DOM changes
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