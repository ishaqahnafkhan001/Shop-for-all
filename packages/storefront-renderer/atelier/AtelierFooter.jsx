import { CircleCheck } from 'lucide-react';
import { LinkSlot } from '../reference/referenceCore';

export function AtelierFooter({ adaptiveParts = false, theme, brandName, storeLinks, supportLinks, contactHref, socialLinks, shopVerification, LinkComponent }) {
    const column = (title, links) => <div data-ab-part={adaptiveParts ? (title === 'Support' ? 'policies' : 'navigation') : undefined}><h3>{title}</h3><ul>{links.map((item, index) => <li key={`${item.href}-${index}`}><LinkSlot LinkComponent={LinkComponent} href={item.href}>{item.label}</LinkSlot></li>)}</ul></div>;
    return <footer data-ab-surface={adaptiveParts ? '' : undefined} className="atelier-footer">
        <div className="atelier-container">
            <div data-ab-surface={adaptiveParts ? '' : undefined} className="atelier-footer-grid">
                <div data-ab-part={adaptiveParts ? 'identity' : undefined} data-ab-surface={adaptiveParts ? '' : undefined} className="atelier-footer-identity"><h2>{brandName}</h2>{theme.footer?.text && <p>{theme.footer.text}</p>}{shopVerification?.isVerified && <span className="atelier-verified"><CircleCheck size={16} />{shopVerification.label || 'Verified seller'}</span>}</div>
                {column('Store', storeLinks)}
                {column('Support', supportLinks)}
                {(contactHref || socialLinks.length > 0) && <div><h3>Connect</h3>{contactHref && <LinkSlot LinkComponent={LinkComponent} href={contactHref}>{theme.footer?.contactLabel || 'Contact store'}</LinkSlot>}<ul>{socialLinks.map(item => <li key={item.key}><LinkSlot LinkComponent={LinkComponent} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</LinkSlot></li>)}</ul></div>}
            </div>
            <div data-ab-surface={adaptiveParts ? '' : undefined} className="atelier-footer-bottom"><p>© {new Date().getFullYear()} {brandName}. Powered by Scaleup.</p><p>Secure checkout · Privacy-friendly analytics</p></div>
        </div>
    </footer>;
}
