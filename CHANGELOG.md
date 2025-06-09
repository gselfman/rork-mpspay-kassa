# Changelog

## [1.1.1] - 2025-01-08

### Fixed
- Fixed infinite loop errors in useEffect hooks across multiple components (HomeScreen, TransactionDetailsScreen, HistoryScreen)
- Fixed TypeScript syntax errors in settings screen with unterminated string literals
- Fixed navigation issues in history screen when viewing transaction details
- Fixed print receipt functionality with proper UTF-8 encoding and MPSPAY logo display
- Fixed tab navigation headers being shown when they should be hidden
- Fixed status bar display issues on mobile devices (removed black bar at top)
- Fixed Android tab bar positioning to prevent overlap with system navigation
- Fixed amount input field visibility on iPhone 16 Pro Max by using TextInput instead of Input component
- Fixed header layout on iPhone 16 Pro Max by stacking logo above title instead of side-by-side

### Improved
- Enhanced transaction details page with better error handling and proper data conversion
- Improved receipt printing with proper HTML generation, UTF-8 encoding, and MPSPAY logo
- Better responsive design for different device sizes (iPhone 16 Pro Max support)
- Optimized useEffect dependencies to prevent unnecessary re-renders and infinite loops
- Enhanced error handling and user feedback throughout the application
- Improved transaction navigation consistency between home and history screens
- Enhanced Android tab bar positioning with proper padding and height adjustments

### Added
- Personal Cabinet button on home screen linking to https://merch.mpspay.ru
- Personal Cabinet button description: "Account management, withdrawals, statistics, API keys"
- Proper transaction data passing between history screen and transaction details
- Better mobile-first header layout for large devices

### Removed
- Removed notification-related code and settings as requested
- Removed black status bar overlay that was causing visual issues
- Removed unnecessary Input component usage in payment amount field

### Changed
- Updated version to 1.1.1 stable
- Improved transaction navigation to use same logic as home screen
- Enhanced print receipt functionality with proper HTML generation
- Updated header layout to be more mobile-friendly on large devices
- Improved amount input field to be more visible and accessible

### Technical
- Fixed all TypeScript compilation errors and syntax issues
- Resolved React Native infinite loop issues in useEffect hooks
- Improved component lifecycle management with proper cleanup
- Enhanced error boundary handling
- Better memory management with proper useEffect dependencies
- Fixed StatusBar configuration to prevent black overlay
- Improved tab bar styling for Android devices
- Enhanced responsive design for various screen sizes