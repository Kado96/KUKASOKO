// Types TypeScript pour le système d'abonnement et paiement KUKASOKO

export type PlanCode = 'FREE' | 'PRO' | 'BUSINESS';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';

export interface SubscriptionPlan {
  id: number;
  code: PlanCode;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  max_listings: number;
  featured_listings: boolean;
  advanced_analytics: boolean;
  marketing_tools: boolean;
  notif_message_contact: boolean;
  notif_weekly_report: boolean;
  notif_listing_views: boolean;
  notif_new_review: boolean;
  notif_daily_ai_report: boolean;
  notif_anomaly_alert: boolean;
  notif_ai_recommendations: boolean;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  is_active: boolean;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  auto_renew: boolean;
  whatsapp_number: string | null;
  created_at: string;
  plan: SubscriptionPlan;
}

export interface Payment {
  id: number;
  user_id: number;
  subscription_id: number | null;
  amount: number;
  currency: string;
  provider: string;
  transaction_id: string | null;
  status: PaymentStatus;
  payment_method: string | null;
  created_at: string;
  confirmed_at: string | null;
  checkout_url?: string;
  checkout_data?: Record<string, string>;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsOverview {
  total_users: number;
  total_listings: number;
  active_listings: number;
  plan_distribution: Record<PlanCode, number>;
  total_revenue: number;
  monthly_revenue: number;
  health_score: {
    score: number;
    status: string;
    metrics: {
      user_activity_ratio: number;
      listing_activity_ratio: number;
      payment_success_ratio: number;
    };
  };
}

export interface AIReport {
  generated_at: string;
  report: string;
  provider: string;
  ai_enabled: boolean;
}
