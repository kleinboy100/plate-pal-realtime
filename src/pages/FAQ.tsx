import { SiteFooter } from '@/components/SiteFooter';

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Most deliveries in Jouberton and the surrounding extensions arrive within 30 to 60 minutes of the kitchen confirming your order. Busy evenings and weekends can run a little longer. The live tracker on your order page shows the current stage and an estimated arrival time based on the actual driving route to your address.',
  },
  {
    q: 'How is my delivery fee worked out?',
    a: 'Fees are based on the distance from our kitchen to your address. Addresses within 5 km of Nosty\u2019s pay a standard fee, Alabama has its own flat fee, and longer trips are charged per distance travelled. Whatever the outcome, the exact fee is shown on your cart and on your order summary next to your meals total and total due before you commit.',
  },
  {
    q: 'Can I collect instead of having it delivered?',
    a: 'Yes. Choose Collection at checkout and no delivery fee is added. We will notify you the moment your order is ready so it is still hot when you arrive.',
  },
  {
    q: 'How do I pay?',
    a: 'After the kitchen confirms your order you can pay securely by card, or select cash on delivery and pay the driver. We never take payment before the kitchen has accepted your order.',
  },
  {
    q: 'Why must the restaurant confirm my order first?',
    a: 'It protects you. If we are out of an ingredient or already at capacity, we decline the order before any money moves, instead of taking payment and cancelling afterwards.',
  },
  {
    q: 'Can I change or cancel my order?',
    a: 'Message us in the order chat as soon as possible. If the kitchen has not started preparing your food we will change or cancel it. Once cooking has started we usually cannot cancel, because the meal is made fresh for you.',
  },
  {
    q: 'What if my order arrives wrong or late?',
    a: 'Tell us in the order chat straight away and include a photo if something is missing. We will replace the item, credit it against your next order, or refund it depending on what happened.',
  },
  {
    q: 'Do I need the app to order?',
    a: 'No. Everything works in your browser. If you order often you can install our app to your home screen for faster access and order notifications.',
  },
  {
    q: 'Are your prices in Rand?',
    a: 'Yes, every price on the site is in South African Rand and includes what you see on the menu. Delivery is the only extra and it is always itemised separately.',
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Delivery information & FAQ</h1>
        <p className="text-muted-foreground mb-8">
          Answers to the questions our customers in Jouberton, Alabama, Kanana and Klerksdorp ask most.
        </p>
        <div className="space-y-6">
          {faqs.map((f) => (
            <section key={f.q}>
              <h2 className="font-semibold text-lg text-foreground mb-1.5">{f.q}</h2>
              <p className="text-muted-foreground leading-relaxed">{f.a}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
