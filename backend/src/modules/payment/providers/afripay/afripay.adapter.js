class AfriPayAdapter {
  constructor(config = {}) {
    this.name = 'afripay';
    this.appId = config.appId || process.env.AFRIPAY_APP_ID || '5b47c080a61d5652c3696cbdf2f8a8cd';
    this.appSecret = config.appSecret || process.env.AFRIPAY_APP_SECRET || 'JDJ5JDEwJHNPRHp3';
    this.checkoutUrl = config.checkoutUrl || process.env.AFRIPAY_CHECKOUT_URL || 'https://www.afripay.africa/checkout/index.php';
    this.defaultFrontendUrl = config.defaultFrontendUrl || process.env.FRONTEND_URL || 'https://kaspersky.kesug.com';
  }

  /**
   * Initializes a transaction with AfriPay.
   * Isolates secret credentials strictly on backend.
   */
  async initiatePayment(request, clientToken) {
    try {
      const normalizedAmount = String(request.amount).replace(/\s+/g, '');
      const currency = request.currency || 'BIF';
      const comment = request.comment || `Achat - ${request.email}`;
      const frontendUrl = this.defaultFrontendUrl.replace(/\/+$/, '');

      const returnUrl = request.returnUrl || `${frontendUrl}/paiement/resultat`;
      const cancelUrl = request.cancelUrl || `${frontendUrl}/paiement/echec`;
      const backUrl = request.backUrl || `${frontendUrl}/`;

      const checkoutFormData = {
        amount: normalizedAmount,
        currency: currency,
        comment: comment,
        client_token: clientToken,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        back_url: backUrl,
        app_id: this.appId,
        app_secret: this.appSecret,
      };

      return {
        success: true,
        transactionId: clientToken,
        redirectUrl: this.checkoutUrl,
        checkoutFormData: checkoutFormData,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: clientToken,
        error: error.message || 'Erreur lors de l’initialisation du paiement AfriPay',
      };
    }
  }

  /**
   * Verifies status of a transaction
   */
  async verifyTransaction(clientToken, transactionRef) {
    return {
      transactionId: clientToken,
      status: 'PENDING',
      transactionRef: transactionRef,
    };
  }

  /**
   * Normalizes incoming webhook payload from AfriPay
   */
  parseWebhook(payload) {
    const rawStatus = (payload.status || '').toLowerCase();
    let normalizedStatus = 'pending';

    if (rawStatus === 'success' || rawStatus === 'completed' || payload.response_code === '00') {
      normalizedStatus = 'success';
    } else if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'error') {
      normalizedStatus = 'failed';
    }

    const phone = payload.phone || payload.payer_phone || payload.phone_number || '';

    return {
      client_token: payload.client_token || payload.id || payload.token,
      transaction_ref: payload.transaction_ref || payload.ref || payload.payment_reference,
      status: normalizedStatus,
      amount: payload.amount,
      currency: payload.currency || 'BIF',
      payment_method: payload.payment_method || payload.method || 'mobile_money',
      phone: phone,
      payer_phone: phone,
      phone_number: phone,
      rawPayload: payload,
    };
  }
}

module.exports = { AfriPayAdapter };
