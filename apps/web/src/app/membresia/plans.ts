export const membershipPlans = [
  { id: 'normal-6', tier: 'Normal', months: 6, monthly: 39990 },
  { id: 'normal-12', tier: 'Normal', months: 12, monthly: 35990 },
  { id: 'pro-6', tier: 'Pro', months: 6, monthly: 64990 },
  { id: 'pro-12', tier: 'Pro', months: 12, monthly: 58490 },
] as const;

export const formatClp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});
