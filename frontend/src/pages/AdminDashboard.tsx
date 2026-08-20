import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, Users, ShoppingBag, TrendingUp, AlertTriangle,
  Bell, Send, RefreshCw, Loader2, Brain, CheckCircle2,
  XCircle, Crown, Star, Zap, PhoneCall, Clock
} from 'lucide-react';
import { analyticsService } from '../services/subscriptionService';
import type { AnalyticsOverview, AIReport } from '../types/subscription';
import './AdminDashboard.css';

// ─────────────────────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'subscriptions' | 'notify' | 'ai';

interface SubRow {
  id: number;
  user_id: number;
  username: string;
  email: string;
  plan: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  whatsapp_number: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const planIcon = (code: string) => {
  const map: Record<string, React.ReactNode> = {
    FREE: <Zap size={14} />,
    PRO: <Star size={14} />,
    BUSINESS: <Crown size={14} />,
  };
  return map[code] ?? null;
};

const planColor = (code: string) => {
  const map: Record<string, string> = {
    FREE: '#6b7280',
    PRO: '#6357e3',
    BUSINESS: '#f6ad55',
  };
  return map[code] ?? '#999';
};

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    active: '#22c55e',
    pending: '#f59e0b',
    expired: '#ef4444',
    cancelled: '#9ca3af',
  };
  return map[s] ?? '#999';
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';

// ─────────────────────────────────────────────────────────────────────────────
// Mini composant : carte statistique
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color = '#6357e3',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="ad-stat-card">
      <div className="ad-stat-icon" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <div className="ad-stat-value">{value}</div>
        <div className="ad-stat-label">{label}</div>
        {sub && <div className="ad-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini composant : jauge plan
// ─────────────────────────────────────────────────────────────────────────────
function PlanGauge({ plan, count, total }: { plan: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="ad-plan-gauge">
      <div className="ad-plan-gauge-header">
        <span className="ad-plan-label" style={{ color: planColor(plan) }}>
          {planIcon(plan)} {plan}
        </span>
        <span className="ad-plan-count">{count} ({pct}%)</span>
      </div>
      <div className="ad-plan-bar-bg">
        <div
          className="ad-plan-bar-fill"
          style={{ width: `${pct}%`, background: planColor(plan) }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [churn, setChurn] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [expiring, setExpiring] = useState<SubRow[]>([]);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Broadcast form
  const [bType, setBType] = useState('message_contact');
  const [bTitle, setBTitle] = useState('');
  const [bMsg, setBMsg] = useState('');
  const [bPlan, setBPlan] = useState('');

  const setLoad = (key: string, val: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Chargement tab overview ──────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'overview') {
      setLoad('overview', true);
      Promise.all([
        analyticsService.getOverview(),
        analyticsService.getChurn(),
        analyticsService.getAnomalies(),
      ])
        .then(([ov, ch, an]) => {
          setOverview(ov);
          setChurn(ch.churn_risks ?? []);
          setAnomalies(an.anomalies ?? []);
        })
        .catch(() => showToast('Erreur chargement données.', 'error'))
        .finally(() => setLoad('overview', false));
    }
    if (tab === 'subscriptions') {
      setLoad('subs', true);
      Promise.all([analyticsService.getSubscriptions(), analyticsService.getExpiringSoon()])
        .then(([s, e]) => {
          setSubscriptions(s ?? []);
          setExpiring(e ?? []);
        })
        .catch(() => showToast('Erreur chargement abonnements.', 'error'))
        .finally(() => setLoad('subs', false));
    }
    if (tab === 'ai') {
      setLoad('ai', true);
      analyticsService
        .getAIReport()
        .then(setAiReport)
        .catch(() => showToast('Erreur génération rapport IA.', 'error'))
        .finally(() => setLoad('ai', false));
    }
  }, [tab, showToast]);

  const handleBroadcast = async () => {
    if (!bTitle || !bMsg) {
      showToast('Titre et message requis.', 'error');
      return;
    }
    setLoad('broadcast', true);
    try {
      const res = await analyticsService.broadcast(bType, bTitle, bMsg, bPlan || undefined);
      showToast(`✅ ${res.sent_count}/${res.total_targeted} notifications envoyées.`);
      setBTitle(''); setBMsg('');
    } catch {
      showToast('Erreur envoi notification.', 'error');
    } finally {
      setLoad('broadcast', false);
    }
  };

  const totalSubs = overview
    ? Object.values(overview.plan_distribution).reduce((a, b) => a + b, 0)
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ad-page">
      {/* ── Toast ── */}
      {toast && (
        <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Sidebar ── */}
      <aside className="ad-sidebar">
        <div className="ad-sidebar-logo">
          <Brain size={28} /> <span>KS Admin</span>
        </div>
        <nav className="ad-nav">
          {([
            { id: 'overview', icon: <BarChart2 size={18} />, label: 'Vue d\'ensemble' },
            { id: 'subscriptions', icon: <Users size={18} />, label: 'Abonnements' },
            { id: 'notify', icon: <Bell size={18} />, label: 'Notifications' },
            { id: 'ai', icon: <Brain size={18} />, label: 'Rapport IA' },
          ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((item) => (
            <button
              key={item.id}
              id={`admin-tab-${item.id}`}
              className={`ad-nav-item ${tab === item.id ? 'ad-nav-item--active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="ad-main">
        {/* ══════════════ VUE D'ENSEMBLE ══════════════ */}
        {tab === 'overview' && (
          <>
            <h1 className="ad-title">Vue d'ensemble</h1>

            {loading.overview ? (
              <div className="ad-loader"><Loader2 className="ad-spin" size={40} /></div>
            ) : overview ? (
              <>
                {/* Stats cards */}
                <div className="ad-stats-grid">
                  <StatCard icon={<Users size={22} />} label="Utilisateurs" value={overview.total_users} color="#6357e3" />
                  <StatCard icon={<ShoppingBag size={22} />} label="Annonces" value={overview.total_listings} sub={`${overview.active_listings} actives`} color="#22c55e" />
                  <StatCard icon={<TrendingUp size={22} />} label="Revenus totaux" value={`${overview.total_revenue.toLocaleString()} BIF`} sub={`${overview.monthly_revenue.toLocaleString()} ce mois`} color="#f6ad55" />
                  <StatCard
                    icon={<BarChart2 size={22} />}
                    label="Score santé"
                    value={`${overview.health_score.score}/100`}
                    sub={overview.health_score.status}
                    color={overview.health_score.score >= 70 ? '#22c55e' : overview.health_score.score >= 40 ? '#f59e0b' : '#ef4444'}
                  />
                </div>

                {/* Plans distribution */}
                <section className="ad-section">
                  <h2>Distribution des plans</h2>
                  <div className="ad-gauges">
                    {Object.entries(overview.plan_distribution).map(([plan, count]) => (
                      <PlanGauge key={plan} plan={plan} count={count} total={totalSubs} />
                    ))}
                  </div>
                </section>

                {/* Churn risks */}
                {churn.length > 0 && (
                  <section className="ad-section">
                    <h2><AlertTriangle size={16} style={{ color: '#f59e0b' }} /> Risques de churn ({churn.length})</h2>
                    <div className="ad-table-wrapper">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            <th>Utilisateur</th>
                            <th>Plan</th>
                            <th>Risque</th>
                            <th>Raison</th>
                          </tr>
                        </thead>
                        <tbody>
                          {churn.slice(0, 10).map((c, i) => (
                            <tr key={i}>
                              <td>{c.user_id}</td>
                              <td><span style={{ color: planColor(c.plan) }}>{c.plan}</span></td>
                              <td>
                                <span className={`ad-badge ad-badge--${c.risk_level}`}>{c.risk_level}</span>
                              </td>
                              <td>{c.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Anomalies */}
                {anomalies.length > 0 && (
                  <section className="ad-section">
                    <h2><AlertTriangle size={16} style={{ color: '#ef4444' }} /> Anomalies ({anomalies.length})</h2>
                    <div className="ad-anomaly-list">
                      {anomalies.map((a, i) => (
                        <div key={i} className="ad-anomaly-item">
                          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                          <div>
                            <strong>{a.type}</strong>: {a.description}
                            {a.value !== undefined && (
                              <span className="ad-anomaly-value"> (valeur: {a.value})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <p className="ad-empty">Impossible de charger les données.</p>
            )}
          </>
        )}

        {/* ══════════════ ABONNEMENTS ══════════════ */}
        {tab === 'subscriptions' && (
          <>
            <h1 className="ad-title">Gestion des abonnements</h1>
            {loading.subs ? (
              <div className="ad-loader"><Loader2 className="ad-spin" size={40} /></div>
            ) : (
              <>
                {/* Expirants bientôt */}
                {expiring.length > 0 && (
                  <section className="ad-section">
                    <h2><Clock size={16} style={{ color: '#f59e0b' }} /> Expirent dans 7 jours ({expiring.length})</h2>
                    <div className="ad-table-wrapper">
                      <table className="ad-table">
                        <thead>
                          <tr><th>Utilisateur</th><th>Email</th><th>Plan</th><th>Expire le</th><th>WhatsApp</th></tr>
                        </thead>
                        <tbody>
                          {expiring.map((s) => (
                            <tr key={s.id}>
                              <td>{s.username}</td>
                              <td>{s.email}</td>
                              <td><span style={{ color: planColor(s.plan) }}>{planIcon(s.plan)} {s.plan}</span></td>
                              <td>{fmtDate(s.ends_at)}</td>
                              <td>{s.whatsapp_number ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Tous les abonnements */}
                <section className="ad-section">
                  <h2>Tous les abonnements ({subscriptions.length})</h2>
                  <div className="ad-table-wrapper">
                    <table className="ad-table">
                      <thead>
                        <tr><th>ID</th><th>Utilisateur</th><th>Email</th><th>Plan</th><th>Statut</th><th>Début</th><th>Fin</th><th>WhatsApp</th></tr>
                      </thead>
                      <tbody>
                        {subscriptions.map((s) => (
                          <tr key={s.id}>
                            <td>#{s.id}</td>
                            <td>{s.username}</td>
                            <td>{s.email}</td>
                            <td>
                              <span className="ad-plan-pill" style={{ background: `${planColor(s.plan)}18`, color: planColor(s.plan) }}>
                                {planIcon(s.plan)} {s.plan}
                              </span>
                            </td>
                            <td>
                              <span className="ad-status-dot" style={{ background: statusColor(s.status) }} />
                              {s.status}
                            </td>
                            <td>{fmtDate(s.starts_at)}</td>
                            <td>{fmtDate(s.ends_at)}</td>
                            <td>{s.whatsapp_number ? <><PhoneCall size={12} /> {s.whatsapp_number}</> : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* ══════════════ NOTIFICATIONS ══════════════ */}
        {tab === 'notify' && (
          <>
            <h1 className="ad-title">Diffusion de notifications</h1>
            <section className="ad-section">
              <div className="ad-notify-form">
                <div className="ad-form-row">
                  <label htmlFor="notif-type">Type de notification</label>
                  <select id="notif-type" value={bType} onChange={(e) => setBType(e.target.value)}>
                    <option value="message_contact">Nouveau contact</option>
                    <option value="weekly_report">Rapport hebdomadaire</option>
                    <option value="listing_views">Vues annonce</option>
                    <option value="new_review">Nouvel avis</option>
                    <option value="anomaly_alert">Alerte anomalie</option>
                    <option value="ai_recommendations">Recommandations IA</option>
                  </select>
                </div>

                <div className="ad-form-row">
                  <label htmlFor="notif-plan">Filtrer par plan (vide = tous)</label>
                  <select id="notif-plan" value={bPlan} onChange={(e) => setBPlan(e.target.value)}>
                    <option value="">Tous les utilisateurs</option>
                    <option value="FREE">FREE seulement</option>
                    <option value="PRO">PRO seulement</option>
                    <option value="BUSINESS">BUSINESS seulement</option>
                  </select>
                </div>

                <div className="ad-form-row">
                  <label htmlFor="notif-title">Titre</label>
                  <input
                    id="notif-title"
                    type="text"
                    placeholder="Ex : Mise à jour importante"
                    value={bTitle}
                    onChange={(e) => setBTitle(e.target.value)}
                  />
                </div>

                <div className="ad-form-row">
                  <label htmlFor="notif-msg">Message</label>
                  <textarea
                    id="notif-msg"
                    rows={4}
                    placeholder="Rédigez votre message..."
                    value={bMsg}
                    onChange={(e) => setBMsg(e.target.value)}
                  />
                </div>

                <button
                  id="notif-send-btn"
                  className="ad-btn ad-btn--primary"
                  onClick={handleBroadcast}
                  disabled={loading.broadcast}
                >
                  {loading.broadcast ? <Loader2 size={16} className="ad-spin" /> : <Send size={16} />}
                  Envoyer la notification
                </button>
              </div>
            </section>
          </>
        )}

        {/* ══════════════ RAPPORT IA ══════════════ */}
        {tab === 'ai' && (
          <>
            <h1 className="ad-title">Rapport IA</h1>
            {loading.ai ? (
              <div className="ad-loader">
                <Loader2 className="ad-spin" size={40} />
                <p>Génération du rapport en cours…</p>
              </div>
            ) : aiReport ? (
              <section className="ad-section">
                <div className="ad-ai-header">
                  <div>
                    <span className={`ad-ai-badge ${aiReport.ai_enabled ? 'ad-ai-badge--on' : 'ad-ai-badge--off'}`}>
                      {aiReport.ai_enabled ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {aiReport.ai_enabled ? `IA active (${aiReport.provider})` : 'Mode local (fallback)'}
                    </span>
                  </div>
                  <button
                    id="ai-refresh-btn"
                    className="ad-btn ad-btn--outline"
                    onClick={() => {
                      setLoad('ai', true);
                      analyticsService.getAIReport().then(setAiReport).finally(() => setLoad('ai', false));
                    }}
                  >
                    <RefreshCw size={14} /> Régénérer
                  </button>
                </div>
                <div className="ad-ai-report">
                  {aiReport.report.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div className="ad-ai-footer">
                  Généré le {new Date(aiReport.generated_at).toLocaleString('fr-FR')}
                </div>
              </section>
            ) : (
              <p className="ad-empty">Impossible de générer le rapport.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
