/* eslint-disable @next/next/no-img-element */
import { Menu, Search, ShoppingBag, Truck, User, X } from 'lucide-react';
import { LinkSlot, optimizeCloudinaryImage } from '../reference/referenceCore';

// Presentation and navigation only; the shared header owns menu/search state.
export function AtelierHeader({ adaptiveParts = false, theme, brandName, badges, navigation, links, cartCount, onSearch, open, onToggle, onClose, LinkComponent }) {
    return <header data-ab-surface={adaptiveParts ? '' : undefined} className="atelier-header" data-compact={theme.mobile?.compactHeader !== false} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
        <div data-ab-surface={adaptiveParts ? '' : undefined} className="atelier-container atelier-header-row">
            <LinkSlot data-ab-part={adaptiveParts ? 'identity' : undefined} LinkComponent={LinkComponent} href="/" prefetch={false} className="atelier-wordmark">
                {theme.logoUrl && <img src={optimizeCloudinaryImage(theme.logoUrl, { width: 160 })} alt="" width="64" height="64" decoding="async" />}
                <span>{brandName}{badges && <span className="atelier-brand-badges">{badges}</span>}</span>
            </LinkSlot>
            <div className="atelier-desktop-navigation">{navigation}</div>
            <div data-ab-part={adaptiveParts ? 'utilities' : undefined} className="atelier-utilities">
                <button type="button" onClick={onSearch} aria-label="Search products"><Search size={18} /><span>Search</span></button>
                <LinkSlot LinkComponent={LinkComponent} href="/account" aria-label="Customer account"><User size={18} /><span>Account</span></LinkSlot>
                <LinkSlot LinkComponent={LinkComponent} href="/track" aria-label="Track order"><Truck size={18} /><span>Track</span></LinkSlot>
                <LinkSlot LinkComponent={LinkComponent} href="/cart" aria-label={`Cart, ${cartCount} items`}><ShoppingBag size={18} /><span>Bag</span><b className="atelier-cart-count">({cartCount})</b></LinkSlot>
                <button type="button" className="atelier-menu-toggle" onClick={onToggle} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="atelier-mobile-navigation">{open ? <X size={22} /> : <Menu size={22} />}</button>
            </div>
        </div>
        {open && <nav data-ab-part={adaptiveParts ? 'navigation' : undefined} id="atelier-mobile-navigation" className="atelier-mobile-navigation atelier-container" aria-label="Store navigation">
            {links.map((item, index) => <div key={`${item.label}-${index}`}>
                <LinkSlot LinkComponent={LinkComponent} href={item.url || '#'} onClick={onClose}>{item.label}</LinkSlot>
                {item.children?.length > 0 && <ul>{item.children.map((child, childIndex) => <li key={`${child.label}-${childIndex}`}><LinkSlot LinkComponent={LinkComponent} href={child.url} onClick={onClose}>{child.label}</LinkSlot></li>)}</ul>}
            </div>)}
        </nav>}
    </header>;
}
