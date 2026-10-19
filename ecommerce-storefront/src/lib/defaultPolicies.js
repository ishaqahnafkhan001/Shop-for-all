import { DEFAULT_POLICY_TEMPLATES as templates, getDefaultPolicyText } from '@scaleup/storefront-theme';
export { POLICY_TYPES, injectPolicyPlaceholders, getDefaultPolicyText, buildDefaultPolicies } from '@scaleup/storefront-theme';
export const POLICY_LABELS = {
    refund: "Refund Policy",
    shipping: "Shipping Policy",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
};


export const DEFAULT_POLICY_TEMPLATES = Object.fromEntries(Object.entries(templates).map(([key, value]) => [key, value.body]));
export const getPolicyContent = (policies = {}, type, context = {}) => {
    const saved = String(policies?.[type] || '').trim();
    return saved || getDefaultPolicyText(type, context);
};
