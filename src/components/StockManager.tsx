import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StockItem {
  id: string;
  item_name: string;
  current_stock: number | null;
  min_stock: number | null;
  max_stock: number | null;
  restaurant_id: string | null;
}

interface StockManagerProps {
  restaurantId: string;
}

export function StockManager({ restaurantId }: StockManagerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [form, setForm] = useState({ item_name: '', current_stock: '', min_stock: '10', max_stock: '100' });

  useEffect(() => { fetchStock(); }, [restaurantId]);

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('item_name', { ascending: true });
    if (error) {
      toast({ title: 'Error', description: 'Failed to load stock', variant: 'destructive' });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const syncIngredientStock = async (itemName: string, currentStock: number) => {
    // Sync current_stock to ingredient_stock table
    const { data: existing } = await supabase
      .from('ingredient_stock')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('ingredient_name', itemName)
      .maybeSingle();

    if (existing) {
      await supabase.from('ingredient_stock')
        .update({ current_stock: currentStock, last_updated: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('ingredient_stock').insert({
        restaurant_id: restaurantId,
        ingredient_name: itemName,
        current_stock: currentStock,
        unit: 'piece',
      });
    }
  };

  const resetForm = () => {
    setForm({ item_name: '', current_stock: '', min_stock: '10', max_stock: '100' });
    setEditingItem(null);
  };

  const openEdit = (item: StockItem) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name,
      current_stock: (item.current_stock ?? 0).toString(),
      min_stock: (item.min_stock ?? 10).toString(),
      max_stock: (item.max_stock ?? 100).toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.item_name || !form.current_stock) {
      toast({ title: 'Missing fields', description: 'Fill name and current stock', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const currentStock = parseInt(form.current_stock);
      if (editingItem) {
        const { error } = await supabase.from('stock').update({
          item_name: form.item_name,
          current_stock: currentStock,
          min_stock: parseInt(form.min_stock) || 10,
          max_stock: parseInt(form.max_stock) || 100,
        }).eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Stock item updated' });
      } else {
        const { error } = await supabase.from('stock').insert({
          restaurant_id: restaurantId,
          item_name: form.item_name,
          current_stock: currentStock,
          min_stock: parseInt(form.min_stock) || 10,
          max_stock: parseInt(form.max_stock) || 100,
        });
        if (error) throw error;
        toast({ title: 'Added', description: 'Stock item added' });
      }
      // Sync to ingredient_stock
      await syncIngredientStock(form.item_name, currentStock);
      setDialogOpen(false);
      resetForm();
      fetchStock();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stock item?')) return;
    const { error } = await supabase.from('stock').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchStock();
    }
  };

  const getStockStatus = (item: StockItem) => {
    const current = item.current_stock ?? 0;
    const min = item.min_stock ?? 10;
    if (current <= 0) return 'out';
    if (current <= min) return 'low';
    return 'ok';
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  const lowStockCount = items.filter(i => getStockStatus(i) !== 'ok').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-primary" />
          <h2 className="font-semibold text-lg">Stock ({items.length})</h2>
          {lowStockCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle size={12} className="mr-1" /> {lowStockCount} low
            </Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus size={16} className="mr-1" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Stock Item' : 'Add Stock Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Item Name *</Label>
                <Input value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} placeholder="e.g. Burger Patty" />
              </div>
              <div>
                <Label>Current Stock *</Label>
                <Input type="number" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Stock (alert)</Label>
                  <Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} />
                </div>
                <div>
                  <Label>Max Stock</Label>
                  <Input type="number" value={form.max_stock} onChange={e => setForm({ ...form, max_stock: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 btn-primary" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin mr-2" />}
                  {editingItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 card-elevated">
          <p className="text-muted-foreground mb-3">No stock items yet</p>
          <Button className="btn-primary" size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus size={16} className="mr-1" /> Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                    <TableCell className="text-sm">{item.current_stock ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.min_stock ?? 10}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.max_stock ?? 100}</TableCell>
                    <TableCell>
                      {status === 'out' && <Badge variant="destructive" className="text-xs">Out</Badge>}
                      {status === 'low' && <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">Low</Badge>}
                      {status === 'ok' && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">OK</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
