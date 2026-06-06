const variantClasses = {
    primary: 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
    danger: 'border-transparent bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
    ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400',
};

const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
};

const Button = ({
    children,
    type = "button",
    isLoading = false,
    disabled = false,
    onClick,
    variant = 'primary',
    size = 'md',
    className = '',
}) => {
    const isDisabled = isLoading || disabled;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
        >
            {isLoading ? (
                <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;
