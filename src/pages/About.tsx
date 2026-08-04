import { SiteFooter } from '@/components/SiteFooter';

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-4">About Nosty'$ Fresh Fast Food</h1>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          Nosty'$ Fresh Fast Food is a family-run kasi kitchen based in Jouberton, Klerksdorp, in the
          North West province of South Africa. We started with a simple idea: a proper kota should be
          made fresh in front of you, packed generously, and reach your door while it is still hot.
          Everything on our menu is prepared to order, never pre-made and never reheated.
        </p>

        <h2 className="font-display text-xl font-bold text-foreground mt-8 mb-3">What we cook</h2>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          Our menu is built around six categories that regulars know by heart:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-4">
          <li><strong className="text-foreground">Kota Menu</strong> — the classic quarter loaf, hollowed out and layered with chips, atchar, polony, russian, cheese and your choice of extras.</li>
          <li><strong className="text-foreground">Dagwoods</strong> — a stacked, sliced-bread build for anyone who wants more filling than bread.</li>
          <li><strong className="text-foreground">Loafs</strong> — full and half loaf sharing options for families and groups.</li>
          <li><strong className="text-foreground">Chips</strong> — hand-cut, double-fried slap chips with vinegar and spice.</li>
          <li><strong className="text-foreground">Tops</strong> — the extras that finish a kota: cheese, russian, vienna, egg, mince and more.</li>
          <li><strong className="text-foreground">Combo Menu</strong> — meal-and-drink bundles at a better price than ordering separately.</li>
        </ul>

        <h2 className="font-display text-xl font-bold text-foreground mt-8 mb-3">How ordering works</h2>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          Browse the menu, add what you want to your cart and choose delivery or collection. Every
          order is reviewed and confirmed by our kitchen before you pay, so you are never charged for
          something we cannot make. Once confirmed you can pay by card through our secure checkout or
          choose cash on delivery. From there you can follow the order live: accepted, being prepared,
          out for delivery, and delivered. You can also chat directly with the kitchen or your driver
          inside the order screen if you need to add directions or change something.
        </p>

        <h2 className="font-display text-xl font-bold text-foreground mt-8 mb-3">Delivery area</h2>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          We deliver across Jouberton and its extensions, Alabama, Kanana and the greater Klerksdorp
          area. Delivery fees are calculated from your address and shown clearly on your order
          summary before you confirm, alongside your meals total and the total due. Collection is
          always free from our kitchen.
        </p>

        <h2 className="font-display text-xl font-bold text-foreground mt-8 mb-3">Our standards</h2>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          We buy fresh bread daily, keep our stock rotated, and track every ingredient used against
          every meal sold so nothing sits too long. Our drivers are part of the team, not strangers,
          and they carry your order in insulated bags so it arrives at the temperature it left in.
          If something is ever wrong with an order, tell us in the order chat and we will make it right.
        </p>

        <h2 className="font-display text-xl font-bold text-foreground mt-8 mb-3">Trading hours</h2>
        <p className="text-muted-foreground leading-relaxed">
          We are open from 10:00 to 18:00. The banner on our home page always shows whether the
          kitchen is currently accepting orders, so you never have to guess.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
