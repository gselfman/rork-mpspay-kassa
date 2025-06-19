# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2025-01-19 - Stable

### Fixed
- Fixed "Maximum update depth exceeded" error in HomeScreen component
- Fixed React Native Web compatibility issues with text nodes in View components
- Fixed transaction details navigation from history screen
- Fixed amount input field visibility on iPhone 16 Pro Max
- Fixed header layout for large devices (iPhone 16 Pro Max) - logo now displays above title
- Fixed Android bottom navigation being hidden under system UI

### Changed
- **History Screen**: Redesigned transaction display and interaction
  - Transaction cards now show: status (1-pending, 2-not paid, 3-successful), comment, payment ID, SBP ID for successful payments, date/time, and amount
  - Removed navigation to transaction details page
  - Added modal for sharing transaction details via Telegram or Email instead of showing details page
  
- **Product Creation**: Simplified product creation form
  - Product name field limited to 64 characters (text input)
  - Price field accepts only whole numbers from 1 to 1,000,000
  - After creating product, user is redirected to Products page instead of staying on creation page
  
- **Payment Creation**: Improved product display logic
  - If any products exist in store, available products are shown immediately instead of empty state message
  - Added horizontal scroll for available products
  - Better organization of product selection and cart management

### Added
- New API functions for sending transaction details via Telegram and Email
- Enhanced transaction sharing capabilities
- Better responsive design for large devices
- Improved error handling and user feedback

### Removed
- Transaction details page navigation from history screen (replaced with sharing modal)
- Empty products message when products are available
- Notification-related code and requests (removed notifications button from settings)

### Technical Improvements
- Fixed React state management issues causing infinite loops
- Improved component lifecycle management
- Better error boundary handling
- Enhanced mobile-first responsive design
- Fixed text node rendering issues in React Native Web

## [1.1.0] - 2025-01-18

### Added
- Enhanced transaction history with filtering capabilities
- Product management system
- Improved payment creation workflow
- Better error handling and user feedback

### Changed
- Updated UI components for better mobile experience
- Improved navigation structure
- Enhanced API integration

### Fixed
- Various bug fixes and performance improvements

## [1.0.0] - 2025-01-17

### Added
- Initial release
- Basic payment processing functionality
- Transaction management
- User authentication
- Multi-language support (English/Russian)
- Dark/Light theme support