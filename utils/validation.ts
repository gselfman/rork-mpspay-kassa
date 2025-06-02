import { Credentials } from '@/types/api';

// Define the ValidationErrors interface
export interface ValidationErrors {
  readOnlyAccessKey?: string;
  currencyCode?: string;
  currencyAccountNumber?: string;
  clientId?: string;
  currencyAccountGuid?: string;
  merchantName?: string;
  form?: string;
}

/**
 * Validates API credentials
 * @param credentials The credentials to validate
 * @param language The current language (en or ru)
 * @returns An object with validation errors
 */
export const validateCredentials = (
  credentials: Partial<Credentials>,
  language: string = 'en'
): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // Validate ReadOnlyKey (accessKey)
  if (!credentials.readOnlyAccessKey) {
    errors.readOnlyAccessKey = language === 'en' 
      ? 'Read Only Access Key is required' 
      : 'Ключ доступа Read Only обязателен';
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentials.readOnlyAccessKey)) {
    errors.readOnlyAccessKey = language === 'en' 
      ? 'Invalid GUID format' 
      : 'Неверный формат GUID';
  }
  
  // Validate Currency Code
  if (!credentials.currencyCode) {
    errors.currencyCode = language === 'en' 
      ? 'Currency Code is required' 
      : 'Код валюты обязателен';
  } else if (!/^\d+$/.test(credentials.currencyCode)) {
    errors.currencyCode = language === 'en' 
      ? 'Currency Code must be numeric' 
      : 'Код валюты должен быть числовым';
  }
  
  // Validate Currency Account Number
  if (!credentials.currencyAccountNumber) {
    errors.currencyAccountNumber = language === 'en' 
      ? 'Currency Account Number is required' 
      : 'Номер счета валюты обязателен';
  } else if (!/^\d{5,8}$/.test(credentials.currencyAccountNumber)) {
    errors.currencyAccountNumber = language === 'en' 
      ? 'Currency Account Number must be 5-8 digits' 
      : 'Номер счета валюты должен содержать 5-8 цифр';
  }
  
  // Validate Client ID
  if (!credentials.clientId) {
    errors.clientId = language === 'en' 
      ? 'Client ID is required' 
      : 'Клиентский номер обязателен';
  } else if (!/^\d{5,8}$/.test(credentials.clientId)) {
    errors.clientId = language === 'en' 
      ? 'Client ID must be 5-8 digits' 
      : 'Клиентский номер должен содержать 5-8 цифр';
  }
  
  // Validate Currency Account GUID
  if (!credentials.currencyAccountGuid) {
    errors.currencyAccountGuid = language === 'en' 
      ? 'Currency Account GUID is required' 
      : 'GUID счета валюты обязателен';
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(credentials.currencyAccountGuid)) {
    errors.currencyAccountGuid = language === 'en' 
      ? 'Invalid GUID format' 
      : 'Неверный формат GUID';
  }
  
  return errors;
};

/**
 * Validates withdrawal request
 * @param amount The withdrawal amount
 * @param walletAddress The wallet address
 * @param telegramContact The telegram contact
 * @param language The current language (en or ru)
 * @returns An object with validation errors
 */
export const validateWithdrawalRequest = (
  amount: number | null,
  walletAddress: string,
  telegramContact: string,
  language: string = 'en'
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Validate amount
  if (!amount || amount <= 0) {
    errors.amount = language === 'en' 
      ? 'Amount must be greater than 0' 
      : 'Сумма должна быть больше 0';
  }
  
  // Validate wallet address (TRON TRC-20 validation)
  if (!walletAddress) {
    errors.walletAddress = language === 'en' 
      ? 'Wallet address is required' 
      : 'Адрес кошелька обязателен';
  } else if (!/^T[a-zA-Z0-9]{33}$/.test(walletAddress)) {
    errors.walletAddress = language === 'en' 
      ? 'Invalid TRON wallet address. Must start with T and be 34 characters long' 
      : 'Неверный адрес кошелька TRON. Должен начинаться с T и содержать 34 символа';
  }
  
  // Validate Telegram contact
  if (!telegramContact) {
    errors.telegramContact = language === 'en' 
      ? 'Telegram contact is required' 
      : 'Контакт Telegram обязателен';
  } else if (!telegramContact.startsWith('@') || telegramContact.length < 5) {
    errors.telegramContact = language === 'en' 
      ? 'Telegram contact must start with @ and be at least 5 characters long' 
      : 'Контакт Telegram должен начинаться с @ и содержать минимум 5 символов';
  }
  
  return errors;
};

/**
 * Validates product data
 * @param name The product name
 * @param price The product price
 * @param language The current language (en or ru)
 * @returns An object with validation errors
 */
export const validateProduct = (
  name: string,
  price: number | string,
  language: string = 'en'
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // Validate name
  if (!name.trim()) {
    errors.name = language === 'en' 
      ? 'Product name is required' 
      : 'Название товара обязательно';
  } else if (name.length > 100) {
    errors.name = language === 'en' 
      ? 'Product name must be less than 100 characters' 
      : 'Название товара должно быть менее 100 символов';
  }
  
  // Validate price
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice) || numPrice <= 0) {
    errors.price = language === 'en' 
      ? 'Price must be greater than 0' 
      : 'Цена должна быть больше 0';
  }
  
  return errors;
};

/**
 * Validates TRON wallet address
 * @param address The wallet address to validate
 * @returns True if valid, false otherwise
 */
export const isValidTronWallet = (address: string): boolean => {
  return /^T[a-zA-Z0-9]{33}$/.test(address);
};

/**
 * Validates Telegram contact
 * @param contact The telegram contact to validate
 * @returns True if valid, false otherwise
 */
export const isValidTelegramContact = (contact: string): boolean => {
  return contact.startsWith('@') && contact.length >= 5;
};