import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Narrow typed shim for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const authOAuth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOAuth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await authOAuth.approveAuthorization(authorizationId)
      : await authOAuth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl border p-6 space-y-3">
          <h1 className="text-xl font-semibold">Could not load this authorization request</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName: string = details.client?.name ?? details.client?.client_name ?? "an app";
  const redirectUri: string | undefined = details.client?.redirect_uris?.[0] ?? details.redirect_uri;
  const scopes: string[] = (details.requested_scopes ?? details.scopes ?? "openid email profile")
    .toString()
    .split(/\s+/)
    .filter(Boolean);

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-2xl border p-6 space-y-5 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Connect {clientName} to Nosty's</h1>
          <p className="text-sm text-muted-foreground">
            This lets {clientName} use Nosty's Fresh Fast Food as you.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div>
            <div className="font-medium">This app will be able to:</div>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>See your Nosty's profile and email</li>
              <li>See your orders and the menu you can already view in the app</li>
            </ul>
          </div>
          {redirectUri && (
            <div className="text-xs text-muted-foreground break-all">
              Redirects to: <span className="font-mono">{redirectUri}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Requested permissions: {scopes.join(", ")}
          </div>
          <div className="text-xs text-muted-foreground">
            This does not bypass Nosty's permissions or backend policies.
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            Approve
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
