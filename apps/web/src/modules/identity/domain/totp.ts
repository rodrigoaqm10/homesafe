type Factor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
};
export function ownsTotpFactor(
  factors: readonly Factor[],
  id: string,
): boolean {
  return factors.some(
    (f) =>
      f.id === id &&
      f.factor_type === 'totp' &&
      (f.status === 'verified' || f.status === 'unverified'),
  );
}
export function pendingHomeSafeFactors(factors: readonly Factor[]): Factor[] {
  return factors.filter(
    (f) =>
      f.factor_type === 'totp' &&
      f.status === 'unverified' &&
      f.friendly_name?.startsWith('HomeSafe '),
  );
}
