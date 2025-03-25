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
    runnersContainer: null
  };

  // Cache DOM element references
  function cacheElements() {
    elements.sectionEl = document.getElementById('tab-section');
    elements.subsectionEl = document.getElementById('tab-subsection');
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
      
      clearRunners();
      
    } else if (url.includes('/account/')) {
      section = "Account";
      clearRunners();
    } else if (url.includes('/promotions/')) {
      section = "Promotions";
      clearRunners();
    } else if (url.match(/^\/?$/)) {
      section = "Home";
      clearRunners();
    }

    // Update the overlay with detected information
    elements.sectionEl.textContent = section;
    elements.subsectionEl.textContent = subsection;
    
    // More efficient class handling
    elements.sectionEl.className = `section-${section.toLowerCase()}`;
  }

  // Clear runners display
  function clearRunners() {
    if (elements.runnersContainer) {
      elements.runnersContainer.innerHTML = '';
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
            
            // Create a list item for this runner
            const listItem = document.createElement('li');
            listItem.textContent = runnerName + (barrier ? ' ' + barrier : '');
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