// This script runs on the tab racing page

// Configuration - customize these selectors based on the actual tab racing site structure
const CONFIG = {
  raceCardSelector: '.race-card',
  oddsSelector: '.competitor-odds',
  competitorNameSelector: '.competitor-name'
};

// Main initialization function
function init() {
  console.log('Tab Racing Odds Overlay: Content script initialized');
  
  // Check if we're on a racing page by looking for race cards
  const raceCards = document.querySelectorAll(CONFIG.raceCardSelector);
  if (raceCards.length === 0) {
    console.log('Tab Racing Odds Overlay: No race cards detected on this page');
    return;
  }
  
  console.log(`Tab Racing Odds Overlay: Found ${raceCards.length} race cards`);
  
  // Set up mutation observer to handle dynamic content changes
  setupMutationObserver();
  
  // Initial overlay creation
  createOverlays();
}

// Create overlays for all competitors on the page
function createOverlays() {
  const competitorOddsElements = document.querySelectorAll(CONFIG.oddsSelector);
  
  competitorOddsElements.forEach(oddsElement => {
    // Find the competitor name associated with these odds
    const competitorElement = oddsElement.closest('.competitor-container');
    if (!competitorElement) return;
    
    const nameElement = competitorElement.querySelector(CONFIG.competitorNameSelector);
    if (!nameElement) return;
    
    const competitorName = nameElement.textContent.trim();
    
    // Create and position the overlay
    const overlay = createOddsOverlay(competitorName);
    positionOverlay(overlay, oddsElement);
  });
}

// Create an individual odds overlay element
function createOddsOverlay(competitorName) {
  // Check if overlay already exists for this competitor
  const existingOverlay = document.querySelector(`.tab-racing-odds-overlay[data-name="${competitorName}"]`);
  if (existingOverlay) return existingOverlay;
  
  // Create new overlay element
  const overlay = document.createElement('div');
  overlay.className = 'tab-racing-odds-overlay';
  overlay.setAttribute('data-name', competitorName);
  
  // For now, we'll use mock data - this would be replaced by your actual odds source
  const mockAlternativeOdds = generateMockOdds();
  
  // Create overlay content
  overlay.innerHTML = `
    <div class="alternative-odds">
      <span class="odds-value">${mockAlternativeOdds}</span>
      <span class="odds-source">Alt Source</span>
    </div>
  `;
  
  // Add event listeners
  overlay.addEventListener('click', () => {
    overlay.classList.toggle('expanded');
  });
  
  // Add to document
  document.body.appendChild(overlay);
  return overlay;
}

// Position the overlay near the original odds
function positionOverlay(overlay, oddsElement) {
  const rect = oddsElement.getBoundingClientRect();
  
  // Position the overlay next to the original odds
  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.left = `${rect.right + window.scrollX + 10}px`; // 10px spacing
  
  // Make sure overlay remains visible when page scrolls
  window.addEventListener('scroll', () => {
    const updatedRect = oddsElement.getBoundingClientRect();
    overlay.style.top = `${updatedRect.top + window.scrollY}px`;
  });
}

// Set up mutation observer to handle dynamic content changes
function setupMutationObserver() {
  const observer = new MutationObserver(mutations => {
    let needsUpdate = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && 
          (mutation.target.matches(CONFIG.raceCardSelector) || 
           mutation.target.closest(CONFIG.raceCardSelector))) {
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      console.log('Tab Racing Odds Overlay: Detected changes in race cards, updating overlays');
      createOverlays();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Generate mock odds for testing - replace this with your actual odds source
function generateMockOdds() {
  // Generate a random odds value between 1.5 and 10.0
  const odds = (Math.random() * 8.5 + 1.5).toFixed(2);
  return odds;
}

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}