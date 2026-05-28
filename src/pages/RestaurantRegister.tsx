import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MenuItemForm, MenuItemData } from '@/components/MenuItemForm';
import { DocumentUpload } from '@/components/DocumentUpload';
import { AddressAutocomplete, type AddressLocation } from '@/components/AddressAutocomplete';
import { ChevronLeft, ChevronRight, Store, UtensilsCrossed, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const cuisineTypes = ['Kasi Food', 'Braai & Grill', 'Bunny Chow', 'Pap & Vleis', 'Gatsby', 'Vetkoek', 'Shisanyama', 'Traditional', 'Fast Food', 'Pizza', 'Chicken', 'Seafood'];

const steps = [
  { id: 1, title: 'Basic Info', icon: Store },
  { id: 2, title: 'Verification', icon: ShieldCheck },
  { id: 3, title: 'Menu Items', icon: UtensilsCrossed },
  { id: 4, title: 'Complete', icon: Check },
];

export default function RestaurantRegister() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    cuisine_type: '', 
    address: '', 
    phone: '',
    id_number: ''
  });
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);
  const [addressCoords, setAddressCoords] = useState<AddressLocation | null>(null);

  const validateStep1 = () => {
    if (!form.name || !form.cuisine_type || !form.address) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.id_number || form.id_number.length < 6) {
      toast({ title: 'Invalid ID', description: 'Please enter a valid ID number', variant: 'destructive' });
      return false;
    }
    if (!idDocument) {
      toast({ title: 'Missing document', description: 'Please upload your ID document', variant: 'destructive' });
      return false;
    }
    if (!selfiePhoto) {
      toast({ title: 'Missing selfie', description: 'Please upload a selfie for verification', variant: 'destructive' });
      return false;
    }
    if (!proofOfAddress) {
      toast({ title: 'Missing proof of address', description: 'Please upload proof of address', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (menuItems.length === 0) {
      toast({ title: 'No menu items', description: 'Please add at least one menu item', variant: 'destructive' });
      return false;
    }
    for (const item of menuItems) {
      if (!item.name || !item.price) {
        toast({ title: 'Incomplete items', description: 'Please fill in name and price for all menu items', variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const uploadDocument = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('restaurant-documents')
      .upload(path, file);
    
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    if (!user) { navigate('/auth'); return; }
    
    setLoading(true);

    try {
      // Upload verification documents
      const userId = user.id;
      const timestamp = Date.now();
      
      await Promise.all([
        uploadDocument(idDocument!, `${userId}/id-document-${timestamp}`),
        uploadDocument(selfiePhoto!, `${userId}/selfie-${timestamp}`),
        uploadDocument(proofOfAddress!, `${userId}/proof-of-address-${timestamp}`)
      ]);
    
      // Create restaurant with coordinates if available
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({ 
          name: form.name,
          description: form.description,
          cuisine_type: form.cuisine_type,
          address: form.address,
          phone: form.phone,
          owner_id: user.id,
          latitude: addressCoords?.lat || null,
          longitude: addressCoords?.lng || null
        })
        .select()
        .single();

      if (restaurantError) {
        throw restaurantError;
      }

      // Create menu items
      if (menuItems.length > 0) {
        const itemsToInsert = menuItems.map(item => ({
          restaurant_id: restaurant.id,
          name: item.name,
          description: item.description,
          price: parseFloat(item.price) || 0,
          category: item.category,
          is_available: true,
        }));

        const { error: itemsError } = await supabase
          .from('menu_items')
          .insert(itemsToInsert);

        if (itemsError) {
          toast({ title: 'Warning', description: 'Restaurant created but some menu items failed to save', variant: 'destructive' });
        }
      }

      setLoading(false);
      toast({ title: 'Success!', description: 'Your takeaway has been registered' });
      navigate('/restaurant/dashboard');
    } catch (error: any) {
      setLoading(false);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="font-display text-3xl font-bold mb-2">Register Your Takeaway</h1>
        <p className="text-muted-foreground mb-8">Join KasiConnect and start receiving orders</p>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep >= step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      isCurrent && "ring-4 ring-primary/20"
                    )}
                  >
                    <Icon size={20} />
                  </div>
                  <span className={cn(
                    "text-xs mt-2 font-medium text-center hidden sm:block",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 md:mx-4",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <div className="card-elevated p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4">Basic Information</h2>
              <div>
                <Label>Takeaway / Restaurant Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mama's Kitchen, Kasi Grill"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell customers about your food..."
                />
              </div>
              <div>
                <Label>Cuisine Type *</Label>
                <Select value={form.cuisine_type} onValueChange={v => setForm({ ...form, cuisine_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select cuisine" /></SelectTrigger>
                  <SelectContent>
                    {cuisineTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Address *</Label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(address) => setForm({ ...form, address })}
                  onCoordinatesChange={setAddressCoords}
                  placeholder="Search for your address"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 011 123 4567"
                />
              </div>
            </div>
          )}

          {/* Step 2: Verification Documents */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-lg mb-2">Identity Verification</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  We need to verify your identity to ensure the safety and trust of our platform.
                </p>
              </div>

              <div>
                <Label>ID Number *</Label>
                <Input
                  required
                  value={form.id_number}
                  onChange={e => setForm({ ...form, id_number: e.target.value })}
                  placeholder="Enter your ID number"
                  maxLength={13}
                />
              </div>

              <DocumentUpload
                label="ID Document"
                description="Upload a clear photo of your ID document (front side)"
                accept="image/*,.pdf"
                value={idDocument}
                onChange={setIdDocument}
                icon="document"
                required
              />

              <DocumentUpload
                label="Selfie for Verification"
                description="Take a selfie holding your ID document next to your face"
                accept="image/*"
                value={selfiePhoto}
                onChange={setSelfiePhoto}
                icon="camera"
                required
              />

              <DocumentUpload
                label="Proof of Address"
                description="Upload a utility bill, bank statement, or lease agreement (not older than 3 months)"
                accept="image/*,.pdf"
                value={proofOfAddress}
                onChange={setProofOfAddress}
                icon="document"
                required
              />
            </div>
          )}

          {/* Step 3: Menu Items */}
          {currentStep === 3 && (
            <div>
              <h2 className="font-semibold text-lg mb-4">Add Your Menu</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Add the dishes you offer. You can always update these later.
              </p>
              <MenuItemForm items={menuItems} onChange={setMenuItems} />
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check size={40} className="text-primary" />
              </div>
              <h2 className="font-semibold text-xl mb-2">Ready to Launch!</h2>
              <p className="text-muted-foreground mb-6">
                Review your details and submit to start receiving orders.
              </p>
              
              <div className="text-left bg-muted/50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">{form.name}</h3>
                <p className="text-sm text-muted-foreground">{form.cuisine_type} • {form.address}</p>
                <p className="text-sm mt-2">{menuItems.length} menu items</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                  <ShieldCheck size={16} />
                  <span>Verification documents uploaded</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={prevStep}>
                <ChevronLeft size={18} className="mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}
            
            {currentStep < 4 ? (
              <Button className="btn-primary" onClick={nextStep}>
                Next <ChevronRight size={18} className="ml-1" />
              </Button>
            ) : (
              <Button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
