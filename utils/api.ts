import { 
  Credentials, 
  Transaction, 
  Balance, 
  Withdrawal, 
  ValidationResult,
  WithdrawalRequest,
  WithdrawalResult,
  PaymentRequest,
  PaymentResult,
  CheckTransactionResult,
  Product,
  AccountBalance,
  ApiResponse,
  PaymentHistoryResponse,
  PaymentHistoryItem,
  EmailReceiptRequest,
  SmtpConfig
} from '@/types/api';

// API base URL
const API_BASE_URL = 'https://api.mpspay.ru/api/v1';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '5284822565:AAE-jVTd_UmhGiirMsVus4KetUev4S9qBlE';
const TELEGRAM_CHAT_ID = '-4919934384'; // Fixed chat_id format without -100 prefix

// SMTP Backend URL - Update this to your deployed backend URL
const SMTP_BACKEND_URL = 'http://localhost:3001';

// Default SMTP configuration
const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: 'mail.mpspay.ru',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'app@mpspay.ru',
    pass: '9icdo4pUVC'
  },
  from: 'app@mpspay.ru'
};

/**
 * Validate API credentials - Step 1: Test payment preparation
 * Checks if ReadOnlyKey and AccountGUID are valid
 */
export const validateCredentialsStep1 = async (
  readOnlyAccessKey: string, 
  currencyAccountGuid: string,
  currencyCode: string
): Promise<ValidationResult> => {
  try {
    console.log('Validating step 1:', { readOnlyAccessKey, currencyAccountGuid, currencyCode });
    
    const response = await fetch(`${API_BASE_URL}/payments/external/incoming/card/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': readOnlyAccessKey,
        'accountIdGuid': currencyAccountGuid
      },
      body: JSON.stringify({
        currency: parseInt(currencyCode, 10),
        amount: 100,
        description: "test",
        orderId: 0,
        callbackUrl: "https://flowxo.com/hooks/a/ykz48eyb",
        returnUrl: "https://mpspay.ru"
      }),
    });
    
    // Get the full response text for error reporting
    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, use the raw text
      responseData = responseText;
    }
    
    if (response.status === 200) {
      console.log('Step 1 validation successful:', responseData);
      return {
        success: true,
        step: 1,
        rawResponse: responseText
      };
    } else {
      let errorMessage = 'API Error: ' + response.status;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorMessage = responseData.message || responseData.title || JSON.stringify(responseData);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData || errorMessage;
      }
      
      console.error('Step 1 validation failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        step: 0,
        rawResponse: responseText,
        statusCode: response.status
      };
    }
  } catch (error) {
    console.error('Error validating credentials step 1:', error);
    return {
      success: false,
      error: `Failed to validate credentials: ${error instanceof Error ? error.message : String(error)}`,
      step: 0,
      rawResponse: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};

/**
 * Validate credentials step 2: Check account balance
 * Validates if the accountId (currencyAccountNumber) is valid
 */
export const validateCredentialsStep2 = async (
  readOnlyAccessKey: string, 
  currencyAccountGuid: string,
  currencyAccountNumber: string
): Promise<ValidationResult> => {
  try {
    console.log('Validating step 2:', { readOnlyAccessKey, currencyAccountGuid, currencyAccountNumber });
    
    const response = await fetch(`${API_BASE_URL}/account/balance/${currencyAccountNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': readOnlyAccessKey,
        'accountIdGuid': currencyAccountGuid
      }
    });
    
    // Get the full response text for error reporting
    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, use the raw text
      responseData = responseText;
    }
    
    if (response.status === 200) {
      console.log('Step 2 validation successful:', responseData);
      return {
        success: true,
        step: 2,
        data: responseData,
        rawResponse: responseText
      };
    } else {
      let errorMessage = 'API Error: ' + response.status;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorMessage = responseData.message || responseData.title || JSON.stringify(responseData);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData || errorMessage;
      }
      
      console.error('Step 2 validation failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        step: 1,
        rawResponse: responseText,
        statusCode: response.status
      };
    }
  } catch (error) {
    console.error('Error validating credentials step 2:', error);
    return {
      success: false,
      error: `Failed to validate account number: ${error instanceof Error ? error.message : String(error)}`,
      step: 1,
      rawResponse: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};

/**
 * Validate credentials step 3: Check customer balance
 * Validates if the CustomerID (clientId) is valid
 */
export const validateCredentialsStep3 = async (
  readOnlyAccessKey: string, 
  clientId: string
): Promise<ValidationResult> => {
  try {
    console.log('Validating step 3:', { readOnlyAccessKey, clientId });
    
    const response = await fetch(`${API_BASE_URL}/customer/balance/${clientId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': readOnlyAccessKey
      }
    });
    
    // Get the full response text for error reporting
    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, use the raw text
      responseData = responseText;
    }
    
    if (response.status === 200) {
      console.log('Step 3 validation successful:', responseData);
      return {
        success: true,
        step: 3,
        data: responseData,
        rawResponse: responseText
      };
    } else {
      let errorMessage = 'API Error: ' + response.status;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorMessage = responseData.message || responseData.title || JSON.stringify(responseData);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData || errorMessage;
      }
      
      console.error('Step 3 validation failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
        step: 2,
        rawResponse: responseText,
        statusCode: response.status
      };
    }
  } catch (error) {
    console.error('Error validating credentials step 3:', error);
    return {
      success: false,
      error: `Failed to validate client ID: ${error instanceof Error ? error.message : String(error)}`,
      step: 2,
      rawResponse: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};

/**
 * Get transactions from the API
 */
export const getTransactions = async (credentials: Credentials): Promise<Transaction[]> => {
  try {
    console.log('Fetching transactions with credentials:', credentials);
    
    const response = await fetch(`${API_BASE_URL}/report/payments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Transactions API response:', data);
    
    // Transform API response to match our Transaction type
    // This will depend on the actual API response format
    const transactions: Transaction[] = Array.isArray(data) ? data.map((item: any) => ({
      id: item.id?.toString() || '',
      amount: item.amount || 0,
      status: mapApiStatusToAppStatus(item.status),
      createdAt: item.createdAt || new Date().toISOString(),
      customerInfo: item.description || '',
      merchantName: credentials.merchantName || '',
      tag: item.orderId?.toString() || '',
      mpspayId: item.id?.toString() || '',
      paymentUrl: item.paymentUrl || ''
    })) : [];
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Get payment history with date range
 */
export const getPaymentHistory = async (
  credentials: Credentials,
  dateFrom: string,
  dateTo: string
): Promise<PaymentHistoryResponse> => {
  try {
    console.log('Fetching payment history with date range:', { dateFrom, dateTo });
    
    const url = `${API_BASE_URL}/report/payments?AccountId=${credentials.currencyAccountNumber}&DateFrom=${dateFrom}&DateTo=${dateTo}&Currency=${credentials.currencyCode}`;
    
    console.log('Request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey,
        'customerId': credentials.clientId
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Payment history API response:', data);
    
    // Extract the items from the nested structure
    if (data.value && Array.isArray(data.value.items)) {
      return {
        count: data.value.count || 0,
        items: data.value.items.map((item: any) => ({
          id: item.id?.toString() || '',
          amount: item.amount || 0,
          totalCommission: item.totalCommission || 0,
          currency: item.currency || 0,
          paymentDirection: item.paymentDirection || 0,
          paymentType: item.paymentType || 0,
          paymentStatus: item.paymentStatus || 0,
          comment: item.comment || '',
          accountToName: item.accountToName || '',
          amountFrom: item.amountFrom || 0,
          amountTo: item.amountTo || 0,
          rubRate: item.rubRate || 0,
          currencyFrom: item.currencyFrom || 0,
          currencyTo: item.currencyTo || 0,
          totalCommissionFrom: item.totalCommissionFrom || 0,
          totalCommissionTo: item.totalCommissionTo || 0,
          createdAt: item.createdAt || '',
          finishedAt: item.finishedAt || '',
          tag: item.tag || ''
        })),
        isSuccess: data.isSuccess || false
      };
    }
    
    // Fallback if the structure is different
    return {
      count: 0,
      items: [],
      isSuccess: false
    };
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

/**
 * Map API status to app status
 */
const mapApiStatusToAppStatus = (apiStatus: any): 'pending' | 'completed' | 'failed' => {
  // This mapping will depend on the actual API status values
  if (apiStatus === 'success' || apiStatus === 3) {
    return 'completed';
  } else if (apiStatus === 'failed' || apiStatus === 2) {
    return 'failed';
  } else {
    return 'pending';
  }
};

/**
 * Get account balance
 */
export const getAccountBalance = async (credentials: Credentials): Promise<AccountBalance> => {
  try {
    console.log('Fetching account balance with credentials:', credentials);
    
    const response = await fetch(`${API_BASE_URL}/account/balance/${credentials.currencyAccountNumber}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey,
        'accountIdGuid': credentials.currencyAccountGuid
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Account balance response:', data);
    
    // Extract balance from the nested value object in the response
    if (data.value && typeof data.value.balance === 'number') {
      return {
        available: data.value.balance,
        pending: data.value.lockedBalance || 0,
        currency: data.value.currency ? data.value.currency.toString() : 'RUB',
        accountName: data.value.accountName || ''
      };
    } else {
      // Fallback to old structure if value is not present
      return {
        available: data.balance || 0,
        pending: data.lockedBalance || 0,
        currency: data.currency ? data.currency.toString() : 'RUB',
        accountName: data.accountName || ''
      };
    }
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
};

/**
 * Get customer balance directly
 */
export const getCustomerBalance = async (credentials: Credentials): Promise<AccountBalance> => {
  try {
    console.log('Fetching customer balance with credentials:', credentials);
    
    const response = await fetch(`${API_BASE_URL}/customer/balance/${credentials.clientId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Customer balance response:', data);
    
    // Check if the response has a nested value structure
    if (data.value && typeof data.value.balance === 'number') {
      return {
        available: data.value.balance,
        pending: 0, // Customer balance API doesn't provide pending balance
        currency: data.value.currency ? data.value.currency.toString() : 'RUB',
        accountName: ''
      };
    } else {
      // Fallback to old structure if value is not present
      return {
        available: data.balance || 0,
        pending: 0, // Customer balance API doesn't provide pending balance
        currency: data.currency ? data.currency.toString() : 'RUB',
        accountName: ''
      };
    }
  } catch (error) {
    console.error('Error fetching customer balance:', error);
    throw error;
  }
};

/**
 * Get withdrawals
 * Note: This endpoint may not be available in the API
 */
export const getWithdrawals = async (credentials: Credentials): Promise<Withdrawal[]> => {
  try {
    console.log('Fetching withdrawals with credentials:', credentials);
    
    // This endpoint may not exist in the API
    // Replace with the correct endpoint when available
    const response = await fetch(`${API_BASE_URL}/withdrawals`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey,
        'accountIdGuid': credentials.currencyAccountGuid
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Withdrawals API response:', data);
    
    // Transform API response to match our Withdrawal type
    // This will depend on the actual API response format
    const withdrawals: Withdrawal[] = Array.isArray(data) ? data.map((item: any) => ({
      id: item.id?.toString() || '',
      amount: item.amount || 0,
      status: mapApiStatusToAppStatus(item.status),
      createdAt: item.createdAt || new Date().toISOString(),
      destinationAccount: item.destinationAccount || '',
      destinationBank: item.destinationBank || ''
    })) : [];
    
    return withdrawals;
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    // Return empty array if API endpoint doesn't exist
    return [];
  }
};

/**
 * Create withdrawal request
 * Note: This endpoint may not be available in the API
 */
export const createWithdrawal = async (
  withdrawalRequest: WithdrawalRequest,
  credentials: Credentials
): Promise<WithdrawalResult> => {
  try {
    console.log('Creating withdrawal with request:', withdrawalRequest);
    
    // This endpoint may not exist in the API
    // Replace with the correct endpoint when available
    const response = await fetch(`${API_BASE_URL}/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey,
        'accountIdGuid': credentials.currencyAccountGuid
      },
      body: JSON.stringify(withdrawalRequest),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        return {
          success: false,
          error: `API Error: ${response.status} - ${errorText}`
        };
      }
      return {
        success: false,
        error: errorData.message || `API Error: ${response.status}`
      };
    }
    
    const data = await response.json();
    console.log('Withdrawal creation response:', data);
    
    // Transform API response to match our Withdrawal type
    const withdrawal: Withdrawal = {
      id: data.id?.toString() || '',
      amount: data.amount || 0,
      status: 'pending',
      createdAt: data.createdAt || new Date().toISOString(),
      destinationAccount: withdrawalRequest.walletAddress || '',
      destinationBank: 'TRON Network'
    };
    
    return {
      success: true,
      withdrawal: withdrawal
    };
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return {
      success: false,
      error: `Failed to create withdrawal: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Create transaction (payment)
 */
export const createTransaction = async (
  credentials: Credentials,
  amount: number,
  products: Array<{id: string, name: string, price: number, quantity: number}> = [],
  customComment?: string
): Promise<PaymentResult> => {
  try {
    console.log('Creating payment with credentials:', credentials);
    console.log('Payment amount:', amount);
    console.log('Products:', products);
    console.log('Custom comment:', customComment);
    
    // Ensure amount is an integer
    const integerAmount = Math.floor(amount);
    
    // Create description based on products or custom comment
    const description = customComment || (products.length > 0 
      ? products.map(p => `${p.name} x${p.quantity}`).join(', ') 
      : "New payment");
    
    const response = await fetch(`${API_BASE_URL}/payments/external/incoming/card/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey,
        'accountIdGuid': credentials.currencyAccountGuid
      },
      body: JSON.stringify({
        currency: parseInt(credentials.currencyCode, 10),
        amount: integerAmount,
        description: description,
        orderId: Date.now(),
        callbackUrl: "https://flowxo.com/hooks/a/ykz48eyb",
        returnUrl: "https://mpspay.ru"
      }),
    });
    
    // Get the full response text for error reporting
    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, use the raw text
      responseData = responseText;
    }
    
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorMessage = responseData.message || responseData.title || JSON.stringify(responseData);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData || errorMessage;
      }
      
      console.error('Error creating payment:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        rawResponse: responseText
      };
    }
    
    console.log('Payment creation response:', responseData);
    
    // Create transaction record from API response, handling nested structure
    const transaction: Transaction = {
      id: responseData.value?.id?.toString() || `T${Date.now()}`,
      amount: integerAmount,
      status: 'pending',
      createdAt: responseData.value?.createdAt || new Date().toISOString(),
      customerInfo: description,
      merchantName: credentials.merchantName || '',
      tag: responseData.value?.orderId?.toString() || `Order-${Date.now()}`,
      mpspayId: responseData.value?.id?.toString() || '',
      paymentUrl: responseData.value?.paymentUrl || '',
      products: products
    };
    
    console.log('Created transaction:', transaction);
    
    return {
      success: true,
      transaction: transaction,
      rawResponse: responseText
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    return {
      success: false,
      error: `Failed to create payment: ${error instanceof Error ? error.message : String(error)}`,
      rawResponse: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};

/**
 * Send withdrawal request via Telegram Bot API
 */
export const sendWithdrawalRequestTelegram = async (
  credentials: Credentials,
  amount: number,
  walletAddress: string,
  telegramContact: string,
  availableBalance: number
): Promise<boolean> => {
  try {
    console.log('Sending withdrawal request via Telegram:', {
      amount,
      walletAddress,
      telegramContact,
      availableBalance
    });
    
    // Format numbers with thousands separator
    const formatNumber = (num: number): string => {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    
    // Create message in MarkdownV2 format
    const message = `💳 *Сумма:* \`${formatNumber(amount)} RUB\`
💼 *Кошелёк TRON:* \`${walletAddress}\`
💰 *Баланс:* \`${formatNumber(availableBalance)} RUB\`
🧾 *User ID:* \`${credentials.clientId}\`
📞 *Контакт:* ${telegramContact}`;
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', errorText);
      throw new Error(`Telegram API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Telegram message sent successfully:', data);
    
    return true;
  } catch (error) {
    console.error('Error sending withdrawal request via Telegram:', error);
    return false;
  }
};

/**
 * Send email via SMTP backend
 */
export const sendEmailViaSmtp = async (
  to: string,
  subject: string,
  body: string,
  html?: string
): Promise<boolean> => {
  try {
    console.log('Sending email via SMTP backend:', { to, subject });
    
    const response = await fetch(`${SMTP_BACKEND_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        text: body,
        html: html || `<p>${body.replace(/\n/g, '<br>')}</p>`
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('SMTP backend error:', errorText);
      throw new Error(`SMTP Backend Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Email sent successfully:', data);
    
    return data.success || false;
  } catch (error) {
    console.error('Error sending email via SMTP backend:', error);
    return false;
  }
};

/**
 * Send receipt email using SMTP
 */
export const sendReceiptEmail = async (
  request: EmailReceiptRequest,
  smtpConfig: SmtpConfig = DEFAULT_SMTP_CONFIG
): Promise<boolean> => {
  try {
    console.log('Sending receipt email:', request);
    
    // Generate email subject and body
    const subject = `Payment Receipt from ${request.merchantName}`;
    
    // Generate email body
    const body = generateEmailBody(request);
    const html = generateEmailHTML(request);
    
    // Validate email format
    if (!validateEmail(request.email)) {
      console.error('Invalid email format:', request.email);
      return false;
    }
    
    // Send email via SMTP backend
    return await sendEmailViaSmtp(request.email, subject, body, html);
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return false;
  }
};

/**
 * Generate email body for receipt
 */
const generateEmailBody = (request: EmailReceiptRequest): string => {
  const { transaction, customerName, merchantName, products } = request;
  const date = new Date(transaction.createdAt).toLocaleString();
  
  let body = `Dear ${customerName},

Thank you for your payment to ${merchantName}.

Payment Details:
- Payment ID: ${transaction.id}
- Amount: ${transaction.amount} RUB
- Date: ${date}
- Status: ${transaction.status.toUpperCase()}`;

  if (transaction.paymentUrl) {
    body += `
- Payment Link: ${transaction.paymentUrl}`;
  }

  if (products && products.length > 0) {
    body += `

Products:
${products.map(p => `- ${p.name} x${p.quantity}: ${p.price * p.quantity} RUB`).join('\n')}

Total: ${products.reduce((sum, p) => sum + (p.price * p.quantity), 0)} RUB`;
  }

  body += `

If you have any questions about this payment, please contact ${merchantName}.

Best regards,
${merchantName} Team`;

  return body;
};

/**
 * Generate HTML email body for receipt
 */
const generateEmailHTML = (request: EmailReceiptRequest): string => {
  const { transaction, customerName, merchantName, products } = request;
  const date = new Date(transaction.createdAt).toLocaleString();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007AFF; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .products { margin: 15px 0; }
        .product-item { padding: 10px; border-bottom: 1px solid #eee; }
        .total { font-weight: bold; font-size: 1.2em; color: #007AFF; }
        .footer { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Receipt</h1>
            <p>Thank you for your payment!</p>
        </div>
        
        <div class="content">
            <p>Dear <strong>${customerName}</strong>,</p>
            <p>Thank you for your payment to <strong>${merchantName}</strong>.</p>
            
            <div class="details">
                <h3>Payment Details</h3>
                <p><strong>Payment ID:</strong> ${transaction.id}</p>
                <p><strong>Amount:</strong> ${transaction.amount} RUB</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Status:</strong> <span style="color: #28a745;">${transaction.status.toUpperCase()}</span></p>`;

  if (transaction.paymentUrl) {
    html += `<p><strong>Payment Link:</strong> <a href="${transaction.paymentUrl}">${transaction.paymentUrl}</a></p>`;
  }

  html += `</div>`;

  if (products && products.length > 0) {
    html += `
            <div class="products">
                <h3>Products</h3>`;
    
    products.forEach(p => {
      html += `<div class="product-item">
                    <strong>${p.name}</strong> x${p.quantity}: ${p.price * p.quantity} RUB
                </div>`;
    });
    
    html += `<div class="total">
                    Total: ${products.reduce((sum, p) => sum + (p.price * p.quantity), 0)} RUB
                </div>
            </div>`;
  }

  html += `
            <p>If you have any questions about this payment, please contact ${merchantName}.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br><strong>${merchantName} Team</strong></p>
        </div>
    </div>
</body>
</html>`;

  return html;
};

/**
 * Validate email format
 */
const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Send completed payment receipt
 * This would be called when a payment status changes to completed
 */
export const sendCompletedPaymentReceipt = async (
  transaction: Transaction,
  email: string,
  customerName: string,
  smtpConfig: SmtpConfig = DEFAULT_SMTP_CONFIG
): Promise<boolean> => {
  try {
    console.log('Sending completed payment receipt:', {
      transaction,
      email,
      customerName
    });
    
    // Create email request
    const request: EmailReceiptRequest = {
      email,
      transaction,
      customerName,
      merchantName: transaction.merchantName || 'Store',
      products: transaction.products
    };
    
    // Send email using SMTP
    return await sendReceiptEmail(request, smtpConfig);
  } catch (error) {
    console.error('Error sending completed payment receipt:', error);
    return false;
  }
};

/**
 * Share receipt
 * Note: This endpoint may not be available in the API
 */
export const shareReceipt = async (
  transaction: Transaction,
  method: 'email' | 'telegram' | 'whatsapp' | 'pdf',
  language: string = 'en'
): Promise<boolean> => {
  try {
    console.log('Sharing receipt for transaction:', transaction.id);
    console.log('Share method:', method);
    
    // This endpoint may not exist in the API
    // Replace with the correct endpoint when available
    const response = await fetch(`${API_BASE_URL}/receipts/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': transaction.credentials?.readOnlyAccessKey || '',
        'accountIdGuid': transaction.credentials?.currencyAccountGuid || ''
      },
      body: JSON.stringify({
        transactionId: transaction.id,
        method,
        language
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sharing receipt:', error);
    return false;
  }
};

/**
 * Check transaction status
 */
export const checkTransactionStatus = async (
  credentials: Credentials,
  transactionId: string
): Promise<CheckTransactionResult> => {
  try {
    console.log('Checking transaction status for:', transactionId);
    
    const response = await fetch(`${API_BASE_URL}/report/payment/${transactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey
      },
    });
    
    // Get the full response text for error reporting
    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, use the raw text
      responseData = responseText;
    }
    
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorMessage = responseData.message || responseData.title || JSON.stringify(responseData);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData || errorMessage;
      }
      
      return {
        found: false,
        error: errorMessage,
        rawResponse: responseText
      };
    }
    
    console.log('Transaction status check result:', responseData);
    
    // Check if the response has a nested value structure
    if (responseData.value) {
      const value = responseData.value;
      
      // Transform API response to match our Transaction type
      const transaction: Transaction = {
        id: value.id?.toString() || transactionId,
        amount: value.amount || 0,
        status: mapPaymentStatusToAppStatus(value.paymentStatus),
        createdAt: value.createdAt || new Date().toISOString(),
        customerInfo: value.comment || '',
        merchantName: value.accountToName || '',
        tag: value.tag || '',
        mpspayId: value.id?.toString() || '',
        commission: value.totalCommission || 0,
        finishedAt: value.finishedAt || ''
      };
      
      return {
        found: true,
        transaction: transaction,
        rawResponse: responseText
      };
    } else {
      // Fallback to old structure if value is not present
      const transaction: Transaction = {
        id: responseData.id?.toString() || transactionId,
        amount: responseData.amount || 0,
        status: mapApiStatusToAppStatus(responseData.status),
        createdAt: responseData.createdAt || new Date().toISOString(),
        customerInfo: responseData.description || '',
        merchantName: credentials.merchantName || '',
        tag: responseData.orderId?.toString() || '',
        mpspayId: responseData.id?.toString() || ''
      };
      
      return {
        found: true,
        transaction: transaction,
        rawResponse: responseText
      };
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return {
      found: false,
      error: `Failed to check transaction status: ${error instanceof Error ? error.message : String(error)}`,
      rawResponse: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};

/**
 * Map payment status from API to app status
 */
export const mapPaymentStatusToAppStatus = (paymentStatus: number): 'pending' | 'completed' | 'failed' => {
  switch (paymentStatus) {
    case 3: // Completed/Success
      return 'completed';
    case 2: // Failed/Not paid
      return 'failed';
    case 1: // Pending/Processing
    default:
      return 'pending';
  }
};

/**
 * Get products
 * Note: This endpoint may not be available in the API
 */
export const getProducts = async (credentials: Credentials): Promise<Product[]> => {
  try {
    console.log('Fetching products with credentials:', credentials);
    
    // This endpoint may not exist in the API
    // Replace with the correct endpoint when available
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey,
        'accountIdGuid': credentials.currencyAccountGuid
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Products API response:', data);
    
    // Transform API response to match our Product type
    // This will depend on the actual API response format
    const products: Product[] = Array.isArray(data) ? data.map((item: any) => ({
      id: item.id?.toString() || '',
      name: item.name || '',
      price: item.price || 0,
      description: item.description || ''
    })) : [];
    
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return empty array if API endpoint doesn't exist
    return [];
  }
};

/**
 * Check payment status
 */
export const checkPaymentStatus = async (
  credentials: Credentials,
  mpspayId: string
): Promise<{ status: number, tag?: string, rawResponse?: string }> => {
  try {
    console.log('Checking payment status for:', mpspayId);
    
    const response = await fetch(`${API_BASE_URL}/report/payment/${mpspayId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'accessKey': credentials.readOnlyAccessKey
      },
    });
    
    // Get the full response text for error reporting
    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not JSON, use the raw text
      responseData = responseText;
    }
    
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      
      if (typeof responseData === 'object' && responseData !== null) {
        errorMessage = responseData.message || responseData.title || JSON.stringify(responseData);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
    
    console.log('Payment status check result:', responseData);
    
    // Map API status to our status codes
    // Status codes: 1 = Processing, 2 = Failed, 3 = Completed
    let status = 1; // Default to processing
    
    if (responseData.value && responseData.value.paymentStatus) {
      status = responseData.value.paymentStatus;
    } else if (responseData.status === 'success' || responseData.status === 3) {
      status = 3; // Completed
    } else if (responseData.status === 'failed' || responseData.status === 2) {
      status = 2; // Failed
    }
    
    return {
      status: status,
      tag: responseData.value?.tag || responseData.orderId?.toString() || responseData.tag,
      rawResponse: responseText
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
};