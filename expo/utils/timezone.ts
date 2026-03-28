/**
 * Utility functions for timezone handling
 * Converts UTC dates to Moscow time (GMT+3)
 */

/**
 * Convert UTC date to Moscow time (GMT+3)
 */
export const toMoscowTime = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    const utcDate = new Date(dateString);
    // Add 3 hours for Moscow time (GMT+3)
    const moscowDate = new Date(utcDate.getTime() + (3 * 60 * 60 * 1000));
    return moscowDate;
  } catch (error) {
    console.error('Error converting to Moscow time:', error);
    return null;
  }
};

/**
 * Format date in Moscow time for display
 */
export const formatMoscowTime = (
  dateString: string | undefined, 
  language: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return '';
  
  try {
    // Parse the date and convert to Moscow time
    const utcDate = new Date(dateString);
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
      ...options
    };
    
    return utcDate.toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', defaultOptions);
  } catch (error) {
    console.error('Error formatting Moscow time:', error);
    return dateString || '';
  }
};

/**
 * Format date for CSV export in Moscow time
 */
export const formatMoscowTimeForCSV = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  try {
    const utcDate = new Date(dateString);
    
    // Format as YYYY-MM-DD HH:MM:SS (Moscow time)
    return utcDate.toLocaleString('sv-SE', {
      timeZone: 'Europe/Moscow'
    }).replace('T', ' ');
  } catch (error) {
    console.error('Error formatting Moscow time for CSV:', error);
    return dateString || '';
  }
};