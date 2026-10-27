import { FileText, Plus, Trash2 } from 'lucide-react';
import { BuilderButton, BuilderCard, BuilderInput, BuilderTextarea } from '../builderUi.jsx';

const socialFields = [
    { key: 'facebookUrl', label: 'Facebook URL', placeholder: 'https://facebook.com/your-store' },
    { key: 'instagramUrl', label: 'Instagram URL', placeholder: 'https://instagram.com/your-store' },
    { key: 'twitterUrl', label: 'X / Twitter URL', placeholder: 'https://x.com/your-store' },
    { key: 'youtubeUrl', label: 'YouTube URL', placeholder: 'https://youtube.com/@your-store' },
    { key: 'tiktokUrl', label: 'TikTok URL', placeholder: 'https://tiktok.com/@your-store' }
];

export function FooterEditor({ theme, updateFooter, addFooterLink, removeFooterLink, updateFooterLink }) {
    return (
        <BuilderCard title="Footer" description="Build a polished footer with store story, support links, contact, and social profiles." icon={FileText}>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="mb-3 text-sm font-black text-slate-950">Brand story</p>
                <BuilderTextarea label="Short footer description" value={theme.footer?.text || ''} onChange={event => updateFooter('text', event.target.value)} placeholder="Elegant accessories and jewellery selected for everyday and occasion wear." help="Shown beside your logo in the footer. Keep it short, warm, and customer-facing." />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="mb-3 text-sm font-black text-slate-950">Contact and social links</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <BuilderInput label="Contact link text" value={theme.footer?.contactLabel || ''} onChange={event => updateFooter('contactLabel', event.target.value)} placeholder="Contact store" />
                    <BuilderInput label="Contact email" type="email" value={theme.footer?.contactEmail || ''} onChange={event => updateFooter('contactEmail', event.target.value)} placeholder="support@yourstore.com" help="Creates a mail link in the support column." />
                    {socialFields.map(field => (
                        <BuilderInput key={field.key} label={field.label} value={theme.footer?.[field.key] || ''} onChange={event => updateFooter(field.key, event.target.value)} placeholder={field.placeholder} />
                    ))}
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div><p className="text-sm font-black text-slate-950">Extra support links</p><p className="text-xs text-slate-500">Policy links are added automatically. Add custom pages, collections, or help links here.</p></div>
                    <BuilderButton type="button" variant="secondary" onClick={addFooterLink} className="text-xs"><Plus size={14} /> Add link</BuilderButton>
                </div>
                {(theme.footer?.links || []).length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No custom support links yet. Your policy links still appear automatically.</div>}
                {(theme.footer?.links || []).map((item, index) => (
                    <div key={`${item.label || 'footer-link'}-${index}`} className="rounded-lg border border-slate-200 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Link {index + 1}</p>
                            <BuilderButton type="button" variant="subtle" onClick={() => removeFooterLink(index)} className="text-xs text-red-600"><Trash2 size={14} /> Remove</BuilderButton>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <BuilderInput label="Label" value={item.label || ''} onChange={event => updateFooterLink(index, 'label', event.target.value)} placeholder="Refund policy" />
                            <BuilderInput label="URL" value={item.url || ''} onChange={event => updateFooterLink(index, 'url', event.target.value)} placeholder="/policy/refund" />
                        </div>
                    </div>
                ))}
            </div>
        </BuilderCard>
    );
}

export default FooterEditor;
