export interface Credentials {
  readOnlyAccessKey: string;
  currencyCode: string;
  currencyAccountNumber: string;
  clientId: string;
  currencyAccountGuid: string;
  merchantName?: string;
  clientSecret?: string;
  commentNumber?: number;
  apiKey?: string;
  secretKey?: string;
  accountNumber?: string;
  accountGuid?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | number;
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
  credentials?: Credentials;
  commission?: number;
  finishedAt?: string;
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

export type AccountBalance = Balance;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  value?: any;
  isSuccess?: boolean;
  isFailure?: boolean;
  failures?: any[];
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  step?: number;
  data?: any;
  rawResponse?: string;
  statusCode?: number;
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
  status?: number;
  tag?: string;
  rawResponse?: string;
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
  bankDetails?: string;
}

export interface WithdrawalResult {
  success: boolean;
  withdrawal?: Withdrawal;
  error?: string;
  rawResponse?: string;
}

export interface PaymentRequest {
  amount: number;
  customerInfo?: string;
  products?: {
    id: string;
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
  rawResponse?: string;
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