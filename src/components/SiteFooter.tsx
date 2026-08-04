import { Link } from 'react-router-dom';

export const SiteFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-card border-t border-border mt-8">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <h2 className="font-display font-bold text-foreground mb-2">Nosty'$ Fresh Fast Food</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Freshly made kotas, dagwoods and loafs prepared to order in Jouberton, Klerksdorp,
              with delivery across the North West.
            </p>
          </div>
          <nav aria-label="Footer" className="text-sm">
            <h3 className="font-semibold text-foreground mb-2">Explore</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link className="hover:text-primary transition-colors" to="/">Menu</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/about">About us</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/faq">Delivery & FAQ</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/install">Install the app</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal" className="text-sm">
            <h3 className="font-semibold text-foreground mb-2">Company</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><Link className="hover:text-primary transition-colors" to="/contact">Contact</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/privacy">Privacy policy</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/terms">Terms of service</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/delete-account">Delete my account</Link></li>
            </ul>
          </nav>
        </div>
        <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
          © {year} Nosty'$ Fresh Fast Food, Jouberton, Klerksdorp, South Africa. All prices in South African Rand (ZAR).
        </p>
      </div>
    </footer>
  );
};
