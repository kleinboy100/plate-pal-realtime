import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Clock, Loader2, Filter } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
}

interface StatusData {
  status: string;
  count: number;
  fill: string;
}

const chartConfig: ChartConfig = {
  orders: { label: 'Orders', color: 'hsl(var(--primary))' },
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-2))' },
  pending: { label: 'Pending', color: 'hsl(45, 93%, 47%)' },
  confirmed: { label: 'Confirmed', color: 'hsl(200, 98%, 39%)' },
  preparing: { label: 'Preparing', color: 'hsl(262, 83%, 58%)' },
  ready: { label: 'Ready', color: 'hsl(142, 71%, 45%)' },
  delivered: { label: 'Delivered', color: 'hsl(142, 76%, 36%)' },
  cancelled: { label: 'Cancelled', color: 'hsl(0, 84%, 60%)' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(45, 93%, 47%)',
  confirmed: 'hsl(200, 98%, 39%)',
  preparing: 'hsl(262, 83%, 58%)',
  ready: 'hsl(142, 71%, 45%)',
  out_for_delivery: 'hsl(24, 95%, 53%)',
  delivered: 'hsl(142, 76%, 36%)',
  cancelled: 'hsl(0, 84%, 60%)',
};

const DATE_RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export default function RestaurantAnalytics() {
  const { user } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsRestaurantOwner();
  const navigate = useNavigate();
  
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('7');
  
  // Per-chart date range filters
  const [ordersChartRange, setOrdersChartRange] = useState<string>('7');
  const [revenueChartRange, setRevenueChartRange] = useState<string>('7');
  const [statusChartRange, setStatusChartRange] = useState<string>('7');
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  
  // Chart-specific data
  const [ordersChartData, setOrdersChartData] = useState<DailyData[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<DailyData[]>([]);
  const [statusChartData, setStatusChartData] = useState<StatusData[]>([]);

  useEffect(() => {
    if (!ownerLoading && !isOwner) {
      navigate('/');
    }
  }, [isOwner, ownerLoading, navigate]);

  useEffect(() => {
    if (user && isOwner) {
      fetchRestaurants();
    }
  }, [user, isOwner]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchAnalytics();
    }
  }, [selectedRestaurant, dateRange]);

  // Fetch chart-specific data when their filters change
  useEffect(() => {
    if (selectedRestaurant) {
      fetchChartData('orders', ordersChartRange);
    }
  }, [selectedRestaurant, ordersChartRange]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchChartData('revenue', revenueChartRange);
    }
  }, [selectedRestaurant, revenueChartRange]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchChartData('status', statusChartRange);
    }
  }, [selectedRestaurant, statusChartRange]);

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('owner_id', user?.id);
    setRestaurants(data || []);
    if (data?.[0]) setSelectedRestaurant(data[0].id);
  };

  const fetchChartData = async (chartType: 'orders' | 'revenue' | 'status', range: string) => {
    if (!selectedRestaurant) return;
    
    const days = parseInt(range);
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('restaurant_id', selectedRestaurant)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const orderList = orders || [];

    if (chartType === 'orders' || chartType === 'revenue') {
      const dailyMap = new Map<string, { orders: number; revenue: number }>();
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'MMM dd');
        dailyMap.set(date, { orders: 0, revenue: 0 });
      }

      orderList.forEach(order => {
        const date = format(new Date(order.created_at), 'MMM dd');
        const existing = dailyMap.get(date);
        if (existing) {
          existing.orders += 1;
          if (order.status !== 'cancelled') {
            existing.revenue += Number(order.total_amount);
          }
        }
      });

      const data = Array.from(dailyMap.entries()).map(([date, d]) => ({
        date,
        orders: d.orders,
        revenue: d.revenue,
      }));

      if (chartType === 'orders') {
        setOrdersChartData(data);
      } else {
        setRevenueChartData(data);
      }
    }

    if (chartType === 'status') {
      const statusMap = new Map<string, number>();
      orderList.forEach(order => {
        statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
      });

      setStatusChartData(
        Array.from(statusMap.entries()).map(([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
          count,
          fill: STATUS_COLORS[status] || 'hsl(var(--muted))',
        }))
      );
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedRestaurant) return;
    
    setLoading(true);
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days - 1));
    const endDate = endOfDay(new Date());

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('restaurant_id', selectedRestaurant)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      return;
    }

    const orderList = orders || [];
    
    // Calculate stats
    const totalRevenue = orderList
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    const completedOrders = orderList.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orderList.filter(o => o.status === 'cancelled').length;
    const pendingOrders = orderList.filter(o => 
      ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
    ).length;

    setStats({
      totalOrders: orderList.length,
      totalRevenue,
      averageOrderValue: orderList.length > 0 ? totalRevenue / (orderList.length - cancelledOrders || 1) : 0,
      pendingOrders,
      completedOrders,
      cancelledOrders,
    });

    // Group by day
    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'MMM dd');
      dailyMap.set(date, { orders: 0, revenue: 0 });
    }

    orderList.forEach(order => {
      const date = format(new Date(order.created_at), 'MMM dd');
      const existing = dailyMap.get(date);
      if (existing) {
        existing.orders += 1;
        if (order.status !== 'cancelled') {
          existing.revenue += Number(order.total_amount);
        }
      }
    });

    const dailyDataResult = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue,
    }));

    setDailyData(dailyDataResult);
    setOrdersChartData(dailyDataResult);
    setRevenueChartData(dailyDataResult);

    // Group by status
    const statusMap = new Map<string, number>();
    orderList.forEach(order => {
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
    });

    const statusDataResult = Array.from(statusMap.entries()).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
      count,
      fill: STATUS_COLORS[status] || 'hsl(var(--muted))',
    }));

    setStatusData(statusDataResult);
    setStatusChartData(statusDataResult);

    setLoading(false);
  };

  const ChartFilterSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-24 text-xs bg-muted/50 border-0">
        <Filter size={12} className="mr-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGE_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  return (
    <div className="min-h-screen py-4 md:py-8 overflow-x-hidden">
      <div className="container mx-auto px-3 md:px-4 max-w-6xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link to="/restaurant/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-display text-xl md:text-2xl font-bold">Analytics</h1>
        </div>

        {/* Global Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Select restaurant" />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShoppingBag size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-xl md:text-2xl font-bold">{stats.totalOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Revenue</p>
                      <p className="text-xl md:text-2xl font-bold">R{stats.totalRevenue.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Avg. Order</p>
                      <p className="text-xl md:text-2xl font-bold">R{stats.averageOrderValue.toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Clock size={20} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                      <p className="text-xl md:text-2xl font-bold">{stats.pendingOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {/* Orders Over Time */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg">Orders Over Time</CardTitle>
                      <CardDescription>Daily order count</CardDescription>
                    </div>
                    <ChartFilterSelect value={ordersChartRange} onChange={setOrdersChartRange} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
                    <BarChart data={ordersChartData} margin={{ left: -10, right: 10 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Revenue Over Time */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg">Revenue Over Time</CardTitle>
                      <CardDescription>Daily revenue (ZAR)</CardDescription>
                    </div>
                    <ChartFilterSelect value={revenueChartRange} onChange={setRevenueChartRange} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
                    <LineChart data={revenueChartData} margin={{ left: -10, right: 10 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))' }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Order Status Distribution */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base md:text-lg">Order Status Distribution</CardTitle>
                      <CardDescription>Breakdown by order status</CardDescription>
                    </div>
                    <ChartFilterSelect value={statusChartRange} onChange={setStatusChartRange} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px] w-full md:w-1/2 min-w-0">
                      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie
                          data={statusChartData}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label={false}
                        >
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-3">
                      {statusChartData.map((item) => (
                        <div key={item.status} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-sm">{item.status}: {item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
