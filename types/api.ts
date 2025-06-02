export interface Credentials {
  readOnlyAccessKey: string;
  currencyCode: string;
  currencyAccountNumber: string;
  clientId: string;
  currencyAccountGuid: string;
  merchantName?: string;
  clientSecret?: string; // Made optional for compatibility
}

export interface Transaction {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  customerInfo?: string;
  merchantName?: string;
  tag?: string;
  mpspayId?: string;
  paymentUrl?: string;
  products?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  credentials?: Credentials; // Added for API calls that need credentials
  commission?: number; // Added for commission information
  finishedAt?: string; // Added for completion time
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  sku?: string;
  imageUrl?: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  destinationAccount: string;
  destinationBank?: string;
  fee?: number;
  failureReason?: string;
}

export interface Balance {
  available: number;
  pending: number;
  currency: string;
  lastUpdated?: string;
  accountName?: string;
}

// Alias for Balance to maintain compatibility
export type AccountBalance = Balance;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string; // Added for MPSPAY API responses
  value?: any; // Added for MPSPAY API responses with nested value
  isSuccess?: boolean; // Added for MPSPAY API responses
  isFailure?: boolean; // Added for MPSPAY API responses
  failures?: any[]; // Added for MPSPAY API responses
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  step?: number;
  data?: any; // Added to store API response data
  rawResponse?: string; // Added to store the raw API response for debugging
  statusCode?: number; // Added to store the HTTP status code
}

export interface ShareReceiptOptions {
  method: 'email' | 'telegram' | 'whatsapp' | 'pdf';
  email?: string;
  phone?: string;
}

export interface CheckTransactionResult {
  found: boolean;
  transaction?: Transaction;
  error?: string;
  status?: number; // Added for MPSPAY API responses
  tag?: string; // Added for MPSPAY API responses
  rawResponse?: string; // Added to store the raw API response for debugging
}

export interface WithdrawalRequest {
  id?: string;
  amount: number;
  destinationAccount?: string;
  destinationBank?: string;
  walletAddress?: string;
  telegramContact?: string;
  createdAt?: string;
  status?: 'pending' | 'completed' | 'rejected';
}

export interface WithdrawalResult {
  success: boolean;
  withdrawal?: Withdrawal;
  error?: string;
  rawResponse?: string; // Added to store the raw API response for debugging
}

export interface PaymentRequest {
  amount: number;
  customerInfo?: string;
  products?: {
    id: string; // Made required to fix type issues
    name: string;
    price: number;
    quantity: number;
  }[];
  tag?: string;
}

export interface PaymentResult {
  success: boolean;
  transaction?: Transaction;
  error?: string;
  rawResponse?: string; // Added to store the raw API response for debugging
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  totalCommission: number;
  currency: number;
  paymentDirection: number;
  paymentType: number;
  paymentStatus: number;
  comment: string;
  accountToName: string;
  amountFrom: number;
  amountTo: number;
  rubRate: number;
  currencyFrom: number;
  currencyTo: number;
  totalCommissionFrom: number;
  totalCommissionTo: number;
  createdAt?: string;
  finishedAt?: string;
  tag?: string;
}

export interface PaymentHistoryResponse {
  count: number;
  items: PaymentHistoryItem[];
  isSuccess: boolean;
}

export interface PaymentStats {
  successfulOperationsMonth: number;
  successfulOperationsToday: number;
  incomeMonth: number;
  incomeToday: number;
}

export interface TransactionCheckResult {
  id: string;
  amount: number;
  totalCommission: number;
  currency: number;
  finishedAt?: string;
  paymentDirection: number;
  paymentType: number;
  paymentStatus: number;
  comment: string;
  accountToName: string;
  amountFrom: number;
  amountTo: number;
  rubRate: number;
  currencyFrom: number;
  currencyTo: number;
  totalCommissionFrom: number;
  totalCommissionTo: number;
  tag?: string;
}

export interface EmailReceiptRequest {
  email: string;
  transaction: Transaction;
  customerName: string;
  merchantName: string;
  products?: Array<{id: string, name: string, price: number, quantity: number}>;
}

/**
 * SMTP Configuration for email sending
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}