const ResponsiveDataList = ({ desktop, mobile, className = '' }) => (
    <div className={className}>
        <div className="hidden md:block">{desktop}</div>
        <div className="md:hidden">{mobile}</div>
    </div>
);

export default ResponsiveDataList;
