// Helper to load pricing & credits configuration
// Structure defined in src/config/plans.json
// Provides normalized accessors for UI components

import plansRaw from '../config/plans.json';

export const PLANS_VERSION = plansRaw.version;
export const CURRENCY = plansRaw.currency || 'USD';

export const PLANS = plansRaw.plans;
export const TOPUPS = plansRaw.topups.map(t => ({
  ...t,
  price_per_ai_generation: t.ai_generations_add ? (t.price / t.ai_generations_add) : null,
  price_per_pro_search: t.pro_searches_add ? (t.price / t.pro_searches_add) : null,
  discount_percent: t.original_price ? Math.round(100 - (t.price / t.original_price) * 100) : null
}));

export function getTopupById(id) {
  return TOPUPS.find(t => t.id === id);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(amount);
}

export function summarizeTopup(topup) {
  if (!topup) return '';
  return `${topup.ai_generations_add} AI + ${topup.pro_searches_add} Pro Searches for ${formatCurrency(topup.price)}`;
}

export function recommendedTopup() {
  return TOPUPS.find(t => t.popular) || TOPUPS[0];
}

export function isUnlimited(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return false;
  return plan.ai_generations_included === 'unlimited' && plan.pro_searches_included === 'unlimited';
}

export function listPlans() {
  return Object.entries(PLANS).map(([key, value]) => ({ key, ...value }));
}

export function planDisplayName(key) {
  return PLANS[key]?.label || key;
}

export default {
  PLANS_VERSION,
  CURRENCY,
  PLANS,
  TOPUPS,
  getTopupById,
  summarizeTopup,
  recommendedTopup,
  isUnlimited,
  listPlans,
  planDisplayName,
  formatCurrency
};
