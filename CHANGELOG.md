# Changelog

## [1.1.1] - 2025-01-08

### Fixed
- Fixed TypeScript errors with Input component `inputStyle` prop
- Fixed infinite loop errors in useEffect hooks across multiple components
- Fixed syntax errors in settings screen with unterminated string literals
- Fixed navigation issues in history screen when viewing transaction details
- Fixed print receipt functionality with proper encoding and logo display
- Fixed tab navigation headers being shown when they should be hidden
- Fixed status bar display issues on mobile devices
- Fixed Android tab bar positioning to prevent overlap with system navigation

### Improved
- Enhanced transaction details page with better error handling
- Improved receipt printing with proper UTF-8 encoding and MPSPAY logo
- Better responsive design for different device sizes (iPhone 16 Pro Max support)
- Optimized useEffect dependencies to prevent unnecessary re-renders
- Enhanced error handling and user feedback throughout the application

### Changed
- Updated version to 1.1.1 stable
- Removed notification-related code and settings as requested
- Improved transaction navigation consistency between home and history screens
- Enhanced print receipt functionality with proper HTML generation

### Technical
- Fixed all TypeScript compilation errors
- Resolved React Native infinite loop issues
- Improved component lifecycle management
- Enhanced error boundary handling
- Better memory management with proper cleanup in useEffect hooks