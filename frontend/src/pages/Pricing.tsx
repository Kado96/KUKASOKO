import React, { useState, useEffect } from 'react';
import { Check, Zap, Star, Crown, Loader2, ArrowRight, Phone } from 'lucide-react';
import { subscriptionService, paymentService } from '../services/subscriptionService';
import type { SubscriptionPlan, Subscription } from '../types/subscription';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Pricing.css';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  FREE: <Zap size={28} />,
  PRO: <Star size={28} />,
  BUSINESS: <Crown size={28} />,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: '#6b7280',
  PRO: '#6357e3',
  BUSINESS: '#f6ad55',
};

export default function Pricing() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [showWhatsApp, setShowWhatsApp] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isLoggedIn = !!localStorage.getItem('kukasoko_token');

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([
          subscriptionService.getPlans(),
          isLoggedIn ? subscriptionService.getMySubscription() : null,
        ]);
        setPlans(p);
        setCurrentSub(s);
      } catch {
        // plans toujours visibles même sans auth
        try { setPlans(await subscriptionService.getPlans()); } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubscribe = async (planCode: string) => {
    if (!isLoggedIn) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }
    if (planCode !== 'FREE' && showWhatsApp !== planCode) {
      setShowWhatsApp(planCode);
      return;
    }
    setSubscribing(planCode);
    try {
      if (planCode === 'FREE') {
        await subscriptionService.createSubscription('FREE');
        showToast('Plan GRATUIT activé avec succès ! 🎉');
      } else {
        // Crée une demande de paiement, redirige vers la page paiement
        const payment = await paymentService.createPayment(planCode, 'afripay');
        if (whatsapp) await subscriptionService.updateWhatsApp(whatsapp);
        showToast(`Demande de paiement créée (#${payment.id}). Contactez l'admin pour confirmer.`, 'success');
      }
      // Recharge l'abonnement
      const sub = await subscriptionService.getMySubscription();
      setCurrentSub(sub);
      setShowWhatsApp(null);
      setWhatsapp('');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Erreur lors de la souscription.', 'error');
    } finally {
      setSubscribing(null);
    }
  };

  const isCurrent = (code: string) =>
    currentSub?.plan?.code === code && currentSub?.status === 'active';

  if (loading) {
    return (
      <div className="pricing-loading">
        <Loader2 size={40} className="pricing-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <div className="pricing-page">
          {/* ── Toast ── */}
          {toast && (
            <div className={`pricing-toast pricing-toast--${toast.type}`}>
              {toast.msg}
            </div>
          )}

          {/* ── Hero ── */}
          <section className="pricing-hero">
            <div className="pricing-hero-badge">Plans &amp; Tarifs</div>
            <h1>Choisissez le plan qui <span className="pricing-gradient-text">vous convient</span></h1>
            <p>De l'annonce gratuite à la boutique professionnelle complète, nous avons la solution pour chaque vendeur.</p>
          </section>

          {/* ── Cards ── */}
          <section className="pricing-cards">
            {plans.map((plan) => {
              const current = isCurrent(plan.code);
              const color = PLAN_COLORS[plan.code] || '#6357e3';
              const isPro = plan.code === 'PRO';

              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${isPro ? 'pricing-card--featured' : ''} ${current ? 'pricing-card--current' : ''}`}
                  style={{ '--plan-color': color } as React.CSSProperties}
                >
                  {isPro && <div className="pricing-card-ribbon">⭐ Populaire</div>}
                  {current && <div className="pricing-card-current-badge">Votre plan actuel</div>}

                  <div className="pricing-card-icon" style={{ color }}>
                    {PLAN_ICONS[plan.code]}
                  </div>

                  <h2 className="pricing-card-name">{plan.name}</h2>
                  <p className="pricing-card-desc">{plan.description}</p>

                  <div className="pricing-card-price">
                    {plan.price === 0 ? (
                      <span className="pricing-price-free">Gratuit</span>
                    ) : (
                      <>
                        <span className="pricing-price-amount">{plan.price.toLocaleString()}</span>
                        <span className="pricing-price-currency"> {plan.currency}</span>
                        <span className="pricing-price-period">/mois</span>
                      </>
                    )}
                  </div>

                  {/* ── Features ── */}
                  <ul className="pricing-features">
                    <li>
                      <Check size={16} />
                      {plan.max_listings >= 9999 ? 'Annonces illimitées' : `${plan.max_listings} annonce${plan.max_listings > 1 ? 's' : ''} actives`}
                    </li>
                    {plan.featured_listings && <li><Check size={16} />Annonces mises en avant</li>}
                    {plan.advanced_analytics && <li><Check size={16} />Statistiques avancées</li>}
                    {plan.marketing_tools && <li><Check size={16} />Outils marketing</li>}
                    {plan.email_notifications && <li><Check size={16} />Notifications email</li>}
                    {plan.whatsapp_notifications && <li><Check size={16} />Notifications WhatsApp</li>}
                    {plan.notif_ai_recommendations && <li><Check size={16} />Recommandations IA</li>}
                    {plan.notif_daily_ai_report && <li><Check size={16} />Rapport IA quotidien</li>}
                  </ul>

                  {/* ── WhatsApp input (PRO/BUSINESS) ── */}
                  {showWhatsApp === plan.code && plan.code !== 'FREE' && (
                    <div className="pricing-whatsapp-input">
                      <Phone size={14} />
                      <input
                        id={`whatsapp-${plan.code}`}
                        type="tel"
                        placeholder="+257 XX XXX XXX"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                      />
                    </div>
                  )}

                  {/* ── CTA ── */}
                  <button
                    id={`subscribe-${plan.code}`}
                    className={`pricing-cta ${current ? 'pricing-cta--current' : ''}`}
                    style={!current ? { background: color } : {}}
                    onClick={() => !current && handleSubscribe(plan.code)}
                    disabled={current || subscribing === plan.code}
                  >
                    {subscribing === plan.code ? (
                      <Loader2 size={16} className="pricing-spin" />
                    ) : current ? (
                      '✓ Actif'
                    ) : showWhatsApp === plan.code ? (
                      <>Confirmer <ArrowRight size={14} /></>
                    ) : plan.code === 'FREE' ? (
                      'Commencer gratuitement'
                    ) : (
                      <>Passer à {plan.name} <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              );
            })}
          </section>

          {/* ── FAQ rapide ── */}
          <section className="pricing-faq">
            <h3>Questions fréquentes</h3>
            <div className="pricing-faq-grid">
              <div>
                <h4>Puis-je changer de plan ?</h4>
                <p>Oui, vous pouvez passer à un plan supérieur à tout moment. Le changement prend effet immédiatement.</p>
              </div>
              <div>
                <h4>Comment fonctionne le paiement ?</h4>
                <p>Nous utilisons AfriPay pour les paiements locaux. Un admin confirme votre paiement sous 24h.</p>
              </div>
              <div>
                <h4>Qu'arrive-t-il à mes annonces si je rétrograde ?</h4>
                <p>Vos annonces existantes restent actives. Seulement la limite s'applique aux nouvelles publications.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
