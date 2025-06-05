# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2025-01-06

### Fixed
- **Critical Bug Fixes:**
  - Fixed infinite loop error in HomeScreen and TransactionDetailsScreen that was causing app crashes
  - Resolved maximum update depth exceeded error in useEffect hooks
  - Fixed navigation issues when viewing transaction details from Reports section

- **UI/UX Improvements:**
  - Removed unwanted header text "(tabs)" and "transaction[id]" from all screens
  - Fixed header display issues across all tab screens
  - Improved layout for iPhone 16 Pro Max with proper logo positioning
  - Fixed Android navigation bar covering bottom menu icons
  - Enhanced input field visibility on iPhone devices

- **Receipt Generation:**
  - Fixed encoding issues in receipt printing (proper UTF-8 support)
  - Added MPSPAY logo to printed receipts
  - Improved receipt HTML structure and styling
  - Fixed currency symbol display in receipts

- **Code Quality:**
  - Fixed TypeScript errors related to 'inputStyle' prop in Input component
  - Resolved syntax errors in settings screen
  - Improved error handling and state management
  - Enhanced component lifecycle management to prevent memory leaks

- **Performance:**
  - Optimized useEffect dependencies to prevent unnecessary re-renders
  - Improved data fetching logic with proper cleanup
  - Enhanced transaction status checking functionality

### Changed
- Updated app version to 1.1.1 stable
- Improved responsive design for various device sizes
- Enhanced error messages and user feedback
- Better handling of transaction data conversion between different formats

### Removed
- Removed notification-related code and buttons as requested
- Cleaned up unused dependencies and imports
- Removed redundant header configurations

## [1.0.10] - 2025-01-05

### Added
- Initial release with basic payment processing functionality
- Transaction history and reporting
- Product management system
- Multi-language support (English/Russian)
- Dark/Light theme support
- QR code payment generation
- Receipt printing functionality

### Features
- Account balance monitoring
- Payment statistics dashboard
- Transaction status checking
- Withdrawal requests via Telegram
- Personal cabinet integration
- Responsive design for mobile devices