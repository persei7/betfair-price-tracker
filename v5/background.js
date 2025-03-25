// background.js
let BETFAIR_CREDENTIALS = {
    username: "",
    password: "",
    appKey: ""
  };
  
  // API endpoints
  const BETFAIR_API = {
    login: "https://identitysso.betfair.com/api/login",
    listEventTypes: "https://api.betfair.com/exchange/betting/rest/v1.0/listEventTypes/",
    listMarketCatalogue: "https://api.betfair.com/exchange/betting/rest/v1.0/listMarketCatalogue/",
    listMarketBook: "https://api.betfair.com/exchange/betting/rest/v1.0/listMarketBook/"
  };
  
  let sessionToken = null;
  
  // Send status update to content script
  async function sendStatusUpdate(message, type = 'info') {
    try {
      // Get all tabs in the current window
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tabs || tabs.length === 0) {
        console.log('No active tab found for status update');
        return;
      }

      // Try to send message to each tab until one succeeds
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: "betfairStatus",
            message: message,
            type: type
          });
          // If we get here, message was sent successfully
          return;
        } catch (error) {
          // If this is a connection error, try the next tab
          if (error.message.includes('Receiving end does not exist')) {
            continue;
          }
          // For other errors, throw them
          throw error;
        }
      }
      
      console.log('Could not send status update to any tab');
    } catch (error) {
      console.error('Error sending status update:', error);
    }
  }
  
  // Load credentials from the same JSON file as BetFairBot3.py
  async function loadCredentials() {
    try {
      // Use chrome.runtime.getURL to get the path to the credentials.json file
      const credentialsPath = chrome.runtime.getURL('credentials.json');
  
      // Fetch the credentials.json file
      const response = await fetch(credentialsPath);
      if (!response.ok) {
        throw new Error(`Failed to load credentials: ${response.statusText}`);
      }
  
      // Parse the JSON file and set the credentials
      const cred = await response.json();
      BETFAIR_CREDENTIALS = {
        username: cred.username,
        password: cred.password,
        appKey: cred.app_key // Match the Python script's key naming
      };
  
      await sendStatusUpdate("Credentials loaded successfully");
      return true;
    } catch (error) {
      await sendStatusUpdate(`Error loading credentials: ${error.message}`, 'error');
      return false;
    }
  }
  
  // Login to Betfair
  async function loginToBetfair() {
    // First, make sure credentials are loaded
    if (!BETFAIR_CREDENTIALS.username || !BETFAIR_CREDENTIALS.appKey) {
      const loaded = await loadCredentials();
      if (!loaded) return false;
    }
    
    try {
      await sendStatusUpdate('Attempting Betfair login...');
      
      // Create form data
      const formData = new URLSearchParams();
      formData.append('username', BETFAIR_CREDENTIALS.username);
      formData.append('password', BETFAIR_CREDENTIALS.password);
      
      // First, get the session token
      const loginResponse = await fetch(BETFAIR_API.login, {
        method: "POST",
        headers: {
          "X-Application": BETFAIR_CREDENTIALS.appKey,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: formData.toString()
      });
      
      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        await sendStatusUpdate(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`, 'error');
        await sendStatusUpdate(`Error details: ${errorText}`, 'error');
        return false;
      }
      
      const data = await loginResponse.json();
      if (data.status === "SUCCESS") {
        sessionToken = data.token;
        await sendStatusUpdate("Betfair login successful");
        return true;
      } else {
        await sendStatusUpdate(`Betfair login failed: ${data.error}`, 'error');
        return false;
      }
    } catch (error) {
      await sendStatusUpdate(`Error logging in to Betfair: ${error.message}`, 'error');
      return false;
    }
  }
  
  // Make authenticated request to Betfair API
  async function betfairApiRequest(endpoint, payload) {
    if (!sessionToken) {
      await sendStatusUpdate('No session token, attempting login...');
      const loggedIn = await loginToBetfair();
      if (!loggedIn) {
        await sendStatusUpdate('Failed to login to Betfair', 'error');
        return null;
      }
    }
    
    try {
      await sendStatusUpdate(`Making API request to: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "X-Application": BETFAIR_CREDENTIALS.appKey,
          "X-Authentication": sessionToken,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        await sendStatusUpdate(`API request failed: ${response.status} ${response.statusText}`, 'error');
        await sendStatusUpdate(`Error details: ${errorText}`, 'error');
        
        // If we get a 401, try to login again
        if (response.status === 401) {
          await sendStatusUpdate('Session expired, attempting to login again...');
          sessionToken = null;
          const loggedIn = await loginToBetfair();
          if (loggedIn) {
            // Retry the request with new session token
            return betfairApiRequest(endpoint, payload);
          }
        }
        
        return null;
      }
      
      const data = await response.json();
      await sendStatusUpdate('API request successful');
      return data;
    } catch (error) {
      await sendStatusUpdate(`Error making API request: ${error.message}`, 'error');
      return null;
    }
  }
  
  // Get Horse Racing event type ID
  async function getHorseRacingEventTypeId() {
    const payload = {
      filter: {
        textQuery: "Horse Racing"
      }
    };
    
    const data = await betfairApiRequest(BETFAIR_API.listEventTypes, payload);
    if (!data || !data.length) return null;
    
    return data[0].eventType.id;
  }
  
  // Search for a race meeting by name
  async function findRaceMeeting(trackName, eventTypeId) {
    const today = new Date().toISOString().split('T')[0];
    
    const payload = {
      filter: {
        eventTypeIds: [eventTypeId],
        marketStartTime: {
          from: `${today}T00:00:00Z`,
          to: `${today}T23:59:59Z`
        },
        textQuery: trackName
      },
      maxResults: 100,
      marketProjection: ["EVENT", "MARKET_START_TIME"]
    };
    
    console.log('Searching for race meeting:', { trackName, eventTypeId });
    const result = await betfairApiRequest(BETFAIR_API.listMarketCatalogue, payload);
    
    if (!result || !result.length) {
      console.error('No meetings found for track:', trackName);
      return null;
    }
    
    console.log('Found meetings:', result.map(m => m.event.name));
    return result;
  }
  
  // Get market for a specific race number
  async function findRaceMarket(meetings, raceNumber) {
    if (!meetings || !meetings.length) {
      console.error('No meetings provided to findRaceMarket');
      return null;
    }
    
    console.log('Looking for race market:', { raceNumber, totalMeetings: meetings.length });
    
    // Try to find race number in market name
    for (const market of meetings) {
      console.log('Checking market:', market.marketName);
      if (market.marketName.includes(`R${raceNumber}`) || 
          market.marketName.includes(`Race ${raceNumber}`)) {
        console.log('Found matching market:', market.marketName);
        return market;
      }
    }
    
    console.error('No market found for race:', raceNumber);
    return null;
  }
  
  // Get odds for a specific market
  async function getMarketOdds(marketId) {
    if (!marketId) return null;
    
    const payload = {
      marketIds: [marketId],
      priceProjection: {
        priceData: ["EX_BEST_OFFERS"],
        virtualise: true
      }
    };
    
    const data = await betfairApiRequest(BETFAIR_API.listMarketBook, payload);
    if (!data || !data.length) return null;
    
    return data[0];
  }
  
  // Get runners for a specific market with detailed projection
  async function getMarketRunners(marketId) {
    if (!marketId) return null;
    
    const payload = {
      filter: {
        marketIds: [marketId]
      },
      maxResults: 1,
      marketProjection: ["RUNNER_DESCRIPTION"]
    };
    
    const data = await betfairApiRequest(BETFAIR_API.listMarketCatalogue, payload);
    if (!data || !data.length) return null;
    
    return data[0].runners;
  }
  
  // Find odds for a specific race
  async function findRaceOdds(trackName, raceNumber) {
    try {
      console.log('Finding odds for race:', { trackName, raceNumber });
      
      // Get Horse Racing event type ID
      const eventTypeId = await getHorseRacingEventTypeId();
      if (!eventTypeId) {
        console.error('Failed to get Horse Racing event type ID');
        return null;
      }
      console.log('Got Horse Racing event type ID:', eventTypeId);
      
      // Find race meeting
      const meetings = await findRaceMeeting(trackName, eventTypeId);
      if (!meetings || !meetings.length) {
        console.error('No meetings found for track:', trackName);
        return null;
      }
      console.log('Found meetings:', meetings.length);
      
      // Find race market
      const market = await findRaceMarket(meetings, raceNumber);
      if (!market) {
        console.error('No market found for race:', raceNumber);
        return null;
      }
      console.log('Found market:', market.marketName);
      
      // Get market runners for names
      const runners = await getMarketRunners(market.marketId);
      if (!runners) {
        console.error('No runners found for market:', market.marketId);
        return null;
      }
      console.log('Found runners:', runners.map(r => r.runnerName));
      
      // Get market odds
      const marketBook = await getMarketOdds(market.marketId);
      if (!marketBook) {
        console.error('No market book found for market:', market.marketId);
        return null;
      }
      console.log('Got market book with runners:', marketBook.runners.length);
      
      // Create mapping of runner names to odds
      const runnerMapping = {};
      runners.forEach(runner => {
        runnerMapping[runner.selectionId] = runner.runnerName;
      });
      console.log('Runner mapping:', runnerMapping);
      
      // Map odds to runner names
      const oddsMap = {};
      marketBook.runners.forEach(runner => {
        const name = runnerMapping[runner.selectionId];
        if (name && runner.status === 'ACTIVE') {
          let backPrice = null;
          if (runner.ex && runner.ex.availableToBack && runner.ex.availableToBack.length > 0) {
            backPrice = runner.ex.availableToBack[0].price;
          }
          oddsMap[name] = backPrice;
        }
      });
      
      console.log('Final odds map:', oddsMap);
      return oddsMap;
    } catch (error) {
      console.error("Error finding race odds:", error);
      return null;
    }
  }
  
  // Initialize - load credentials at startup
  loadCredentials().then(success => {
    if (success) {
      console.log('Credentials loaded successfully');
      // Try to login immediately
      loginToBetfair().then(success => {
        if (success) {
          console.log('Initial Betfair login successful');
        } else {
          console.error('Initial Betfair login failed');
        }
      });
    } else {
      console.error('Failed to load credentials');
    }
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    if (request.action === "getRaceOdds") {
      const { trackName, raceNumber } = request;
      console.log('Processing getRaceOdds request:', { trackName, raceNumber });
      
      // Immediately respond that we're processing
      sendResponse({ status: "processing" });
      
      // Process the request asynchronously
      findRaceOdds(trackName, raceNumber)
        .then(async odds => {
          console.log('Sending odds result to content script:', odds);
          try {
            // Get all tabs in the current window
            const tabs = await chrome.tabs.query({active: true, currentWindow: true});
            
            if (!tabs || tabs.length === 0) {
              console.log('No active tab found for odds result');
              return;
            }

            // Try to send message to each tab until one succeeds
            for (const tab of tabs) {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  action: "betfairOddsResult",
                  odds: odds,
                  trackName: trackName,
                  raceNumber: raceNumber
                });
                // If we get here, message was sent successfully
                return;
              } catch (error) {
                // If this is a connection error, try the next tab
                if (error.message.includes('Receiving end does not exist')) {
                  continue;
                }
                // For other errors, throw them
                throw error;
              }
            }
            
            console.log('Could not send odds result to any tab');
          } catch (error) {
            console.error('Error sending odds result:', error);
          }
        })
        .catch(async error => {
          console.error("Error fetching Betfair odds:", error);
          try {
            const tabs = await chrome.tabs.query({active: true, currentWindow: true});
            if (tabs && tabs.length > 0) {
              await chrome.tabs.sendMessage(tabs[0].id, {
                action: "betfairOddsResult",
                error: "Failed to fetch Betfair odds",
                trackName: trackName,
                raceNumber: raceNumber
              });
            }
          } catch (sendError) {
            console.error('Error sending error message:', sendError);
          }
        });
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }
    
    // Add an endpoint to update credentials path if needed
    if (request.action === "setCredentialsPath") {
      chrome.storage.local.set({ credentialsPath: request.path }, () => {
        loadCredentials().then(success => {
          sendResponse({ success });
        });
      });
      return true;
    }
  });