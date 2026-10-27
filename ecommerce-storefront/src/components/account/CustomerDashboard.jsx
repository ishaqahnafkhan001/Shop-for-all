"use client";
import SharedDashboard from '@scaleup/storefront-renderer/presentation/AccountDashboardView';
import { SecurityTab } from './CustomerTabs';
export default function CustomerDashboard(props) { return <SharedDashboard {...props} SecurityComponent={SecurityTab} />; }
