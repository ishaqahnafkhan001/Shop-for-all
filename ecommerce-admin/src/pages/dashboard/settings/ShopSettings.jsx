import { useAuth } from '../../../context/AuthContext';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const ShopSettings = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-3xl space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">

                <div>
                    <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
                        General Information
                    </h2>
                    {/* FIX: was using // JS comments inside JSX which is invalid syntax */}
                    <div className="space-y-4">
                        <Input
                            id="shopName"
                            label="Store Name"
                            value={user?.shopName || ''}
                            readOnly
                        />
                        <Input
                            id="subdomain"
                            label="Store Subdomain"
                            value={user?.subdomain || ''}
                            readOnly
                        />
                        {user?.subdomain && (
                            <p className="text-sm text-gray-500 mt-1">
                                Your live store:{' '}
                                <strong>https://{user.subdomain}.scaleup.com</strong>
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
                        Admin Profile
                    </h2>
                    <div className="space-y-4">
                        <Input id="adminName"  label="Full Name"      value={user?.fullName || ''} readOnly />
                        <Input id="adminEmail" label="Email Address"  value={user?.email    || ''} readOnly />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <Button className="w-auto px-6">Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

export default ShopSettings;