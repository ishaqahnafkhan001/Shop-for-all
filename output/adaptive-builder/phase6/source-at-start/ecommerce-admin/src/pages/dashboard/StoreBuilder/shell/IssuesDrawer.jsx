import { AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { BuilderDrawer } from './BuilderDrawer.jsx';

const classifyIssue = (issue) => {
    const severity = String(issue?.severity || issue?.level || '').toLowerCase();
    if (severity === 'warning') return 'warnings';
    if (severity === 'suggestion' || severity === 'info') return 'suggestions';
    return 'errors';
};

const groups = [
    { id: 'errors', label: 'Errors', icon: AlertCircle, tone: 'text-red-700 bg-red-50 border-red-100' },
    { id: 'warnings', label: 'Warnings', icon: AlertTriangle, tone: 'text-amber-800 bg-amber-50 border-amber-100' },
    { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, tone: 'text-blue-700 bg-blue-50 border-blue-100' }
];

export function IssuesDrawer({ open, issues = [], onClose, onSelectIssue }) {
    return (
        <BuilderDrawer open={open} title="Storefront issues" description="Select an issue to open the relevant editor and field." onClose={onClose}>
            {issues.length === 0 ? (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No publish-blocking issues found.</div>
            ) : (
                <div className="space-y-5">
                    {groups.map(group => {
                        const rows = issues.filter(issue => classifyIssue(issue) === group.id);
                        if (!rows.length) return null;
                        const Icon = group.icon;
                        return (
                            <section key={group.id} aria-labelledby={`issue-group-${group.id}`}>
                                <h3 id={`issue-group-${group.id}`} className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950"><Icon size={16} /> {group.label} <span className="text-slate-400">{rows.length}</span></h3>
                                <div className="space-y-2">
                                    {rows.map((issue, index) => (
                                        <button key={`${issue.path || group.id}-${index}`} type="button" onClick={() => onSelectIssue(issue)} className={`min-h-11 w-full rounded-lg border p-3 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 ${group.tone}`}>
                                            <span className="block text-sm font-bold">{issue.message || 'Review this setting.'}</span>
                                            {issue.path && <span className="mt-1 block break-all text-xs opacity-75">{issue.path}</span>}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </BuilderDrawer>
    );
}
