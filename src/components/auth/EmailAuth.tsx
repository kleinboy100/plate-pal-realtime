import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';

interface EmailAuthProps {
  onSuccess: () => void;
  nextPath?: string;
}

export function EmailAuth({ onSuccess, nextPath = '/' }: EmailAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { toast } = useToast();

  const getRedirectUrl = () => `${window.location.origin}${nextPath.startsWith('/') ? nextPath : '/' + nextPath}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const redirectUrl = getRedirectUrl();

    try {
      if (isLogin) {
        // Try password login first for better UX
        const { error: passwordError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (passwordError) {
          // If password fails, try magic link
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: redirectUrl,
            }
          });
          
          if (error) {
            toast({
              title: "Error signing in",
              description: "Invalid email or password",
              variant: "destructive"
            });
          } else {
            setEmailSent(true);
            toast({
              title: "Check your email",
              description: "We sent you a confirmation link. Click the link to sign in."
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in."
          });
          onSuccess();
        }
      } else {
        // For signup, send magic link for email verification
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectUrl,
            data: { 
              full_name: fullName,
            }
          }
        });
        
        if (error) {
          toast({
            title: "Error signing up",
            description: error.message,
            variant: "destructive"
          });
        } else {
          setEmailSent(true);
          toast({
            title: "Verify your email",
            description: "We sent you a confirmation link. Click the link to complete registration."
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to {isLogin ? 'sign in' : 'complete your registration'}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEmailSent(false);
            setEmail('');
          }}
          className="text-sm text-primary hover:underline font-medium"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isLogin && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              required={!isLogin}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            required
            minLength={6}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isLogin ? 'Or we\'ll send you a magic link to sign in' : 'Set a password for your account'}
        </p>
      </div>

      <Button 
        type="submit" 
        className="w-full btn-primary h-12"
        disabled={loading}
      >
        {loading ? 'Loading...' : (
          <>
            {isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight className="ml-2" size={18} />
          </>
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary hover:underline font-medium text-sm"
        >
          {isLogin 
            ? "Don't have an account? Sign up" 
            : "Already have an account? Sign in"}
        </button>
      </div>
    </form>
  );
}
