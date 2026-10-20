import { useEffect, useState } from 'react';
import { CartProvider } from '@/context/CartContext';
import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';
import CartPage from '@/app/[subdomain]/cart/page';
import CheckoutPage from '@/app/[subdomain]/checkout/page';
import AccountPage from '@/app/[subdomain]/account/page';
import TrackPage from '@/app/[subdomain]/track/page';
import AuthView from '@/components/account/AuthView';
import CustomerDashboard from '@/components/account/CustomerDashboard';
import { ProfileTab, SecurityTab } from '@/components/account/CustomerTabs';
import PasswordResetFlow from '@/components/account/PasswordResetFlow';
import VendorView from '@/components/account/VendorView';
import PolicyPageClient from '@/app/[subdomain]/policies/[type]/PolicyPageClient';
import PolicyIndex from '@/app/[subdomain]/policies/page';
import { CheckoutOtpModal } from '@scaleup/storefront-renderer/presentation/CheckoutSections';
import ConsentBanner from '@/components/storefront/AnalyticsConsentBanner';
import { PreviewCommercePage } from '../../src/pages/dashboard/StoreBuilder/PreviewCommercePages.jsx';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';
import { FixtureEnvironment, setFixtureEnvironment } from './atelier-route-runtime.jsx';
import { fixtureProducts, fixtureCustomer, fixtureOrder } from './atelier-route-data.js';
import { FixtureChrome, FixtureCartStatus } from './atelier-route-cases.jsx';
const noop = () => {};
const fulfilled = value => ({
  status: 'fulfilled',
  value,
  then: () => {}
});
function PolicyIndexFixture({
  theme,
  tenant
}) {
  const [view, setView] = useState(null);
  useEffect(() => {
    let active = true;
    setFixtureEnvironment({
      theme,
      tenant
    });
    PolicyIndex({
      params: Promise.resolve({
        subdomain: tenant
      })
    }).then(v => {
      if (active) setView(v);
    });
    return () => {
      active = false;
    };
  }, [theme, tenant]);
  return view;
}
export function Phase4Case({
  page,
  theme,
  scenario = 'normal',
  live = false,
  environment = {},
  showDiagnostics = false
}) {
  const presentationVariant = getStorefrontPresentationVariant(theme);
  const value = {
    theme,
    tenant: 'atelier-test-a',
    scenario,
    path: '/' + page,
    ...environment
  };
  const params = fulfilled({
    subdomain: value.tenant
  });
  const passForm = {
    oldPassword: '',
    newPassword: ''
  };
  let content;
  if (page === 'cart' || page === 'checkout' || page === 'policy') content = live ? page === 'cart' ? <CartPage /> : page === 'checkout' ? <CheckoutPage params={params} /> : <PolicyPageClient type="refund" /> : <PreviewCommercePage page={page} theme={theme} products={scenario === 'empty' ? [] : fixtureProducts} shopName="Fixture merchant" />;else if (page === 'account') content = live ? <AccountPage params={params} /> : <AuthView presentationVariant={presentationVariant} isRegistering={false} authForm={{
    fullName: '',
    email: '',
    password: '',
    otp: ''
  }} setIsRegistering={noop} setAuthForm={noop} onForgotPassword={noop} handleAuthSubmit={noop} handleSendOTP={noop} otpTimer={0} otpLoading={false} />;else if (page === 'register') content = <AuthView presentationVariant={presentationVariant} isRegistering authForm={{
    fullName: 'Test customer',
    email: 'customer@example.test',
    password: 'FixtureOnly123!',
    otp: ''
  }} setIsRegistering={noop} setAuthForm={noop} handleAuthSubmit={noop} handleSendOTP={noop} otpSent otpTimer={45} otpLoading={false} />;else if (page === 'reset') content = <PasswordResetFlow presentationVariant={presentationVariant} subdomain={value.tenant} onBack={noop} onComplete={noop} />;else if (page === 'dashboard') content = <CustomerDashboard presentationVariant={presentationVariant} user={fixtureCustomer} orders={scenario === 'empty' ? [] : [fixtureOrder]} handleLogout={noop} passForm={passForm} setPassForm={noop} handlePasswordReset={noop} />;else if (page === 'profile' || page === 'security') content = <div className={presentationVariant === 'atelier-editorial' ? 'sf-page atelier-dashboard' : 'sf-page'}><div className="sf-shell-wide py-8">{page === 'profile' ? <ProfileTab user={fixtureCustomer} /> : <SecurityTab presentationVariant={presentationVariant} />}</div></div>;else if (page === 'vendor') content = <VendorView presentationVariant={presentationVariant} user={{
    ...fixtureCustomer,
    role: 'VendorAdmin'
  }} handleLogout={noop} />;else if (page === 'track') content = <TrackPage params={params} />;else if (page === 'otp') content = <CheckoutOtpModal presentationVariant={presentationVariant} open error={scenario === 'otp-error' ? 'Fixture: invalid or expired code' : ''} maskedPhone="017****0000" otp="" state="otp_input" setOtp={noop} onCancel={noop} onSendCode={noop} onVerifyCode={noop} sending={false} verifying={false} />;else if (page === 'consent') content = <><div className="sf-page sf-mobile-action-page"><h1>Store consent fixture</h1></div><ConsentBanner /></>;else if (page === 'policy-index') content = <PolicyIndexFixture theme={theme} tenant={value.tenant} />;else if (page.startsWith('policy-')) content = <PolicyPageClient type={page.slice(7)} />;
  return <FixtureEnvironment value={value}><CartProvider key={value.tenant} subdomain={value.tenant}><StorefrontPresentationRuntime>{showDiagnostics && <FixtureCartStatus />}{live ? <FixtureChrome theme={theme}>{content}</FixtureChrome> : content}</StorefrontPresentationRuntime></CartProvider></FixtureEnvironment>;
}
export { PolicyIndex };
export { default as PolicyDetailPage } from '@/app/[subdomain]/policies/[type]/page';
