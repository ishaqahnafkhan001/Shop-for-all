const scalarFields = { description: ['description'], seo: ['seoTitle', 'seoDescription'], seoTitle: ['seoTitle'], seoDescription: ['seoDescription'], imageAlt: ['imageAlt'] };
const rowFields = { sellingPoints: ['point', 'reason'], specifications: ['label', 'value'] };
export default function ProductSuggestionEditor({ value, sections, onChange }) {
    return <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-bold">Edit suggested wording before Apply</summary>
        {sections.flatMap(section => (scalarFields[section] || []).map(key => <label key={key} className="mt-3 block">{key.replace(/([A-Z])/g, ' $1')}
            <textarea aria-label={`Suggested ${key}`} className="mt-1 w-full rounded border p-2" value={value[key] || ''} maxLength={key === 'description' ? 4000 : 500}
                onChange={e => onChange({ ...value, [key]: e.target.value })} /></label>))}
        {sections.filter(section => rowFields[section]).map(section => <div key={section} className="mt-3 space-y-2">
            <p className="font-semibold">{section === 'sellingPoints' ? 'Buyer benefits' : 'Specifications'}</p>
            {(value[section] || []).map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-2">
                {rowFields[section].map(key => <label key={key}>{key}<input className="block w-full rounded border p-2" maxLength={300} value={row[key] || ''}
                    onChange={e => onChange({ ...value, [section]: value[section].map((item, i) => i === index ? { ...item, [key]: e.target.value } : item) })} /></label>)}
            </div>)}
        </div>)}
        {sections.includes('extraNotes') && (value.extraNotes || []).map((note, index) => <label key={index} className="mt-3 block">Public note {index + 1}
            <textarea className="block w-full rounded border p-2" value={note} maxLength={400} onChange={e => onChange({ ...value, extraNotes: value.extraNotes.map((item, i) => i === index ? e.target.value : item) })} />
        </label>)}
    </details>;
}
