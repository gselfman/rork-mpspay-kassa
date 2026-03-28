# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2025-01-19 - Stable

### Fixed
- **Critical Bug Fix**: Fixed "Maximum update depth exceeded" error in HomeScreen component that was causing infinite loops
- **React Native Web Compatibility**: Fixed text node errors and other React Native Web compatibility issues
- **Transaction Details Navigation**: Fixed navigation issues from History screen to transaction details
- **Amount Input Visibility**: Fixed amount input field visibility issues on large devices (iPhone 16 Pro Max)
- **Header Layout**: Fixed header layout for large devices - logo now displays above title for better visual hierarchy
- **Android Navigation**: Fixed bottom navigation being hidden under system UI on Android devices
- **TypeScript Errors**: Fixed syntax errors in utils/api.ts that were preventing compilation

### Changed
- **History Screen Redesign**: Complete redesign of transaction display and interaction
  - Transaction cards now show comprehensive information: status (1-pending, 2-not paid, 3-successful), comment, payment ID, SBP ID for successful payments, date/time, and amount
  - Removed navigation to transaction details page from history screen
  - Added modal for sharing transaction details via Telegram or Email instead of showing details page
  - Improved transaction filtering with visual status indicators
  
- **Product Creation Simplification**: Streamlined product creation form
  - Product name field limited to 64 characters (text input only)
  - Price field accepts only whole numbers from 1 to 1,000,000 (integer validation)
  - After creating product, user is automatically redirected to Products page
  - Simplified validation with clear error messages
  
- **Payment Creation Enhancement**: Improved product display logic
  - If any products exist in store, available products are shown immediately instead of empty state message
  - Added horizontal scroll for available products for better UX
  - Better organization of product selection and cart management
  - Improved visual hierarchy and spacing

### Added
- **Transaction Sharing**: New API functions for sending transaction details via Telegram and Email
- **Enhanced Error Handling**: Better error boundaries and user feedback throughout the app
- **Responsive Design**: Improved responsive design for large devices with better scaling
- **Print Receipt**: Enhanced receipt printing with proper logo display and encoding fixes
- **Better State Management**: Improved React state management to prevent infinite loops

### Removed
- **Transaction Details Navigation**: Removed navigation from history screen to transaction details (replaced with sharing modal)
- **Empty Products Message**: Removed confusing empty state when products are available
- **Notification Features**: Removed notification-related code and requests as requested
- **Redundant Code**: Cleaned up unused components and simplified codebase

### Technical Improvements
- **React State Management**: Fixed infinite loop issues in useEffect and state updates
- **Component Lifecycle**: Better component lifecycle management and cleanup
- **Error Boundaries**: Enhanced error boundary handling throughout the app
- **Mobile-First Design**: Improved mobile-first responsive design approach
- **React Native Web**: Fixed text node rendering issues and improved web compatibility
- **TypeScript**: Fixed compilation errors and improved type safety

### Performance
- **Reduced Re-renders**: Optimized component re-rendering to prevent performance issues
- **Better Memory Management**: Improved memory management with proper cleanup
- **Faster Navigation**: Streamlined navigation flow for better user experience

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