// Этот файл должен быть размещен на вашем сервере для обработки вебхуков
// Например, на Express.js сервере или в виде serverless функции

const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Настройка middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Обработчик вебхуков от MPSPAY
app.post('/mpspay-callback/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const callbackData = req.body;
    
    console.log(`Получен колбэк для транзакции ${transactionId}:`, callbackData);
    
    // Здесь должна быть логика обновления статуса транзакции в вашей базе данных
    // Например, вы можете использовать Firebase, MongoDB или другую БД
    
    // Пример структуры данных колбэка от MPSPAY:
    // {
    //   id: 12345,           // ID платежа в системе MPSPAY
    //   status: 3,           // Статус платежа (3 = успешно, 2 = отменен, 1 = в обработке)
    //   amount: 100,         // Сумма платежа
    //   currency: 112,       // Код валюты
    //   orderId: "20230101123456" // Ваш ID заказа/транзакции
    // }
    
    // Определяем статус транзакции
    let transactionStatus;
    if (callbackData.status === 3) {
      transactionStatus = 'completed';
    } else if (callbackData.status === 2) {
      transactionStatus = 'failed';
    } else {
      transactionStatus = 'pending';
    }
    
    // Здесь должен быть код для обновления статуса транзакции
    // Например:
    // await updateTransactionStatus(transactionId, transactionStatus);
    
    // Отправляем успешный ответ
    res.status(200).json({ success: true, message: 'Callback processed successfully' });
  } catch (error) {
    console.error('Ошибка обработки колбэка:', error);
    res.status(500).json({ success: false, message: 'Error processing callback' });
  }
});

// Тестовый эндпоинт для проверки работоспособности сервера
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Webhook server is running' });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});

// Экспорт для serverless функций (например, для Vercel или Netlify)
module.exports = app;