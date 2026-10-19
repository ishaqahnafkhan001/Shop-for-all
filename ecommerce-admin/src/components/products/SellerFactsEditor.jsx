import Input from '../ui/Input.jsx';

const FIELDS = [
    { key: 'brand', label: 'Brand', example: 'e.g. Acme', maxLength: 100 },
    { key: 'model', label: 'Model or product code', example: 'e.g. A24', maxLength: 100 },
    { key: 'material', label: 'Material or composition', example: 'e.g. 100% cotton', maxLength: 160 },
    { key: 'dimensions', label: 'Dimensions with units', example: 'e.g. 30 × 20 × 5 cm', maxLength: 120 },
    { key: 'packageContents', label: 'Package contents', example: 'e.g. 1 shirt and 1 belt', maxLength: 300 }
];

export default function SellerFactsEditor({ value = {}, onChange }) {
    return <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <h3 className="text-sm font-black text-slate-950">Seller-confirmed product facts</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
            Optional. Enter only verified public details that apply to every variant. AI uses them when drafting SEO, specifications, benefits, and notes.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FIELDS.map(({ key, label, example, maxLength }) => <Input key={key}
                id={`seller-fact-${key}`} label={label} placeholder={example}
                value={value[key] || ''} maxLength={maxLength}
                onChange={event => onChange({ ...value, [key]: event.target.value })} />)}
        </div>
    </section>;
}
