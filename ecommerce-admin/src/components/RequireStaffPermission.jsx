import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasStaffPermission, STAFF_PERMISSION_LABELS } from '../utils/staffPermissions';

const RequireStaffPermission = ({ permission, children }) => {
    const { user } = useAuth();

    if (hasStaffPermission(user, permission)) {
        return children;
    }

    const label = STAFF_PERMISSION_LABELS[permission] || 'this section';

    return (
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center p-6 text-center sm:p-10">
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-600">
                <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-slate-950">Access not available</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Your staff account does not have permission to open {label}. Ask the store owner to update your staff access if you need this section.
            </p>
            <Link
                to="/dashboard/products"
                className="mt-6 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
                Back to dashboard
            </Link>
        </div>
    );
};

export default RequireStaffPermission;
