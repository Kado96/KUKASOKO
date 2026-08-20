/**
 * NotificationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service de notifications push avancées pour l'app Android/iOS Kukasoko.
 * Gère :
 * - Badge sur l'icône de l'app (nombre de notifs non lues)
 * - Notifications locales avec son (messages, commandes, etc.)
 * - Permissions Android / iOS
 */

import { Capacitor } from "@capacitor/core";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  id?: number;
  title: string;
  body: string;
  sound?: boolean;
  channelId?: string;
  /** Données supplémentaires à passer dans le handler onClick */
  extra?: Record<string, any>;
}

// ─── Canaux Android ───────────────────────────────────────────────────────────
const CHANNEL_MESSAGES = "kukasoko-messages";
const CHANNEL_ALERTS = "kukasoko-alerts";

// ─── Classe NotificationService ──────────────────────────────────────────────

class NotificationServiceClass {
  private isNative: boolean;
  private permissionsGranted = false;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  /**
   * Initialise le service : demande les permissions et crée les canaux Android.
   * Doit être appelé au démarrage de l'app (App.tsx ou AuthContext).
   */
  async init(): Promise<void> {
    if (!this.isNative) return;

    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");

      // Demander les permissions
      const perm = await LocalNotifications.requestPermissions();
      this.permissionsGranted = perm.display === "granted";

      if (!this.permissionsGranted) {
        console.warn("[NotificationService] Permissions refusées.");
        return;
      }

      // Créer les canaux Android (importance HIGH = son + vibration)
      if (Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({
          id: CHANNEL_MESSAGES,
          name: "Messages Kukasoko",
          description: "Nouveaux messages des acheteurs et vendeurs",
          importance: 4, // IMPORTANCE_HIGH
          vibration: true,
          sound: "notification.wav",
          visibility: 1,
        });
        await LocalNotifications.createChannel({
          id: CHANNEL_ALERTS,
          name: "Alertes Kukasoko",
          description: "Alertes importantes (paiement, annonce expirée...)",
          importance: 4,
          vibration: true,
          sound: "default",
          visibility: 1,
        });
      }

      console.info("[NotificationService] Initialisé. Canaux Android créés.");
    } catch (e) {
      console.warn("[NotificationService] Erreur init:", e);
    }
  }

  // ─── Badge icône app ───────────────────────────────────────────────────────

  /**
   * Met à jour le badge sur l'icône de l'application.
   * @param count - 0 pour effacer le badge
   */
  async setBadge(count: number): Promise<void> {
    if (!this.isNative) return;
    try {
      const { Badge } = await import("@capawesome/capacitor-badge");
      const isSupported = await Badge.isSupported();
      if (!isSupported.isSupported) return;
      const hasPermission = await Badge.checkPermissions();
      if (hasPermission.display !== "granted") {
        await Badge.requestPermissions();
      }
      if (count === 0) {
        await Badge.clear();
      } else {
        await Badge.set({ count });
      }
      console.info(`[NotificationService] Badge mis à jour: ${count}`);
    } catch (e) {
      console.warn("[NotificationService] Erreur badge:", e);
    }
  }

  /**
   * Incrémente le badge de 1.
   */
  async incrementBadge(): Promise<void> {
    if (!this.isNative) return;
    try {
      const { Badge } = await import("@capawesome/capacitor-badge");
      await Badge.increase();
    } catch (e) {
      console.warn("[NotificationService] Erreur incrementBadge:", e);
    }
  }

  /**
   * Efface le badge de l'icône.
   */
  async clearBadge(): Promise<void> {
    if (!this.isNative) return;
    try {
      const { Badge } = await import("@capawesome/capacitor-badge");
      await Badge.clear();
    } catch (e) {
      console.warn("[NotificationService] Erreur clearBadge:", e);
    }
  }

  // ─── Notifications locales ────────────────────────────────────────────────

  /**
   * Envoie une notification locale avec son.
   */
  async send(payload: NotificationPayload): Promise<void> {
    if (!this.isNative) {
      // Fallback Web: utiliser l'API Notifications du navigateur
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(payload.title, {
            body: payload.body,
            icon: "/logo192.png",
          });
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification(payload.title, { body: payload.body });
          }
        }
      }
      return;
    }

    if (!this.permissionsGranted) {
      await this.init();
      if (!this.permissionsGranted) return;
    }

    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id: payload.id ?? Math.floor(Math.random() * 100000),
            title: payload.title,
            body: payload.body,
            channelId: payload.channelId ?? CHANNEL_MESSAGES,
            sound: payload.sound !== false ? "notification.wav" : undefined,
            extra: payload.extra ?? {},
            smallIcon: "ic_stat_notification",
            iconColor: "#febb2d",
            schedule: { at: new Date(Date.now() + 100) }, // immédiat
          },
        ],
      });
      console.info(`[NotificationService] Notification envoyée: "${payload.title}"`);
    } catch (e) {
      console.warn("[NotificationService] Erreur send:", e);
    }
  }

  // ─── Méthodes pratiques ───────────────────────────────────────────────────

  /** Notification de nouveau message */
  async notifyNewMessage(senderName: string, preview: string): Promise<void> {
    await this.send({
      title: `💬 Nouveau message de ${senderName}`,
      body: preview,
      channelId: CHANNEL_MESSAGES,
      extra: { type: "message", sender: senderName },
    });
    await this.incrementBadge();
  }

  /** Notification d'annonce approuvée */
  async notifyListingApproved(title: string): Promise<void> {
    await this.send({
      title: "✅ Annonce publiée !",
      body: `Votre annonce "${title}" est maintenant visible sur Kukasoko.`,
      channelId: CHANNEL_ALERTS,
    });
  }

  /** Notification de paiement confirmé */
  async notifyPaymentConfirmed(amount: number, currency = "BIF"): Promise<void> {
    await this.send({
      title: "💳 Paiement confirmé",
      body: `Votre paiement de ${amount.toLocaleString("fr-BI")} ${currency} a été reçu.`,
      channelId: CHANNEL_ALERTS,
    });
  }

  /** Notification d'intérêt sur une annonce (vue / message) */
  async notifyInterest(listingTitle: string): Promise<void> {
    await this.send({
      title: "👀 Un acheteur s'intéresse à votre annonce !",
      body: `Quelqu'un a consulté "${listingTitle}". Répondez rapidement pour conclure !`,
      channelId: CHANNEL_ALERTS,
    });
  }
}

export const NotificationService = new NotificationServiceClass();
