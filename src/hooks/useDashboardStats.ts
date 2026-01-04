import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from './useProfile';

export interface DashboardStats {
    monthlySales: number;
    totalOrders: number;
    pendingEstimates: number; // SENT status
    conversionRate: number;
    salesTrend: {
        labels: string[];
        data: number[];
    };
    recentActivities: {
        id: string;
        type: 'ESTIMATE' | 'ORDER';
        title: string;
        status: string;
        date: string;
        amount: number;
        clientName: string;
    }[];
}

export function useDashboardStats() {
    const { profile } = useProfile();
    const companyId = profile?.company_id;
    const [stats, setStats] = useState<DashboardStats>({
        monthlySales: 0,
        totalOrders: 0,
        pendingEstimates: 0,
        conversionRate: 0,
        salesTrend: { labels: [], data: [] },
        recentActivities: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId) return;

        const fetchStats = async () => {
            try {
                setLoading(true);
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

                // 1. Monthly Sales & Total Orders (Current Month)
                // Actually, "Total Orders" might usually mean "All time" or "This Year". Let's do "This Month" for now to match the card context usually.
                // Or maybe "Active Orders" (not shipped).
                // Let's stick to "This Month's Sales" and "Total Pending Orders" or similar.
                // For simplicity based on request: "Monthly Sales" and "Total Orders (Count)"

                // Fetch all orders for trend calculation (last 6 months)
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // 5 months ago + current = 6
                sixMonthsAgo.setDate(1);

                const { data: orders, error: ordersError } = await supabase
                    .from('orders')
                    .select('id, total_amount, order_date, status, po_no, clients(name)')
                    .eq('company_id', companyId)
                    .gte('order_date', sixMonthsAgo.toISOString())
                    .order('order_date', { ascending: false });

                if (ordersError) throw ordersError;

                // Fetch Estimates for stats
                const { data: estimates, error: estimatesError } = await supabase
                    .from('estimates')
                    .select('id, total_amount, created_at, status, project_name, clients(name)')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(10); // For recent activity

                if (estimatesError) throw estimatesError;

                // --- Calculations ---

                // 1. Monthly Sales (This Month)
                const currentMonthSales = orders
                    ?.filter(o => new Date(o.order_date) >= new Date(now.getFullYear(), now.getMonth(), 1))
                    .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

                // 2. Active/Total Orders? Let's show "Ongoing Orders" (not completed/shipped if we had that status, but for now just count of this month or all active)
                // Let's use "Orders this month" count
                const currentMonthOrderCount = orders
                    ?.filter(o => new Date(o.order_date) >= new Date(now.getFullYear(), now.getMonth(), 1))
                    .length || 0;

                // 3. Pending Estimates (All time SENT status)
                const { count: pendingCount } = await supabase
                    .from('estimates')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', companyId)
                    .eq('status', 'SENT');

                // 4. Conversion Rate (Orders / Estimates this month? or All time?)
                // Let's do a rough all-time calculation or just based on fetched subset if performance is concern.
                // For accurate conversion, we need total estimates.
                // Let's simplified: (Orders This Month / Estimates Created This Month) * 100
                // We need to fetch estimates created this month.
                const { count: estimatesThisMonth } = await supabase
                    .from('estimates')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', companyId)
                    .gte('created_at', startOfMonth);

                const conversionRate = estimatesThisMonth ? Math.round((currentMonthOrderCount / estimatesThisMonth) * 100) : 0;


                // 5. Sales Trend (Last 6 months)
                const trendLabels = [];
                const trendData = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const label = `${d.getMonth() + 1}월`;

                    trendLabels.push(label);

                    // Filter orders for this month
                    const monthSum = orders
                        ?.filter(o => {
                            const od = new Date(o.order_date);
                            return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
                        })
                        .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

                    trendData.push(monthSum);
                }

                // 6. Recent Activities (Combine Orders and Estimates)
                // We have `orders` (last 6 months) and `estimates` (limit 10).
                // Combine top 5 sorted by date.
                const recentOrders = orders?.slice(0, 5).map(o => ({
                    id: o.id,
                    type: 'ORDER' as const,
                    title: o.po_no || '(발주번호 없음)',
                    status: o.status,
                    date: o.order_date,
                    amount: o.total_amount,
                    clientName: Array.isArray(o.clients) ? o.clients[0]?.name : (o.clients as any)?.name || '-'
                })) || [];

                const recentEstimates = estimates?.slice(0, 5).map(e => ({
                    id: e.id,
                    type: 'ESTIMATE' as const,
                    title: e.project_name || '(무제)',
                    status: e.status,
                    date: e.created_at,
                    amount: e.total_amount,
                    clientName: Array.isArray(e.clients) ? e.clients[0]?.name : (e.clients as any)?.name || '-'
                })) || [];

                const combinedActivity = [...recentOrders, ...recentEstimates]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);


                setStats({
                    monthlySales: currentMonthSales,
                    totalOrders: currentMonthOrderCount,
                    pendingEstimates: pendingCount || 0,
                    conversionRate,
                    salesTrend: {
                        labels: trendLabels,
                        data: trendData
                    },
                    recentActivities: combinedActivity
                });

            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [companyId]);

    return { stats, loading };
}
