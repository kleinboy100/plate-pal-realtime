import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Share, Plus, Check } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const Install = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore – iOS Safari
      window.navigator.standalone === true;
    setInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Install Nosty's App</h1>
          <p className="text-muted-foreground">
            Get the Nosty's Fresh Fast Food app on your phone for faster ordering and a full-screen experience.
          </p>
        </header>

        {installed && (
          <Card className="p-4 flex items-center gap-3 border-primary/40 bg-primary/10">
            <Check className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium">App is installed. Open it from your home screen.</p>
          </Card>
        )}

        {!installed && deferred && (
          <Card className="p-6 text-center space-y-4">
            <p className="font-medium">Tap below to install Nosty's on your device.</p>
            <Button size="lg" onClick={handleInstall} className="w-full">
              <Download className="mr-2 h-5 w-5" /> Install App
            </Button>
          </Card>
        )}

        {!installed && !deferred && platform === "ios" && (
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Install on iPhone / iPad</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Open this page in <strong>Safari</strong> (not Chrome).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span className="flex items-center gap-1 flex-wrap">
                  Tap the <Share className="inline h-4 w-4" /> <strong>Share</strong> button at the bottom.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span className="flex items-center gap-1 flex-wrap">
                  Scroll down and tap <Plus className="inline h-4 w-4" /> <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <span>Tap <strong>Add</strong>. The Nosty's icon will appear on your home screen.</span>
              </li>
            </ol>
          </Card>
        )}

        {!installed && !deferred && platform === "android" && (
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Install on Android</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>Open this page in <strong>Chrome</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>Tap the <strong>⋮</strong> menu (top right).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <span>Confirm and the app icon will appear on your home screen.</span>
              </li>
            </ol>
          </Card>
        )}

        {!installed && !deferred && platform === "desktop" && (
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-lg">Install on Desktop</h2>
            <p className="text-sm text-muted-foreground">
              In Chrome or Edge, click the install icon in the address bar, or open this page on your phone to install it as a mobile app.
            </p>
          </Card>
        )}

        <Card className="p-4 bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Note: The install option only appears on the live published site, not inside the editor preview.
          </p>
        </Card>
      </div>
    </main>
  );
};

export default Install;
