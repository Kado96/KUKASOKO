import { 
  IPaymentProvider, 
  IPaymentRepository, 
  PaymentInitRequest, 
  PaymentInitResponse,
  TransactionVerificationResult
} from '../types/payment.types';

export class PaymentService {
  private provider: IPaymentProvider;
  private repository: IPaymentRepository;

  constructor(provider: IPaymentProvider, repository: IPaymentRepository) {
    this.provider = provider;
    this.repository = repository;
  }

  /**
   * Generates a unique transaction identifier
   */
  public generateTransactionId(prefix: string = 'txn'): string {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Initializes a payment flow (Kaspersky single product, Kukasoko marketplace, or subscriptions)
   */
  async initiate(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    if (!request.email || !request.email.includes('@')) {
      return {
        success: false,
        transactionId: '',
        error: 'Adresse email valide obligatoire',
      };
    }

    if (!request.amount) {
      return {
        success: false,
        transactionId: '',
        error: 'Montant de transaction obligatoire',
      };
    }

    const transactionId = this.generateTransactionId();
    const mode = request.mode || 'single_product';

    // Build the transaction record for audit and tracking
    const transactionRecord = {
      id: transactionId,
      email: request.email,
      amount: String(request.amount),
      currency: request.currency || 'BIF',
      phone: request.phone || null,
      customer_name: request.customerName || null,
      comment: request.comment || null,
      mode: mode,
      items: request.items || [],
      metadata: request.metadata || {},
      status: 'attempted',
      provider: this.provider.name,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save transaction state immediately to prevent lead loss
    await this.repository.saveTransaction(transactionRecord);

    // Call provider adapter to prepare checkout data
    const providerResponse = await this.provider.initiatePayment(request, transactionId);

    if (!providerResponse.success) {
      await this.repository.updateTransaction(transactionId, {
        status: 'failed',
        error: providerResponse.error,
        updated_at: new Date().toISOString(),
      });
    }

    return providerResponse;
  }

  /**
   * Checks current status of a transaction
   */
  async getStatus(clientToken: string): Promise<TransactionVerificationResult> {
    const txn = await this.repository.getTransaction(clientToken);

    if (!txn) {
      return {
        transactionId: clientToken,
        status: 'PENDING',
        metadata: { message: 'Transaction not found yet' },
      };
    }

    const statusMap: Record<string, 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED'> = {
      success: 'SUCCESS',
      completed: 'SUCCESS',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
      pending: 'PENDING',
      attempted: 'PENDING',
    };

    const normalizedStatus = statusMap[txn.status?.toLowerCase()] || 'PENDING';

    return {
      transactionId: clientToken,
      status: normalizedStatus,
      amount: txn.amount,
      currency: txn.currency,
      paymentMethod: txn.payment_method,
      payerPhone: txn.phone,
      transactionRef: txn.transaction_ref,
      metadata: txn,
    };
  }
}
