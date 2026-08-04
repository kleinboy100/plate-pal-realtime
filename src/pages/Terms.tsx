import { SiteFooter } from '@/components/SiteFooter';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Terms of service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: August 2026</p>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">1. Who we are</h2>
          <p className="text-muted-foreground leading-relaxed">
            This website and app are operated by Nosty'$ Fresh Fast Food, a food business based in
            Jouberton, Klerksdorp, North West, South Africa. By placing an order you agree to these terms.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">2. Accounts</h2>
          <p className="text-muted-foreground leading-relaxed">
            You need an account to place an order so that we can contact you and show you your order
            history. Keep your login details private. You are responsible for orders placed from your
            account. You can delete your account at any time from the Delete account page.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">3. Orders and acceptance</h2>
          <p className="text-muted-foreground leading-relaxed">
            Submitting an order is an offer to buy, not a completed sale. Our kitchen reviews and
            confirms every order first. A contract is formed only once we confirm it. If we cannot
            fulfil an order we will decline it and you will not be charged.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">4. Prices, fees and payment</h2>
          <p className="text-muted-foreground leading-relaxed">
            All prices are in South African Rand. Your order summary itemises the meals total, the
            delivery fee and the total due before you pay. Delivery fees depend on your delivery
            address and distance. Card payments are processed by our payment provider; we do not
            store your card details. Cash on delivery is paid directly to the driver.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">5. Delivery and collection</h2>
          <p className="text-muted-foreground leading-relaxed">
            Delivery times are estimates and can be affected by weather, traffic, load shedding and
            demand. It is your responsibility to give a complete, correct address and to be reachable.
            If a driver cannot reach you or the address after reasonable attempts, the order may be
            treated as delivered and no refund will be due.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">6. Cancellations and refunds</h2>
          <p className="text-muted-foreground leading-relaxed">
            Because meals are prepared fresh to order, cancellation is only possible before
            preparation begins. If your order is wrong, incomplete or not of acceptable quality,
            contact us through the order chat on the same day and we will replace, credit or refund
            the affected items. This does not affect your rights under the Consumer Protection Act 68 of 2008.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">7. Allergens and food safety</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our kitchen handles bread, dairy, egg, soya and processed meats, so we cannot guarantee
            that any item is free of a specific allergen. If you have an allergy, tell us in the order
            notes before ordering. Food should be consumed soon after delivery.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">8. Acceptable use</h2>
          <p className="text-muted-foreground leading-relaxed">
            Do not use this service to place fraudulent or abusive orders, harass our staff or
            drivers in chat, or attempt to interfere with the security of the platform. We may
            suspend accounts that do.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">9. Advertising</h2>
          <p className="text-muted-foreground leading-relaxed">
            Some pages may display third-party advertising, including Google AdSense. Advertisers and
            their partners may use cookies to serve ads based on your visits to this and other sites.
            You can manage your ad settings through Google's Ads Settings. See our privacy policy for detail.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-semibold text-lg text-foreground mb-2">10. Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the extent permitted by South African law, our liability arising from an order is
            limited to the value of that order. We are not liable for indirect or consequential loss.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-lg text-foreground mb-2">11. Changes and contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update these terms; the date above shows the latest version. Questions can be sent
            to busta.d2@gmail.com.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
