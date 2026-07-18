import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { EmailAuth } from '@/components/auth/EmailAuth';
import { GoogleAuth } from '@/components/auth/GoogleAuth';
import heroFood from '@/assets/hero-food.jpg';

function sanitizeNext(raw: string | null): string {
  if (!raw) return '/';
  // Only allow same-origin relative paths (must start with a single "/").
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function Auth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get('next'));

  useEffect(() => {
    if (user) {
      window.location.href = next;
    }
  }, [user, next]);

  const handleSuccess = () => {
    window.location.href = next;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden">
              <img src={heroFood} alt="Nosty's Fresh Fast Food" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to continue ordering delicious food
            </p>
          </div>

          <GoogleAuth nextPath={next} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">Or continue with email</span>
            </div>
          </div>

          <EmailAuth onSuccess={handleSuccess} nextPath={next} />
        </div>
      </div>
    </div>
  );
}
