# BetFair Price Tracker

![BetFair Price Tracker Logo](images/icon128.png)

A Chrome extension that provides real-time price tracking for runners on Betfair Exchange horse racing markets with interactive price history visualization.

## Features

- **Real-time Price Monitoring**: Automatically tracks back and lay prices for all runners in a Betfair horse racing market
- **Price History Visualization**: Displays a clean, minimal histogram of price movements over time:
  - Green line: Back price history
  - Red line: Lay price history
  - Up to 5 minutes of price history visible
- **Price Change Indicators**: Clearly shows price movements with color-coded indicators
- **Export Functionality**: Export complete price history data as JSON
- **Unobtrusive Overlay**: Sits neatly on the side of the Betfair Exchange interface
- **Privacy Focused**: All history is cleared when tab is closed
- **Lightweight**: Minimal impact on browser performance

## Installation

### From Chrome Web Store
*(Once published to Chrome Web Store, instructions will be added here)*

### Manual Installation
1. Download the latest release from the [Releases page](https://github.com/yourusername/betfair-price-tracker/releases)
2. Unzip the downloaded file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" by toggling the switch in the top right corner
5. Click "Load unpacked" and select the unzipped extension directory
6. The BetFair Price Tracker extension should now be installed

## Usage

1. Navigate to any Betfair Exchange horse racing market (e.g., `https://www.betfair.com.au/exchange/plus/horse-racing/...`)
2. The price tracker overlay will automatically appear in the top right corner of the page
3. Each runner's current back and lay prices are displayed along with a histogram showing price trends
4. Price changes are indicated with color-coded values (green for increases, red for decreases)
5. Click the "Export" button to download the complete price history as a JSON file
6. Click the "×" button to hide the overlay (click the extension icon to show it again)

## Screenshots

*Add screenshots here showcasing the extension in action*

## How It Works

- **Real-time Updates**: The extension automatically updates every 5 seconds to capture the latest prices
- **Price History**: Maintains a rolling 5-minute window of price data
- **Visual Display**: 
  - Back prices displayed in green
  - Lay prices displayed in red
  - Historical price movements visualized as line charts
- **Data Handling**: 
  - All price history is stored locally
  - Data is automatically cleared when you close the tab for privacy

## Development

### Prerequisites
- Google Chrome browser
- Basic knowledge of JavaScript, HTML, and CSS
- Familiarity with Chrome Extension development

### Development Setup
1. Clone this repository:
```
git clone https://github.com/yourusername/betfair-price-tracker.git
cd betfair-price-tracker
```

2. Load the extension in developer mode:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

3. Make your changes to the code
4. Refresh the extension in `chrome://extensions/` to test your changes

### Project Structure
- `manifest.json`: Extension configuration
- `background.js`: Background service worker for handling data and tab events
- `content.js`: Content script that creates the overlay and handles price tracking
- `images/`: Extension icons

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Betfair Exchange for providing the racing market platform
- Everyone who contributed to this project

---

**Note**: This extension is not officially affiliated with or endorsed by Betfair. It is an independent tool created to enhance the user experience on Betfair Exchange.