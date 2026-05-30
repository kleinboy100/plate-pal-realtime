import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useIsRestaurantOwner } from '@/hooks/useIsRestaurantOwner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Clock, Loader2, CalendarIcon, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay, differenceInDays, addDays, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  deliveriesRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

const DELIVERY_FEE = 25;

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
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(45, 93%, 47%)',
  confirmed: 'hsl(200, 98%, 39%)',
  preparing: 'hsl(262, 83%, 58%)',
  ready: 'hsl(142, 71%, 45%)',
  out_for_delivery: 'hsl(24, 95%, 53%)',
  delivered: 'hsl(142, 76%, 36%)',
  cancelled: 'hsl(0, 84%, 60%)',
  declined: 'hsl(0, 70%, 40%)',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'declined', label: 'Declined' },
];

const PAYMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All payments' },
  { value: 'online', label: 'Online payment' },
  { value: 'cash', label: 'Cash on delivery' },
];

const FULFILLMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'delivery', label: 'Deliveries' },
  { value: 'collection', label: 'Collection' },
];

export default function RestaurantAnalytics() {
  const { user } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsRestaurantOwner();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    deliveriesRevenue: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);

  useEffect(() => {
    if (!ownerLoading && !isOwner) navigate('/');
  }, [isOwner, ownerLoading, navigate]);

  useEffect(() => {
    if (user && isOwner) fetchRestaurants();
  }, [user, isOwner]);

  useEffect(() => {
    if (selectedRestaurant && dateRange?.from) fetchAnalytics();
  }, [selectedRestaurant, dateRange, statusFilter, paymentFilter, fulfillmentFilter]);

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('owner_id', user?.id);
    setRestaurants(data || []);
    if (data?.[0]) setSelectedRestaurant(data[0].id);
  };

  const fetchAnalytics = async () => {
    if (!selectedRestaurant || !dateRange?.from) return;
    setLoading(true);

    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to ?? dateRange.from);
    const days = Math.max(1, differenceInDays(to, from) + 1);

    let query = supabase
      .from('orders')
      .select('id, total_amount, delivery_fee, status, created_at, order_type')
      .eq('restaurant_id', selectedRestaurant)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString());

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (paymentFilter !== 'all') {
      query = query.eq('payment_method', paymentFilter);
    }
    if (fulfillmentFilter !== 'all') {
      query = query.eq('order_type', fulfillmentFilter);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      return;
    }

    const orderList = orders || [];

    const nonCancelled = orderList.filter(o => o.status !== 'cancelled' && o.status !== 'declined');
    const grossRevenue = nonCancelled.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const deliveriesRevenue = nonCancelled
      .filter(o => o.order_type === 'delivery')
      .reduce((sum, o) => sum + Number(o.delivery_fee ?? 0), 0);
    const totalRevenue = grossRevenue - deliveriesRevenue;
    const completedOrders = orderList.filter(o => o.status === 'delivered').length;
    const cancelledOrders = orderList.filter(o => o.status === 'cancelled' || o.status === 'declined').length;
    const pendingOrders = orderList.filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
    ).length;
    const revenueOrders = orderList.length - cancelledOrders;

    setStats({
      totalOrders: orderList.length,
      totalRevenue,
      deliveriesRevenue,
      averageOrderValue: revenueOrders > 0 ? totalRevenue / revenueOrders : 0,
      pendingOrders,
      completedOrders,
      cancelledOrders,
    });

    const dailyMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const date = format(addDays(from, i), 'MMM dd');
      dailyMap.set(date, { orders: 0, revenue: 0 });
    }
    orderList.forEach(order => {
      const date = format(new Date(order.created_at), 'MMM dd');
      const existing = dailyMap.get(date);
      if (existing) {
        existing.orders += 1;
        if (order.status !== 'cancelled' && order.status !== 'declined') {
          const fee = order.order_type === 'delivery' ? DELIVERY_FEE : 0;
          existing.revenue += Number(order.total_amount) - fee;
        }
      }
    });
    setDailyData(Array.from(dailyMap.entries()).map(([date, d]) => ({ date, ...d })));

    const statusMap = new Map<string, number>();
    orderList.forEach(o => statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1));
    setStatusData(
      Array.from(statusMap.entries()).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
        count,
        fill: STATUS_COLORS[status] || 'hsl(var(--muted))',
      }))
    );

    setLoading(false);
  };

  const handleDownloadPDF = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    setDownloading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const restaurantName = restaurants.find(r => r.id === selectedRestaurant)?.name || 'Restaurant';
      const margin = 8;
      const headerHeight = 18;

      const renderSection = async (el: HTMLElement, isFirst: boolean) => {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        const availableWidth = pdfWidth - margin * 2;
        const availableHeight = pdfHeight - headerHeight - margin;
        const ratio = Math.min(availableWidth / (canvas.width / 2), availableHeight / (canvas.height / 2));
        const imgWidth = (canvas.width / 2) * ratio;
        const imgHeight = (canvas.height / 2) * ratio;
        if (!isFirst) pdf.addPage();
        pdf.setFontSize(14);
        pdf.text(`${restaurantName} – Analytics`, margin, 10);
        pdf.setFontSize(10);
        pdf.text(dateLabel, margin, 16);
        const x = (pdfWidth - imgWidth) / 2;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, headerHeight, imgWidth, imgHeight);
      };

      await renderSection(page1Ref.current, true);
      await renderSection(page2Ref.current, false);

      pdf.save(`analytics-${restaurantName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'Downloaded', description: 'Analytics report saved.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Download failed', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const dateLabel = dateRange?.from
    ? dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
      : format(dateRange.from, 'MMM d, yyyy')
    : 'Pick a date';

  if (ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!isOwner) return null;

  return (
    <div className="min-h-screen py-4 md:py-8 overflow-x-hidden">
      <div className="container mx-auto px-3 md:px-4 max-w-6xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link to="/restaurant/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="font-display text-xl md:text-2xl font-bold">Analytics</h1>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading || loading}
            className="ml-auto rounded-xl"
            size="sm"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Download PDF</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full sm:w-[280px] justify-start text-left font-normal',
                  !dateRange?.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by payment" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
          <div ref={page1Ref} className="bg-background p-2">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
              <Card><CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><ShoppingBag size={20} className="text-primary" /></div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.totalOrders}</p>
                  </div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10"><DollarSign size={20} className="text-green-600" /></div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Revenue</p>
                    <p className="text-xl md:text-2xl font-bold">R{stats.totalRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10"><DollarSign size={20} className="text-orange-600" /></div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Deliveries Revenue</p>
                    <p className="text-xl md:text-2xl font-bold">R{stats.deliveriesRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp size={20} className="text-blue-600" /></div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Avg. Order</p>
                    <p className="text-xl md:text-2xl font-bold">R{stats.averageOrderValue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10"><Clock size={20} className="text-yellow-600" /></div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl md:text-2xl font-bold">{stats.pendingOrders}</p>
                  </div>
                </div>
              </CardContent></Card>
            </div>

            <div className="grid md:grid-cols-1 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Orders Over Time</CardTitle>
                  <CardDescription>Daily order count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
                    <BarChart data={dailyData} margin={{ left: -10, right: 10 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>

          <div ref={page2Ref} className="bg-background p-2 mt-4">
            <div className="grid gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Revenue Over Time</CardTitle>
                  <CardDescription>Daily revenue (ZAR)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px] w-full min-w-0">
                    <LineChart data={dailyData} margin={{ left: -10, right: 10 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg">Order Status Distribution</CardTitle>
                  <CardDescription>Breakdown by order status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px] w-full md:w-1/2 min-w-0">
                      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={60} label={false}>
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-3">
                      {statusData.map((item) => (
                        <div key={item.status} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="text-sm">{item.status}: {item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
