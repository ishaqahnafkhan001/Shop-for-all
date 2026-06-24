import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FEATURE_LABELS, FEATURE_MESSAGES, hasFeature } from '../utils/featureAccess';

const LockedFeature = ({ feature }) => {
    const label = FEATURE_LABELS[feature] || 'This feature';
    const message = FEATURE_MESSAGES[feature] || 'This feature is not enabled for your store.';

    return (
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center p-6 text-center sm:p-10">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
                <LockKeyhole className="h-8 w-8" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-slate-950">{label} is not available</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {message} Contact support or upgrade your plan to use it.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                    to="/dashboard/settings"
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                    View settings
                </Link>
                <a
                    href="mailto:support@scaleup.codes"
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                    Contact support
                </a>
            </div>
        </div>
    );
};

const RequireFeature = ({ feature, children }) => {
    const { user } = useAuth();

    if (!hasFeature(user, feature)) {
        return <LockedFeature feature={feature} />;
    }

    return children;
};

export default RequireFeature;
