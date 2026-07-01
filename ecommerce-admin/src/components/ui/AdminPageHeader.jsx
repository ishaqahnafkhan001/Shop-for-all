const AdminPageHeader = ({
    eyebrow = '',
    title,
    description,
    action = null,
    className = ''
}) => (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
        <div className="min-w-0">
            {eyebrow && (
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                    {eyebrow}
                </p>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {title}
            </h1>
            {description && (
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                    {description}
                </p>
            )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

export default AdminPageHeader;
