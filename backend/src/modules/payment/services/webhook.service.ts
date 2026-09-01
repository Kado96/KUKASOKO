import { 
  IPaymentProvider, 
  IPaymentRepository, 
  WebhookProcessingResult 
} from '../types/payment.types';

export type EmailDeliveryFunction = (
  email: string, 
  transactionId: string, 
  status: string,
  extraData?: any
) => Promise<{ success: boolean; error?: string }>;

export class WebhookService {
  private provider: IPaymentProvider;
  private repository: IPaymentRepository;
  private sendEmailNotification?: EmailDeliveryFunction;

  constructor(
    provider: IPaymentProvider, 
    repository: IPaymentRepository,
    sendEmailNotification?: EmailDeliveryFunction
  ) {
    this.provider = provider;
    this.repository = repository;
    this.sendEmailNotification = sendEmailNotification;
  }

  /**
   * Processes incoming webhook with strict idempotency and business actions
   */
  async handleWebhook(rawPayload: any): Promise<WebhookProcessingResult> {
    try {
      const parsed = this.provider.parseWebhook(rawPayload);
      const clientToken = parsed.client_token;

      if (!clientToken) {
        return {
          success: false,
          transactionId: '',
          status: 'error',
          error: 'Identifiant de transaction (client_token) manquant dans le webhook',
        };
      }

      // Check existing transaction state for idempotence
      const existingTxn = await this.repository.getTransaction(clientToken);

      if (existingTxn && (existingTxn.status === 'success' || existingTxn.processed === true)) {
        console.log(`[WEBHOOK] Transaction ${clientToken} déjà traitée avec succès (Idempotence).`);
        return {
          success: true,
          alreadyProcessed: true,
          transactionId: clientToken,
          status: 'success',
          message: 'Transaction déjà traitée',
        };
      }

      const isSuccess = parsed.status === 'success';

      const updateData = {
        id: clientToken,
        status: isSuccess ? 'success' : 'failed',
        transaction_ref: parsed.transaction_ref || existingTxn?.transaction_ref || null,
        payment_method: parsed.payment_method || existingTxn?.payment_method || 'mobile_money',
        phone: parsed.phone || existingTxn?.phone || null,
        amount: parsed.amount || existingTxn?.amount,
        currency: parsed.currency || existingTxn?.currency || 'BIF',
        last_callback: new Date().toISOString(),
        processed: isSuccess,
        updated_at: new Date().toISOString(),
      };

      await this.repository.updateTransaction(clientToken, updateData);

      let emailSent = false;
      const targetEmail = existingTxn?.email || rawPayload.email;

      if (isSuccess && targetEmail && this.sendEmailNotification) {
        try {
          console.log(`[WEBHOOK] Envoi email de confirmation pour ${clientToken} à ${targetEmail}...`);
          const emailResult = await this.sendEmailNotification(
            targetEmail, 
            clientToken, 
            'success',
            { ...existingTxn, ...updateData }
          );
          emailSent = emailResult.success;
        } catch (mailErr: any) {
          console.error(`[WEBHOOK] Erreur lors de l'envoi de l'email (${clientToken}):`, mailErr.message);
        }
      }

      return {
        success: true,
        transactionId: clientToken,
        status: parsed.status,
        emailSent: emailSent,
        message: isSuccess ? 'Paiement validé avec succès' : 'Paiement marqué en échec',
      };
    } catch (error: any) {
      console.error('[WEBHOOK] Erreur générale traitement webhook:', error);
      return {
        success: false,
        transactionId: rawPayload?.client_token || '',
        status: 'error',
        error: error.message || 'Erreur interne traitement webhook',
      };
    }
  }
}
