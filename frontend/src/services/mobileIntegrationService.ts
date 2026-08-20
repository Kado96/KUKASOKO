// Service d'intégration mobile pour les Badges d'icône d'application et Sonneries de notification

import { Badge } from '@capawesome/capacitor-badge';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { subscriptionService } from './subscriptionService';

// Audio par défaut en base64 pour être joué directement sur toutes les plateformes (Web + Android + iOS)
// Sonnerie courte et agréable "ping" de notification
const NOTIFICATION_SOUND_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==\n";

export const mobileIntegrationService = {
  /**
   * Met à jour le badge sur l'icône de l'application mobile.
   * Cette fonctionnalité premium dépend du plan de l'utilisateur.
   */
  updateAppIconBadge: async (unreadCount: number, chatUnreadCount: number) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // 1. Vérifier si l'utilisateur possède un plan qui autorise les notifications avancées (PRO/BUSINESS)
      const sub = await subscriptionService.getMySubscription();
      if (!sub || !sub.plan || (!sub.plan.whatsapp_notifications && sub.plan.code !== 'BUSINESS')) {
        // Option non incluse dans le plan actuel : on nettoie le badge
        await Badge.clear();
        return;
      }

      // 2. Additionner les notifications et les messages non lus
      const totalBadge = unreadCount + chatUnreadCount;
      if (totalBadge > 0) {
        await Badge.set({ count: totalBadge });
      } else {
        await Badge.clear();
      }
    } catch (e) {
      console.warn("Échec de la mise à jour du badge Capacitor:", e);
    }
  },

  /**
   * Émet un signal sonore de notification.
   * Un son natif ou une sonnerie personnalisée est joué.
   */
  playNotificationSound: async () => {
    try {
      // Vérifier l'abonnement en premier pour restreindre aux packs PRO/BUSINESS
      const sub = await subscriptionService.getMySubscription();
      if (!sub || !sub.plan || (!sub.plan.whatsapp_notifications && sub.plan.code !== 'BUSINESS')) {
        return; // Non autorisé pour ce plan
      }

      if (Capacitor.isNativePlatform()) {
        // Demande d'autorisation pour les notifications locales
        const status = await LocalNotifications.requestPermissions();
        if (status.display === 'granted') {
          await LocalNotifications.schedule({
            notifications: [
              {
                title: "Kukasoko",
                body: "Nouvelle notification reçue",
                id: Date.now(),
                sound: 'beep.wav', // Peut être placé dans res/raw ou android/app/src/main/res/raw/beep.wav
              }
            ]
          });
        }
      } else {
        // Fallback Web : Jouer un bip discret
        const audio = new Audio(NOTIFICATION_SOUND_BASE64);
        audio.volume = 0.6;
        await audio.play();
      }
    } catch (e) {
      console.warn("Échec de l'émission sonore de notification:", e);
    }
  }
};
