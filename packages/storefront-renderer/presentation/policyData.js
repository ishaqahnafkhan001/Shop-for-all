import { getDefaultPolicyText, POLICY_TYPES } from '@scaleup/storefront-theme';
export { POLICY_TYPES };
export const POLICY_LABELS = { refund: 'Refund Policy', shipping: 'Shipping Policy', privacy: 'Privacy Policy', terms: 'Terms & Conditions' };
export const getPolicyContent = (policies = {}, type, context = {}) => String(policies?.[type] || '').trim() || getDefaultPolicyText(type, context);
