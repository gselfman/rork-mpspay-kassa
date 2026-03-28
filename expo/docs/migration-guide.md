# Data Migration Guide

This document explains how data migration works in the MPSPAY Kassa app and how to handle data structure changes across app updates.

## Overview

The app uses Zustand's persist middleware with custom migration functions to ensure user data is preserved across app updates. Each store has a version number and migration logic to handle data structure changes.

## Store Versioning

Each persisted store has:
- `version`: Current version number (increment when data structure changes)
- `migrate`: Function that transforms old data to new structure
- `name`: Persistent storage key (NEVER change this)

## Migration Process

1. When the app loads, Zustand checks the stored version against the current version
2. If versions differ, the `migrate` function is called
3. The migration function transforms old data to match the new structure
4. If migration fails, fallback values are used

## Adding New Migrations

When you need to change a store's data structure:

1. **Increment the version number**:
```typescript
{
  name: 'store-name',
  version: 2, // Increment from 1 to 2
  // ...
}
```

2. **Update the migration function**:
```typescript
migrate: (persistedState: any, version: number) => {
  if (version === 1) {
    // Transform version 1 data to version 2
    return {
      ...persistedState,
      newField: 'defaultValue',
    };
  }
  
  // Handle other versions...
  return persistedState;
}
```

3. **Test the migration**:
   - Install the old version
   - Add test data
   - Update to the new version
   - Verify data is preserved and transformed correctly

## Critical Rules

### ❌ NEVER DO:
- Change the `name` parameter in persist config
- Remove migration cases for older versions
- Assume data structure without validation

### ✅ ALWAYS DO:
- Increment version when changing data structure
- Validate data in migration functions
- Provide fallback values for corrupted data
- Test migrations with real data

## Store-Specific Migration Details

### Auth Store (`auth-storage`)
- **Version 1**: Initial version with credential validation
- **Critical Data**: API keys, merchant IDs, account details
- **Migration**: Validates required fields, removes invalid credentials

### Product Store (`product-storage`)
- **Version 1**: Initial version with product validation
- **Critical Data**: Product lists with names and prices
- **Migration**: Validates product structure, removes invalid products

### Theme Store (`theme-storage`)
- **Version 1**: Initial version with boolean validation
- **Critical Data**: Dark mode preference, system theme setting
- **Migration**: Ensures boolean values, provides defaults

### Language Store (`language-storage`)
- **Version 1**: Initial version with language validation
- **Critical Data**: User's language preference
- **Migration**: Validates language code, defaults to 'ru'

### Transaction Store (`transaction-storage`)
- **Version 1**: Initial version with transaction validation
- **Critical Data**: Transaction history
- **Migration**: Validates transaction structure, preserves payment URLs

### Withdrawal Store (`withdrawal-storage`)
- **Version 1**: Initial version with request validation
- **Critical Data**: Withdrawal requests and status
- **Migration**: Validates request structure, preserves bank details

## Error Handling

If migration fails:
1. Error is logged to console (and potentially external service)
2. Fallback data is used (empty arrays, default values)
3. User can recover by re-entering data or importing backup

## Testing Migrations

Before each release:

1. **Create test scenarios**:
   - Fresh install (no existing data)
   - Update from previous version with full data
   - Update with corrupted data
   - Update with partial data

2. **Verify data integrity**:
   - All critical data is preserved
   - New fields have appropriate defaults
   - Invalid data is cleaned up
   - App functions normally after migration

3. **Test rollback scenarios**:
   - What happens if user downgrades?
   - How to handle version conflicts?

## Backup and Recovery

Users can export/import configurations as a backup mechanism:
- Export creates JSON file with all settings and products
- Import validates and restores data
- Manual recovery option if automatic migration fails

## Monitoring

In production, consider:
- Logging migration success/failure rates
- Tracking which versions are being migrated from
- Monitoring for data corruption patterns
- User feedback on data loss issues

## Future Considerations

- Implement automatic backups before migrations
- Add migration progress indicators for large datasets
- Consider incremental migrations for better performance
- Add data integrity checks and repair functions