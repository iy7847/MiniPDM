import { supabase } from '../lib/supabaseClient';
import { MainLayout } from '../layouts/MainLayout';
import { PageHeader } from '../components/common/ui/PageHeader';
import { Card } from '../components/common/ui/Card';
import { Materials } from './Materials';
import { Clients } from './Clients';
import { Estimates } from './Estimates';
import { Settings } from './Settings';
import { Orders } from './Orders';
import { EstimateDetail } from './EstimateDetail';
import { OrderDetail } from './OrderDetail';
import { ShipmentList } from './ShipmentList';
import { ExpenseAnalysis } from './ExpenseAnalysis';
import { EstimateSearch } from './EstimateSearch'; // [New]
import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';

interface DashboardProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Dashboard({ currentPage, onNavigate }: DashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNavigateWithId = (page: string, id: string | null = null) => {
    setSelectedId(id);
    onNavigate(page);
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'materials':
        return <Materials />;
      case 'clients':
        return <Clients />;
      case 'estimates':
        return <Estimates onNavigate={handleNavigateWithId} />;
      case 'estimate-detail':
        return <EstimateDetail estimateId={selectedId} onBack={() => onNavigate('estimates')} onNavigate={handleNavigateWithId} />;
      case 'estimate-search':
        return <EstimateSearch onNavigate={handleNavigateWithId} />;
      case 'settings':
        return <Settings />;
      case 'orders':
        return <Orders onNavigate={handleNavigateWithId} />;
      case 'order-detail':
        return <OrderDetail orderId={selectedId} onBack={() => onNavigate('orders')} />;
      case 'shipments':
        return <ShipmentList onNavigate={handleNavigateWithId} />;
      case 'expense-analysis':
        return <ExpenseAnalysis />;
      case 'dashboard':
      default:
        return <DashboardHome onNavigate={handleNavigateWithId} />;
    }
  };

  return (
    <MainLayout
      currentPage={currentPage}
      onNavigate={onNavigate}
      onLogout={handleLogout}
    >
      {renderContent()}
    </MainLayout>
  );
}

// 대시보드 홈 화면
import { useDashboardStats } from '../hooks/useDashboardStats';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function DashboardHome({ onNavigate }: { onNavigate: (page: string, id?: string) => void }) {
  const { stats, loading } = useDashboardStats();
  const { profile } = useProfile(); // Assuming useProfile is available in scope or imported

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function (context: any) {
            return `매출: ₩${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#94a3b8',
          callback: function (value: any) {
            if (value >= 1000000) return '₩' + (value / 1000000).toFixed(0) + 'M';
            if (value >= 1000) return '₩' + (value / 1000).toFixed(0) + 'K';
            return '₩' + value;
          }
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          },
          color: '#64748b'
        },
        border: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  const chartData = {
    labels: stats.salesTrend.labels,
    datasets: [
      {
        fill: true,
        label: '월별 매출',
        data: stats.salesTrend.data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: 'rgb(59, 130, 246)',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  if (loading) return <div className="h-full flex items-center justify-center text-slate-400">데이터를 불러오는 중...</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <PageHeader
          title="대시보드"
          actions={
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 hidden sm:block">환영합니다, <strong>{profile?.email?.split('@')[0]}</strong>님</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('estimates')}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors"
                >
                  + 새 견적 작성
                </button>
                <button
                  onClick={() => onNavigate('orders')}
                  className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  수주 등록
                </button>
              </div>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl">💰</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">이번 달 매출</h3>
            <p className="text-2xl md:text-3xl font-black text-slate-800">
              ₩ {stats.monthlySales.toLocaleString()}
            </p>
            <div className="mt-2 flex items-center text-xs font-medium text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
              <span>이번 달 누적</span>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">신규 주문 (이번 달)</h3>
            <p className="text-2xl md:text-3xl font-black text-blue-600">
              {stats.totalOrders} <span className="text-lg text-slate-400 font-bold">건</span>
            </p>
            <div className="mt-2 text-xs text-slate-400">
              처리 대기 중인 주문을 확인하세요.
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl">📄</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">제출된 견적</h3>
            <p className="text-2xl md:text-3xl font-black text-orange-500">
              {stats.pendingEstimates} <span className="text-lg text-slate-400 font-bold">건</span>
            </p>
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded-full font-bold">
              회신 대기 중
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-default group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-4xl">📈</span>
            </div>
            <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">주문 전환율</h3>
            <p className="text-2xl md:text-3xl font-black text-indigo-600">
              {stats.conversionRate}%
            </p>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}></div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <Card className="h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-700">매출 추이</h3>
                  <p className="text-xs text-slate-400">최근 6개월 간의 매출 변화입니다.</p>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Line options={chartOptions} data={chartData} />
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-700">최근 활동</h3>
                <button onClick={() => onNavigate('estimates')} className="text-xs font-bold text-blue-600 hover:text-blue-700">전체보기</button>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 -mr-2 space-y-3">
                {stats.recentActivities.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    최근 활동 내역이 없습니다.
                  </div>
                ) : (
                  stats.recentActivities.map((activity) => (
                    <div
                      key={activity.id + activity.type}
                      onClick={() => onNavigate(activity.type === 'ESTIMATE' ? 'estimate-detail' : 'order-detail', activity.id)}
                      className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${activity.type === 'ORDER'
                          ? 'bg-purple-50 text-purple-600 border-purple-100'
                          : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                          {activity.type === 'ORDER' ? '수주' : '견적'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm mb-0.5 truncate group-hover:text-blue-700">{activity.title}</h4>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">{activity.clientName}</span>
                        <span className="font-bold text-slate-600">₩ {(activity.amount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}