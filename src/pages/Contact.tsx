import { SiteFooter } from '@/components/SiteFooter';
import { Mail, MapPin, Clock, MessageSquare } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Contact us</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          We would rather hear from you than have you sit with a problem. Whether it is a question
          about an order, a delivery area we do not cover yet, or feedback on the food, reach us here.
        </p>

        <div className="space-y-5">
          <div className="flex gap-3 items-start bg-card rounded-2xl p-4 border border-border">
            <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">Email</h2>
              <p className="text-muted-foreground text-sm">
                <a className="hover:text-primary" href="mailto:mozksolutions@gmail.com">mozksolutions@gmail.com</a><br />
                We reply to most emails within one business day.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-card rounded-2xl p-4 border border-border">
            <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">About a live order</h2>
              <p className="text-muted-foreground text-sm">
                Open the order from your Orders page and use the built-in chat. It goes straight to
                the kitchen and to your driver, and it is the fastest way to reach us.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-card rounded-2xl p-4 border border-border">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">Where we are</h2>
              <p className="text-muted-foreground text-sm">
                Jouberton, Klerksdorp, North West, South Africa. Collection orders are picked up
                from our kitchen; the exact pick-up details appear on your order once confirmed.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start bg-card rounded-2xl p-4 border border-border">
            <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">Trading hours</h2>
              <p className="text-muted-foreground text-sm">
                Open daily 10:00 – 18:00. The status banner on the home page shows whether we are
                accepting orders right now.
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
