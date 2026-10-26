import { Layers3 } from 'lucide-react';
import './report-workspace.css';

const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#e11d48', '#64748b'];
const number = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function ReportHeader({ eyebrow, title, description, children }) {
    return <header className="report-hero">
        <div className="report-hero-content">
            <p className="report-eyebrow"><Layers3 size={14} aria-hidden="true" />{eyebrow}</p>
            <h1>{title}</h1>
            <p className="report-description">{description}</p>
            {children && <div className="report-hero-actions">{children}</div>}
        </div>
    </header>;
}

export function ChartPanel({ title, description, children, className = '', aside }) {
    return <section className={`report-panel ${className}`}><div className="report-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{aside}</div>{children}</section>;
}

// Visible labels are also the accessible data representation; decorative charts are hidden from AT.
export function RankedBars({ items = [], unit = '', signed = false, empty = 'No recorded activity in this period.' }) {
    const maximum = Math.max(0, ...items.map(item => Math.abs(Number(item.value) || 0)));
    if (!items.length || !maximum) return <p className="report-chart-empty">{empty}</p>;
    return <ul className="report-bars">{items.map((item, index) => {
        const value = Number(item.value) || 0;
        const width = Math.abs(value) / maximum * (signed ? 50 : 100);
        return <li key={`${item.label}-${index}`}><div className="report-bar-label"><span>{item.label}</span><strong>{number(value)}{unit && ` ${unit}`}</strong></div><div className={`report-bar-track ${signed ? 'report-bar-signed' : ''}`} aria-hidden="true"><span style={{ width: `${width}%`, left: signed ? `${value < 0 ? 50 - width : 50}%` : 0, background: item.color || colors[index % colors.length] }} /></div>{item.detail && <p className="report-bar-detail">{item.detail}</p>}</li>;
    })}</ul>;
}

export function DistributionRing({ items = [], label = 'Total' }) {
    const entries = items.filter(item => Number(item.value) > 0);
    const total = entries.reduce((sum, item) => sum + Number(item.value), 0);
    if (!total) return <p className="report-chart-empty">No recorded data in this period.</p>;
    return <div className="report-distribution"><div className="report-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="46" fill="none" stroke="#eef2f7" strokeWidth="12" />{entries.map((item, index) => {
        const fraction = Number(item.value) / total * 100;
        const start = entries.slice(0, index).reduce((sum, entry) => sum + Number(entry.value), 0) / total * 100;
        return <circle key={`${item.label}-${index}`} cx="60" cy="60" r="46" fill="none" stroke={item.color || colors[index % colors.length]} strokeWidth="12" pathLength="100" strokeDasharray={`${fraction} ${100 - fraction}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />;
    })}</svg><div><strong>{number(total)}</strong><span>{label}</span></div></div><ul className="report-ring-legend">{entries.map((item, index) => <li key={`${item.label}-${index}`}><span className="report-dot" style={{ background: item.color || colors[index % colors.length] }} aria-hidden="true" /><span>{item.label}</span><strong>{number(item.value)} <small>({(Number(item.value) / total * 100).toFixed(1)}%)</small></strong></li>)}</ul></div>;
}

export function InventoryMovementChart({ data = [] }) {
    const rows = data.slice(-7);
    const maximum = Math.max(0, ...rows.flatMap(row => [Math.abs(Number(row.stockIn) || 0), Math.abs(Number(row.stockOut) || 0)]));
    if (!maximum) return <p className="report-chart-empty">Stock movements appear after orders, returns or inventory updates.</p>;
    return <div><div className="report-chart-legend"><span><i className="report-dot bg-emerald-600" />Stock in</span><span><i className="report-dot bg-amber-600" />Stock out</span></div><ul className="report-bars">{rows.map(row => <li key={row.date}>
        <div className="report-bar-label"><span>{row.date}</span><strong>{number(Math.abs(row.stockIn || 0))} in · {number(Math.abs(row.stockOut || 0))} out</strong></div>
        <div className="space-y-1" aria-hidden="true">{[{ value: row.stockIn, color: '#059669' }, { value: row.stockOut, color: '#d97706' }].map((item, index) => <div key={index} className="report-bar-track"><span style={{ width: `${Math.abs(Number(item.value) || 0) / maximum * 100}%`, background: item.color }} /></div>)}</div>
    </li>)}</ul></div>;
}
