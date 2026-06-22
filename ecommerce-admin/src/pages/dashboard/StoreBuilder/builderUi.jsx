import { Monitor, Smartphone, Tablet } from 'lucide-react';

export const BuilderButton = ({ children, variant = 'primary', className = '', type = 'button', ...props }) => {
    const variants = {
        primary: 'bg-slate-950 text-white hover:bg-slate-800 border-slate-950',
        secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
        subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-100',
        danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200'
    };

    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export const HelpText = ({ children, tone = 'neutral' }) => (
    <p className={`text-xs leading-5 ${tone === 'error' ? 'text-red-600' : 'text-slate-500'}`}>{children}</p>
);

export const FieldShell = ({ label, help, error, children }) => (
    <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {children}
        {error ? <HelpText tone="error">{error}</HelpText> : help ? <HelpText>{help}</HelpText> : null}
    </label>
);

export const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

export const BuilderInput = ({ label, help, error, ...props }) => (
    <FieldShell label={label} help={help} error={error}>
        <input className={inputClass} {...props} />
    </FieldShell>
);

export const BuilderTextarea = ({ label, help, error, ...props }) => (
    <FieldShell label={label} help={help} error={error}>
        <textarea className={`${inputClass} min-h-24 resize-y`} {...props} />
    </FieldShell>
);

export const BuilderSelect = ({ label, help, error, children, ...props }) => (
    <FieldShell label={label} help={help} error={error}>
        <select className={inputClass} {...props}>{children}</select>
    </FieldShell>
);

export const BuilderToggle = ({ label, help, checked, onChange, disabled = false }) => (
    <label className={`flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <span>
            <span className="block text-sm font-semibold text-slate-800">{label}</span>
            {help && <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>}
        </span>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
        />
    </label>
);

export const BuilderCard = ({ title, description, icon: Icon, children, actions }) => (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
                {Icon && (
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                        <Icon size={18} />
                    </span>
                )}
                <div>
                    <h2 className="text-base font-bold text-slate-950">{title}</h2>
                    {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
                </div>
            </div>
            {actions}
        </div>
        <div className="space-y-4">{children}</div>
    </section>
);

export const DeviceSwitcher = ({ value, onChange }) => {
    const devices = [
        { id: 'desktop', label: 'Desktop', icon: Monitor },
        { id: 'tablet', label: 'Tablet', icon: Tablet },
        { id: 'mobile', label: 'Phone', icon: Smartphone },
        { id: 'smallMobile', label: 'Small', icon: Smartphone }
    ];

    return (
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1">
            {devices.map((device) => {
                const Icon = device.icon;
                const active = value === device.id;
                return (
                    <button
                        key={device.id}
                        type="button"
                        aria-pressed={active}
                        aria-label={`Preview ${device.label}`}
                        title={`Preview ${device.label}`}
                        onClick={() => onChange(device.id)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <Icon size={15} />
                        <span className="hidden sm:inline">{device.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
