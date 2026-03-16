import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Upload, X } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean | null;
  image_url: string | null;
}

interface MenuManagerProps {
  restaurantId: string;
}

const categories = ['Dagwoods', 'Kota Menu', 'Loafds', 'Chips', 'Combo Menu', 'Tops'];

export function MenuManager({ restaurantId }: MenuManagerProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Mains',
    is_available: true,
    image_url: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantId]);

  const fetchMenuItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('category', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load menu items', variant: 'destructive' });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: 'Mains', is_available: true, image_url: '' });
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      is_available: item.is_available ?? true,
      image_url: item.image_url || '',
    });
    setImageFile(null);
    setImagePreview(item.image_url || null);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Image must be less than 5MB', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setForm({ ...form, image_url: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${restaurantId}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast({ title: 'Missing fields', description: 'Please fill in name and price', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      let imageUrl = form.image_url;

      // Upload new image if selected
      if (imageFile) {
        setUploading(true);
        try {
          imageUrl = await uploadImage(imageFile) || '';
        } catch (uploadErr) {
          toast({ title: 'Upload failed', description: 'Failed to upload image', variant: 'destructive' });
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: form.name,
            description: form.description || null,
            price: parseFloat(form.price),
            category: form.category,
            is_available: form.is_available,
            image_url: imageUrl || null,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: 'Updated', description: 'Menu item updated successfully' });
      } else {
        // Insert new item
        const { error } = await supabase
          .from('menu_items')
          .insert({
            restaurant_id: restaurantId,
            name: form.name,
            description: form.description || null,
            price: parseFloat(form.price),
            category: form.category,
            is_available: form.is_available,
            image_url: imageUrl || null,
          });

        if (error) throw error;
        toast({ title: 'Added', description: 'Menu item added successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchMenuItems();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Menu item removed' });
      fetchMenuItems();
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update availability', variant: 'destructive' });
    } else {
      fetchMenuItems();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">Menu Items ({items.length})</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" onClick={openAddDialog}>
              <Plus size={16} className="mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Pap & Wors"
                />
              </div>
              <div>
                <Label>Price (ZAR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="45.00"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this dish..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Meal Picture</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="mt-2 relative inline-block">
                    <div className="rounded-md overflow-hidden border h-24 w-24">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} className="mr-2" />
                    Upload Image
                  </Button>
                )}
                {uploading && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Uploading...
                  </p>
                )}
              </div>
              <div>
                <Label>Category</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Available for ordering</Label>
                <Switch
                  checked={form.is_available}
                  onCheckedChange={checked => setForm({ ...form, is_available: checked })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  {editingItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 card-elevated">
          <p className="text-muted-foreground mb-4">No menu items yet</p>
          <Button className="btn-primary" onClick={openAddDialog}>
            <Plus size={16} className="mr-2" /> Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded">{item.category}</span>
                  </TableCell>
                  <TableCell>R{item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_available ?? true}
                      onCheckedChange={() => toggleAvailability(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
