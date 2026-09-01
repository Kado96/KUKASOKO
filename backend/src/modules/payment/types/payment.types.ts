export type PaymentMode = 'single_product' | 'marketplace' | 'subscription';

export interface PaymentItem {
  id?: string;
  name: string;
  price: number | string;
  quantity?: number;
  vendorId?: string; // Support for Kukasoko marketplace vendor separation
}

export interface PaymentInitRequest {
  email: string;
  amount: number | string;
  currency?: string;
  customerName?: string;
  phone?: string;
  comment?: string;
  mode?: PaymentMode;
  items?: PaymentItem[];
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
  backUrl?: string;
}

export interface PaymentInitResponse {
  success: boolean;
  transactionId: string;
  redirectUrl?: string;
  checkoutFormData?: Record<string, string>;
  message?: string;
  error?: string;
}

export interface WebhookPayload {
  client_token: string;
  transaction_ref?: string;
  status: string;
  amount?: string | number;
  currency?: string;
  payment_method?: string;
  phone?: string;
  payer_phone?: string;
  phone_number?: string;
  rawPayload?: any;
}

export interface TransactionVerificationResult {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  amount?: number | string;
  currency?: string;
  paymentMethod?: string;
  payerPhone?: string;
  transactionRef?: string;
  metadata?: Record<string, any>;
  rawResponse?: any;
}

export interface IPaymentProvider {
  readonly name: string;
  initiatePayment(request: PaymentInitRequest, clientToken: string): Promise<PaymentInitResponse>;
  verifyTransaction(clientToken: string, transactionRef?: string): Promise<TransactionVerificationResult>;
  parseWebhook(payload: any): WebhookPayload;
}

export interface IPaymentRepository {
  saveTransaction(transaction: any): Promise<boolean>;
  getTransaction(transactionId: string): Promise<any | null>;
  updateTransaction(transactionId: string, data: Partial<any>): Promise<boolean>;
  isProcessed(transactionId: string): Promise<boolean>;
}

export interface WebhookProcessingResult {
  success: boolean;
  alreadyProcessed?: boolean;
  transactionId: string;
  status: string;
  emailSent?: boolean;
  message?: string;
  error?: string;
}
