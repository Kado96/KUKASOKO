import { api } from './api';
import type {
  SubscriptionPlan,
  Subscription,
  Payment,
  Notification,
  AnalyticsOverview,
  AIReport,
} from '../types/subscription';

// ─── Plans ────────────────────────────────────────────────────────────────────
export const subscriptionService = {
  /**
   * Liste tous les plans disponibles (public).
   */
  getPlans: (): Promise<SubscriptionPlan[]> =>
    api.get('/api/subscriptions/plans').then((r) => r.data),

  /**
   * Récupère l'abonnement actif de l'utilisateur connecté.
   */
  getMySubscription: (): Promise<Subscription> =>
    api.get('/api/subscriptions/me').then((r) => r.data),

  /**
   * Démarre un abonnement (FREE = activé immédiatement, autres = pending).
   */
  createSubscription: (plan_code: string, whatsapp_number?: string): Promise<Subscription> =>
    api.post('/api/subscriptions', { plan_code, whatsapp_number }).then((r) => r.data),

  /**
   * Met à jour le numéro WhatsApp dans les préférences de l'abonnement.
   */
  updateWhatsApp: (whatsapp_number: string): Promise<Subscription> =>
    api.patch('/api/subscriptions/me/preferences', { whatsapp_number }).then((r) => r.data),

  /**
   * Annule l'abonnement actif.
   */
  cancelSubscription: (): Promise<{ message: string }> =>
    api.post('/api/subscriptions/me/cancel').then((r) => r.data),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentService = {
  /**
   * Crée une intention de paiement pour un plan donné.
   */
  createPayment: (plan_code: string, payment_method: string): Promise<Payment> =>
    api.post('/api/payments', { plan_code, payment_method }).then((r) => r.data),

  /**
   * Récupère le statut d'un paiement.
   */
  getPayment: (paymentId: number): Promise<Payment> =>
    api.get(`/api/payments/${paymentId}`).then((r) => r.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationService = {
  /**
   * Récupère les 50 dernières notifications de l'utilisateur.
   */
  getNotifications: (): Promise<Notification[]> =>
    api.get('/api/notifications/me').then((r) => r.data),

  /**
   * Retourne le nombre de notifications non lues.
   */
  getUnreadCount: (): Promise<{ unread_count: number }> =>
    api.get('/api/notifications/me/unread-count').then((r) => r.data),

  /**
   * Marque une notification comme lue.
   */
  markAsRead: (id: number): Promise<Notification> =>
    api.patch(`/api/notifications/${id}/read`).then((r) => r.data),

  /**
   * Marque toutes les notifications comme lues.
   */
  markAllAsRead: (): Promise<{ message: string }> =>
    api.patch('/api/notifications/me/read-all').then((r) => r.data),
};

// ─── Analytics (Admin) ────────────────────────────────────────────────────────
export const analyticsService = {
  getOverview: (): Promise<AnalyticsOverview> =>
    api.get('/api/analytics/overview').then((r) => r.data),

  getChurn: () => api.get('/api/analytics/churn').then((r) => r.data),

  getAnomalies: () => api.get('/api/analytics/anomalies').then((r) => r.data),

  getTrends: () => api.get('/api/analytics/trends').then((r) => r.data),

  getAIReport: (): Promise<AIReport> =>
    api.get('/api/analytics/ai-report').then((r) => r.data),

  getSubscriptions: () => api.get('/api/analytics/subscriptions').then((r) => r.data),

  getExpiringSoon: () => api.get('/api/analytics/expiring-soon').then((r) => r.data),

  notifyUser: (userId: number, notif_type: string, title: string, message: string) =>
    api.post(`/api/analytics/notify/${userId}`, { notif_type, title, message }).then((r) => r.data),

  broadcast: (notif_type: string, title: string, message: string, plan_filter?: string) =>
    api.post('/api/analytics/broadcast', { notif_type, title, message, plan_filter }).then((r) => r.data),
};
