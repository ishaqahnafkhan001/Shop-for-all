import { RefreshCw, Sparkles } from 'lucide-react';
import { BuilderButton } from '../StoreBuilder/builderUi.jsx';

export default function SeoAiPanel({ state, onGenerate, onApply }) {
    const suggestions = state.data?.alternatives?.length
        ? state.data.alternatives
        : (state.data?.title || state.data?.description ? [state.data] : []);
    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-600">AI assistant</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Homepage search suggestions</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        Generate alternatives from public store context. Suggestions update your draft only and never publish automatically.
                    </p>
                </div>
                <BuilderButton type="button" onClick={onGenerate} disabled={state.loading}>
                    {state.loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {state.loading ? 'Generating…' : 'Generate 3 alternatives'}
                </BuilderButton>
            </div>
            {state.error && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{state.error}</p>}
            {suggestions.length > 0 && (
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                        <article key={suggestion.id || index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Option {index + 1}</p>
                            <h3 className="mt-2 text-sm font-black text-slate-950">{suggestion.title || 'No title suggestion'}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{suggestion.description || 'No description suggestion'}</p>
                            {suggestion.explanation && <p className="mt-3 text-xs leading-5 text-slate-500">Why: {suggestion.explanation}</p>}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <BuilderButton variant="subtle" className="text-xs" onClick={() => onApply(suggestion, ['title'])}>Apply title</BuilderButton>
                                <BuilderButton variant="subtle" className="text-xs" onClick={() => onApply(suggestion, ['description'])}>Apply description</BuilderButton>
                                <BuilderButton className="text-xs" onClick={() => onApply(suggestion, ['title', 'description'])}>Apply both</BuilderButton>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
