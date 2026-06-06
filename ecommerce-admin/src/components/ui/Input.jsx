const Input = ({
    label,
    id,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
    helperText = '',
    error = '',
    className = '',
    ...props
}) => {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="admin-label">
                {label}
                {required && <span className="ml-1 text-rose-600">*</span>}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={helperText || error ? `${id}-help` : undefined}
                className={`admin-input ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : ''} ${className}`}
                {...props}
            />
            {(helperText || error) && (
                <p id={`${id}-help`} className={`admin-help ${error ? 'text-rose-600' : ''}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
