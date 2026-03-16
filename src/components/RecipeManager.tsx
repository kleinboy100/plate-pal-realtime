import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, ChefHat } from 'lucide-react';

interface Recipe {
  id: string;
  meal_name: string;
  ingredient_name: string;
  quantity_per_meal: number;
  unit: string;
}

export function RecipeManager() {
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [form, setForm] = useState({ meal_name: '', ingredient_name: '', quantity_per_meal: '', unit: 'piece' });
  const [filterMeal, setFilterMeal] = useState('');

  useEffect(() => { fetchRecipes(); }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meal_recipes')
      .select('*')
      .order('meal_name', { ascending: true });
    if (error) {
      toast({ title: 'Error', description: 'Failed to load recipes', variant: 'destructive' });
    } else {
      setRecipes(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ meal_name: '', ingredient_name: '', quantity_per_meal: '', unit: 'piece' });
    setEditingRecipe(null);
  };

  const openEdit = (r: Recipe) => {
    setEditingRecipe(r);
    setForm({
      meal_name: r.meal_name,
      ingredient_name: r.ingredient_name,
      quantity_per_meal: r.quantity_per_meal.toString(),
      unit: r.unit,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.meal_name || !form.ingredient_name || !form.quantity_per_meal) {
      toast({ title: 'Missing fields', description: 'Fill all fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingRecipe) {
        const { error } = await supabase.from('meal_recipes').update({
          meal_name: form.meal_name,
          ingredient_name: form.ingredient_name,
          quantity_per_meal: parseFloat(form.quantity_per_meal),
          unit: form.unit,
        }).eq('id', editingRecipe.id);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Recipe updated' });
      } else {
        const { error } = await supabase.from('meal_recipes').insert({
          meal_name: form.meal_name,
          ingredient_name: form.ingredient_name,
          quantity_per_meal: parseFloat(form.quantity_per_meal),
          unit: form.unit,
        });
        if (error) throw error;
        toast({ title: 'Added', description: 'Recipe ingredient added' });
      }
      setDialogOpen(false);
      resetForm();
      fetchRecipes();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe ingredient?')) return;
    const { error } = await supabase.from('meal_recipes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      fetchRecipes();
    }
  };

  const mealNames = [...new Set(recipes.map(r => r.meal_name))].sort();
  const filtered = filterMeal ? recipes.filter(r => r.meal_name === filterMeal) : recipes;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <ChefHat size={20} className="text-primary" />
          <h2 className="font-semibold text-lg">Meal Recipes ({recipes.length})</h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus size={16} className="mr-1" /> Add Ingredient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecipe ? 'Edit Recipe Ingredient' : 'Add Recipe Ingredient'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Meal Name *</Label>
                <Input value={form.meal_name} onChange={e => setForm({ ...form, meal_name: e.target.value })} placeholder="e.g. Original Dagwood" list="meal-names" />
                <datalist id="meal-names">
                  {mealNames.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div>
                <Label>Ingredient Name *</Label>
                <Input value={form.ingredient_name} onChange={e => setForm({ ...form, ingredient_name: e.target.value })} placeholder="e.g. Bacon" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantity per Meal *</Label>
                  <Input type="number" step="0.1" value={form.quantity_per_meal} onChange={e => setForm({ ...form, quantity_per_meal: e.target.value })} />
                </div>
                <div>
                  <Label>Unit</Label>
                  <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['piece', 'slice', 'g', 'ml', 'portion', 'kg', 'litre'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="flex-1 btn-primary" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin mr-2" />}
                  {editingRecipe ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <select className="h-9 px-3 rounded-md border bg-background text-sm" value={filterMeal} onChange={e => setFilterMeal(e.target.value)}>
          <option value="">All Meals ({mealNames.length})</option>
          {mealNames.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 card-elevated"><p className="text-muted-foreground">No recipes found</p></div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meal</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.meal_name}</TableCell>
                  <TableCell className="text-sm">{r.ingredient_name}</TableCell>
                  <TableCell className="text-sm">{r.quantity_per_meal}</TableCell>
                  <TableCell className="text-sm">{r.unit}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></Button>
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
