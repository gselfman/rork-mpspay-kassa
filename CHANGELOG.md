# Changelog

## Version 1.0.7 (Current)
- Redesigned history screen with improved payment history API integration
- Added proper date range filtering (Today, Week, Month, Custom) for payment history
- Implemented status filtering for successful (paymentStatus: 3) and pending (paymentStatus: 1) operations
- Added logo display and "Отчёт" title in history screen header
- Enhanced transaction details screen with PDF receipt generation for successful transactions
- Improved transaction item component to handle both Transaction and PaymentHistoryItem types
- Added proper localization support for Russian and English languages throughout the app
- Enhanced responsive design for different screen sizes (Android and iPhone)
- Added comprehensive error handling and API error display
- Improved dark/light theme support with proper color schemes
- Fixed type mismatches between Transaction and PaymentHistoryItem interfaces
- Added email receipt functionality for completed transactions
- Enhanced payment creation screen with better product management
- Implemented USDT (TRC-20) withdrawal functionality with Telegram Bot API integration
- Added TRON wallet address validation (starts with T, 34 characters)
- Added Telegram contact validation (@username format, minimum 5 characters)
- Added minimum withdrawal amount validation (1000 RUB)
- Enhanced withdrawal request form with proper error handling
- Added withdrawal request history with status tracking
- Fixed all TypeScript syntax errors in utils/api.ts that prevented app compilation
- Updated app version to 1.0.7 in Settings and CHANGELOG

## Version 1.0.6
- Fixed type error in payment screen by changing rawErrorResponse type from string|null to string|undefined
- Fixed text node error in View components
- Improved input field text colors in dark mode for better readability
- Simplified payment details screen by removing duplicate MPS Pay ID field
- Improved payment link sharing UI with a dedicated modal
- Enhanced payment link display with better text wrapping

## Version 1.0.5
- Redesigned payment creation screen with improved UI
- Added logo at the top of the payment screen
- Enhanced product management with add/remove/quantity controls
- Added email receipt functionality with SMTP configuration
- Improved comment generation logic based on available information
- Added receipt generation for completed payments
- Implemented sorting transactions by ID in descending order on home screen

## Version 1.0.4
- Added dark mode support
- Improved transaction history UI
- Fixed payment creation issues
- Added product management

## Version 1.0.3
- Added withdrawal functionality
- Improved error handling
- Enhanced transaction details

## Version 1.0.2
- Added transaction history
- Implemented payment details screen
- Added basic product management

## Version 1.0.1
- Initial release with basic payment functionality
- Added authentication
- Implemented simple dashboard