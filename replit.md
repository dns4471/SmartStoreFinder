# Smart Store Finder Chrome Extension

## Overview

This is a Chrome extension that provides automated search functionality for Naver Smart Store and shopping pages. The extension allows users to search for products by brand and keyword, with options for exact matching and recent search history.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Extension Architecture
The application follows the standard Chrome Extension Manifest V3 architecture:

**Background Service Worker**: Handles extension lifecycle events, message routing between components, and manages persistent state through Chrome's storage API.

**Content Scripts**: Injected into target web pages (Naver Smart Store and shopping pages) to interact with the DOM and execute automated search functionality.

**Popup Interface**: Provides the user interface for inputting search parameters and displaying results, built with vanilla HTML, CSS, and JavaScript.

## Key Components

### 1. Background Service Worker (`background.js`)
- **Purpose**: Manages extension lifecycle and inter-component communication
- **Key Functions**:
  - Installation and update handling
  - Message routing between popup and content scripts
  - Initial storage setup for user preferences
- **Storage Management**: Initializes and manages recent searches and saved input preferences

### 2. Content Script (`content.js`)
- **Purpose**: Executes automated search functionality on target websites
- **Key Functions**:
  - DOM manipulation for search execution
  - Message handling from popup interface
  - Search state management to prevent concurrent operations
- **Target Sites**: Naver Smart Store (`smartstore.naver.com`) and Naver Shopping (`search.shopping.naver.com`)

### 3. Popup Interface
- **HTML** (`popup.html`): Clean, form-based interface with brand/keyword inputs and search options
- **CSS** (`popup.css`): Modern gradient design with responsive layout
- **JavaScript** (`popup.js`): Handles form submission, input validation, and communication with background scripts

### 4. Manifest Configuration (`manifest.json`)
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: activeTab, tabs, storage for necessary functionality
- **Host Permissions**: Restricted to Naver shopping domains for security

## Data Flow

1. **User Input**: User enters brand name and keyword in popup interface
2. **Form Validation**: JavaScript validates required fields before submission
3. **Message Passing**: Popup sends search parameters to content script via background service worker
4. **Search Execution**: Content script manipulates target page DOM to perform automated search
5. **State Management**: Recent searches and input preferences saved to Chrome storage
6. **Response Handling**: Results communicated back through message passing system

## External Dependencies

### Target Platforms
- **All Naver Pages** (`*.naver.com/*`) - 확장된 도메인 지원으로 모든 네이버 서비스에서 작동

### Chrome APIs
- **chrome.runtime**: Message passing and extension lifecycle
- **chrome.storage.local**: Persistent data storage for user preferences
- **chrome.tabs**: Tab management and navigation

### Browser Features
- **Content Security Policy**: Restrictive CSP for security
- **Service Worker**: Background processing without persistent pages

## Deployment Strategy

### Distribution Method
- Chrome Web Store publication (standard Chrome extension distribution)
- Manual installation via developer mode for testing

### Security Considerations
- **Host Permissions**: Limited to specific Naver domains
- **Content Security Policy**: Prevents unauthorized script execution
- **Manifest V3**: Uses latest security standards with service workers

### Update Strategy
- **Automatic Updates**: Through Chrome Web Store distribution
- **Version Management**: Semantic versioning in manifest.json
- **Update Handling**: Background script manages update events and data migration

### Performance Optimization
- **Lazy Loading**: Content scripts only inject when needed
- **Minimal Permissions**: Only requests necessary browser permissions
- **Efficient Storage**: Uses local storage for user preferences and search history

## Development Notes

- **Language**: Korean interface with English code comments
- **Architecture**: Follows Chrome Extension best practices with clear separation of concerns
- **Error Handling**: Comprehensive error management throughout message passing system
- **User Experience**: Focuses on simplicity with form validation and status feedback