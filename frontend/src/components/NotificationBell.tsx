import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { notificationService } from '../services/subscriptionService';
import type { Notification } from '../types/subscription';
import './NotificationBell.css';

const POLL_INTERVAL_MS = 30_000; // toutes les 30 secondes

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Polling du compteur non-lu ─────────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    try {
      const token = localStorage.getItem('kukasoko_token');
      if (!token) return;
      const { unread_count } = await notificationService.getUnreadCount();
      
      // Si de nouvelles notifications non lues sont arrivées, jouer un son
      setUnread((prev) => {
        if (unread_count > prev) {
          import('../services/mobileIntegrationService').then(({ mobileIntegrationService }) => {
            mobileIntegrationService.playNotificationSound();
          });
        }
        return unread_count;
      });

      // Mettre à jour l'icône de l'application mobile (badge)
      import('../services/mobileIntegrationService').then(({ mobileIntegrationService }) => {
        // Optionnellement, récupérer aussi le nombre de messages non lus de l'auth context
        const chatUnread = parseInt(localStorage.getItem('chat_unread_count') || '0', 10);
        mobileIntegrationService.updateAppIconBadge(unread_count, chatUnread);
      });
    } catch {/* silent */}
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // ─── Fermeture au clic extérieur ────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Ouverture du panel ──────────────────────────────────────────────────────
  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open) {
      setLoading(true);
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data);
        setUnread(data.filter((n) => !n.is_read).length);
      } catch {/* silent */} finally {
        setLoading(false);
      }
    }
  };

  // ─── Marquer comme lue ──────────────────────────────────────────────────────
  const markRead = async (id: number) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  // ─── Formateur de temps ─────────────────────────────────────────────────────
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

  return (
    <div className="nb-wrapper" ref={panelRef}>
      {/* ── Bouton cloche ── */}
      <button
        id="notification-bell-btn"
        className="nb-bell-btn"
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unread > 0 && (
          <span className="nb-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {/* ── Panel déroulant ── */}
      {open && (
        <div className="nb-panel" role="dialog" aria-label="Panneau de notifications">
          <div className="nb-panel-header">
            <h4>Notifications</h4>
            {unread > 0 && (
              <button className="nb-read-all-btn" onClick={markAllRead}>
                <CheckCheck size={14} /> Tout lire
              </button>
            )}
          </div>

          <div className="nb-list">
            {loading ? (
              <div className="nb-empty">
                <Loader2 size={24} className="nb-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="nb-empty">
                <Bell size={32} opacity={0.3} />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`nb-item ${!n.is_read ? 'nb-item--unread' : ''}`}
                >
                  <div className="nb-item-content">
                    <span className="nb-item-title">{n.title}</span>
                    <span className="nb-item-msg">{n.message}</span>
                    <span className="nb-item-time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.is_read && (
                    <button
                      className="nb-mark-read"
                      onClick={() => markRead(n.id)}
                      aria-label="Marquer comme lue"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
