/**
 * Migration utilities for Zustand stores
 * 
 * This file contains helper functions for data migration and validation
 * to ensure data integrity across app updates.
 */

export interface MigrationError {
  store: string;
  version: number;
  error: string;
  timestamp: string;
}

/**
 * Log migration errors for debugging and monitoring
 */
export const logMigrationError = (error: MigrationError): void => {
  console.error('Migration Error:', error);
  
  // In production, you might want to send this to a logging service
  // or store it locally for debugging purposes
};

/**
 * Validate that a value is a non-empty string
 */
export const isValidString = (value: any): value is string => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Validate that a value is a positive number
 */
export const isValidPositiveNumber = (value: any): value is number => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

/**
 * Validate that a value is a valid date string
 */
export const isValidDateString = (value: any): value is string => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Safely parse JSON with error handling
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
};

/**
 * Create a migration function with error handling
 */
export const createMigration = <T>(
  storeName: string,
  migrationFn: (persistedState: any, version: number) => T,
  fallback: T
) => {
  return (persistedState: any, version: number): T => {
    try {
      return migrationFn(persistedState, version);
    } catch (error) {
      logMigrationError({
        store: storeName,
        version,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      return fallback;
    }
  };
};

/**
 * Validate and sanitize an array of objects
 */
export const validateArray = <T>(
  array: any,
  validator: (item: any) => T | null
): T[] => {
  if (!Array.isArray(array)) return [];
  
  return array
    .map(validator)
    .filter((item): item is T => item !== null);
};

/**
 * Deep clone an object to avoid mutation during migration
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Check if the current version is newer than the persisted version
 */
export const shouldMigrate = (currentVersion: number, persistedVersion: number): boolean => {
  return currentVersion > persistedVersion;
};

/**
 * Get the current app version for migration tracking
 */
export const getAppVersion = (): string => {
  // This could be read from app.json or package.json in a real implementation
  return '1.0.0';
};