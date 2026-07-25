import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getPlatformHomePath,
    hasPlatformPermission
} from '../utils/platformAccess';

const RequirePlatformPermission = ({ permission, children }) => {
    const { user } = useAuth();
    if (hasPlatformPermission(user, permission)) return children;
    return <Navigate to={getPlatformHomePath(user)} replace />;
};

export default RequirePlatformPermission;
