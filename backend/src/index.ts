import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { AfriPayAdapter, PaymentService, WebhookService, IPaymentRepository } from './modules/payment';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CONFIG_FILE = path.join(__dirname, 'config.json');
const TRANSACTIONS_FILE = path.join(__dirname, '../transactions.json');

app.use(cors());
app.use(express.json());

// Helper to read config
const getConfig = () => {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return null;
};

// Hybrid transactions repository
const getTransactions = async () => {
  try {
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading transactions', e);
  }
  return [];
};

const upsertTransaction = async (txn: any) => {
  try {
    let transactions: any[] = [];
    if (fs.existsSync(TRANSACTIONS_FILE)) {
      transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    }
    const idx = transactions.findIndex(t => t.id === txn.id);
    if (idx >= 0) transactions[idx] = { ...transactions[idx], ...txn };
    else transactions.unshift(txn);
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving transaction', e);
    return false;
  }
};

const paymentRepository: IPaymentRepository = {
  saveTransaction: async (txn) => {
    return await upsertTransaction(txn);
  },
  getTransaction: async (transactionId) => {
    const transactions = await getTransactions();
    return transactions.find(t => t.id === transactionId) || null;
  },
  updateTransaction: async (transactionId, data) => {
    return await upsertTransaction({ id: transactionId, ...data });
  },
  isProcessed: async (transactionId) => {
    const transactions = await getTransactions();
    const txn = transactions.find(t => t.id === transactionId);
    return Boolean(txn && (txn.status === 'success' || txn.processed === true));
  }
};

const afripayAdapter = new AfriPayAdapter({
  appId: process.env.AFRIPAY_APP_ID,
  appSecret: process.env.AFRIPAY_APP_SECRET,
  checkoutUrl: process.env.AFRIPAY_CHECKOUT_URL,
  defaultFrontendUrl: process.env.FRONTEND_URL || 'https://kaspersky.kesug.com'
});

const paymentService = new PaymentService(afripayAdapter, paymentRepository);
const webhookService = new WebhookService(afripayAdapter, paymentRepository);

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Config API
app.get('/api/config', (req, res) => {
  const config = getConfig();
  if (config) {
    res.json(config);
  } else {
    res.status(404).json({ error: 'Config not found' });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    res.json({ success: true, message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Payment API
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const result = await paymentService.initiate(req.body);
    if (result.success) {
      return res.status(200).json(result);
    }
    return res.status(400).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/payment/webhook/afripay', async (req, res) => {
  try {
    const result = await webhookService.handleWebhook(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/payment/:clientToken/status', async (req, res) => {
  try {
    const result = await paymentService.getStatus(req.params.clientToken);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ status: 'PENDING', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
