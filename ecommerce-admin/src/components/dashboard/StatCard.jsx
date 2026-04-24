const StatCard = ({ title, value, icon: Icon, trend }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-md duration-200">
            <div className="p-4 rounded-full bg-indigo-50 text-indigo-600">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className="flex items-baseline space-x-2 mt-1">
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                    {trend && (
                        <span className={`text-sm font-semibold ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {trend}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatCard;