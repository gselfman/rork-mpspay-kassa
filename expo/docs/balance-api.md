# Current Balance API Request

## Account Balance Request

```
GET https://api.mpspay.ru/api/v1/account/balance/{currencyAccountNumber}
Headers:
  Content-Type: application/json
  accessKey: {readOnlyAccessKey}
  accountIdGuid: {currencyAccountGuid}
```

Example with real values:
```
GET https://api.mpspay.ru/api/v1/account/balance/14744
Headers:
  Content-Type: application/json
  accessKey: 9cda1144-63ef-496a-a4da-24e03bba2608
  accountIdGuid: 3a4e346b-1a30-404e-b12e-4ba3414c30f8
```

## Expected Response

```json
{
  "failures": [],
  "value": {
    "accountId": 14744,
    "accountName": "демо",
    "balance": 110308.32,
    "currency": 112,
    "lockedBalance": 0
  },
  "isSuccess": true,
  "isFailure": false
}
```

## Implementation in Code

In `utils/api.ts`, the function that fetches the account balance is:

```javascript
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
        currency: data.value.currency ? data.value.currency.toString() : 'RUB'
      };
    } else {
      // Fallback to old structure if value is not present
      return {
        available: data.balance || 0,
        pending: data.lockedBalance || 0,
        currency: data.currency ? data.currency.toString() : 'RUB'
      };
    }
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
};
```

## Customer Balance Request (Alternative)

```
GET https://api.mpspay.ru/api/v1/customer/balance/{clientId}
Headers:
  Content-Type: application/json
  accessKey: {readOnlyAccessKey}
```

Example with real values:
```
GET https://api.mpspay.ru/api/v1/customer/balance/10221
Headers:
  Content-Type: application/json
  accessKey: 9cda1144-63ef-496a-a4da-24e03bba2608
```

## Expected Customer Balance Response

```json
{
  "failures": [],
  "value": {
    "customerId": 10221,
    "currency": 112,
    "balance": 110308.32
  },
  "isSuccess": true,
  "isFailure": false
}
```

## How It's Used in the App

In the home screen (`app/(tabs)/index.tsx`), we fetch the account balance directly as it's the most reliable source of balance information. The balance is then displayed in the UI.

The implementation prioritizes showing the account balance as it's the most accurate for display purposes. The refresh button triggers a new API call to get the latest balance information.