# Version Control

## Version 1.0.9
**Release Date:** Current

**Changes:**
- **Critical Bug Fixes:**
  - Fixed all TypeScript compilation errors that could prevent app release
  - Added missing color properties (success, error, warning, inputBackground) to colors constants
  - Fixed syntax errors in utils/api.ts including unterminated string literals
  - Fixed type mismatches between Transaction and PaymentHistoryItem interfaces
  - Resolved function call errors expecting 2 arguments but receiving 1

- **Enhanced Error Handling:**
  - Improved error display for API requests with detailed error messages
  - Added comprehensive error handling throughout the application
  - Enhanced error popups with raw response data for debugging
  - Better error recovery and user feedback

- **Localization Improvements:**
  - Complete Russian and English language support
  - All UI elements properly localized based on language setting
  - Consistent translation implementation across all screens
  - Proper date and number formatting for different locales

- **Responsive Design:**
  - Improved layout for different screen sizes (Android and iPhone)
  - Better font scaling using scaleFontSize utility
  - Proper spacing scaling using scaleSpacing utility
  - Enhanced touch targets for better mobile usability

- **SMTP Email Functionality:**
  - Comprehensive SMTP email sending for payment receipts
  - Configurable SMTP settings with secure defaults
  - Email validation and error handling
  - Support for custom SMTP configurations
  - Proper email formatting with transaction details

- **UI/UX Enhancements:**
  - Improved dark mode support with proper color theming
  - Better input field styling and placeholder text colors
  - Enhanced payment creation screen with product management
  - Improved transaction history with filtering and sorting
  - Better loading states and activity indicators

- **Code Quality:**
  - Fixed all TypeScript type errors
  - Improved code organization and maintainability
  - Better error boundaries and exception handling
  - Enhanced logging for debugging purposes

## Version 1.0.8
**Release Date:** Previous Release

**Changes:**
- Added SMTP email sending functionality for payment receipts
- Implemented SMTP configuration settings with default values:
  - SMTP Host: mail.mpspay.ru
  - SMTP Port: 587
  - Connection: STARTTLS
  - Username: app@mpspay.ru
  - Password: 9icdo4pUVC
- Added ability to customize SMTP settings through a modal interface
- Enhanced email receipt templates with better formatting and product details
- Fixed text node error in View components
- Improved input field text colors in dark mode for better readability
- Simplified payment details screen by removing duplicate MPS Pay ID field and renaming "Transaction ID" to "Payment ID"
- Improved payment link sharing UI with a dedicated modal for "Open Link" and "Send Email" options
- Enhanced payment link display with better text wrapping

## Version 1.0.7
**Release Date:** Previous Release

**Changes:**
- Fixed type error in payment screen by changing rawErrorResponse type from string|null to string|undefined
- Fixed text node error in View components
- Improved input field text colors in dark mode for better readability
- Simplified payment details screen by removing duplicate MPS Pay ID field and renaming "Transaction ID" to "Payment ID"
- Improved payment link sharing UI with a dedicated modal for "Open Link" and "Send Email" options
- Enhanced payment link display with better text wrapping
- Fixed various UI issues in dark mode

## Version 1.0.6
**Release Date:** Earlier Release

**Changes:**
- Fixed type error in payment screen
- Changed rawErrorResponse type from string|null to string|undefined to match expected types
- Improved error handling in payment creation process

## Version 1.0.5
**Release Date:** Earlier Release

**Changes:**
- Redesigned payment creation screen with improved UI and UX
- Added logo at the top of the payment screen
- Enhanced product management with add/remove/quantity controls
- Added email receipt functionality with SMTP configuration
- Improved comment generation logic:
  - If customer info exists: merchantName + customer info
  - If no customer info but products exist: merchantName + product list
  - If no customer info and no products: merchantName + "сумма вручную" + date/time
- Added receipt generation for completed payments
- Implemented sorting transactions by ID in descending order on home screen

## Version 1.0.4
**Release Date:** Earlier Release

**Changes:**
- Added dark mode support throughout the application
- Improved transaction history UI with better readability
- Fixed payment creation issues and validation
- Added product management functionality
- Enhanced user experience with better error messages

## Version 1.0.3
**Release Date:** Earlier Release

**Changes:**
- Added withdrawal functionality
- Improved error handling with detailed error messages
- Enhanced transaction details view
- Added support for multiple payment methods

## Version 1.0.2
**Release Date:** Earlier Release

**Changes:**
- Added transaction history with filtering options
- Implemented payment details screen
- Added basic product management
- Improved navigation between screens

## Version 1.0.1
**Release Date:** Initial Release

**Changes:**
- Initial release with basic payment functionality
- Added authentication system
- Implemented simple dashboard
- Basic transaction management