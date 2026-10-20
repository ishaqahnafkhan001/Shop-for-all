import toast, { Toaster } from '@atelier-real-toast';
import { getReferenceThemeStyle } from '@scaleup/storefront-renderer/reference-core';
import { getStorefrontPresentationVariant } from '@scaleup/storefront-theme';

// Reproduces the existing root/tenant toast host hierarchy without backend requests.
export function ToastCase({
  theme
}) {
  const atelier = getStorefrontPresentationVariant(theme) === 'atelier-editorial';
  return <div className="sf-presentation" style={getReferenceThemeStyle(theme)}>
        <div className="sf-presentation" data-sf-presentation={atelier ? 'atelier-editorial' : undefined} style={getReferenceThemeStyle(theme)}>
            <Toaster position={atelier ? 'top-right' : 'bottom-right'} {...atelier ? {
        containerStyle: {
          top: '1rem',
          zIndex: 100
        },
        toastOptions: {
          style: {
            background: 'var(--foreground)',
            color: 'var(--background)',
            fontFamily: 'var(--sf-body-font)',
            borderRadius: '4px'
          }
        }
      } : {}} />
            <div className="sf-page"><h1>Notification test</h1><button type="button" className="sf-btn" onClick={() => toast.success('Synthetic notification only', {
          duration: 60000
        })}>Show test notification</button></div>
        </div>
        <Toaster position="bottom-right" toastOptions={{
      duration: 3000,
      style: {
        background: '#333',
        color: '#fff',
        borderRadius: '10px'
      }
    }} />
    </div>;
}
