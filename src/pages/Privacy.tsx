import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <header className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: January 06, 2026</p>
          </div>
        </header>

        <article className="space-y-4 text-sm md:text-base text-foreground/90 leading-relaxed">
          <p>
            This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
          </p>
          <p>
            We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
          </p>

          <h2 className="font-semibold text-xl mt-6">Interpretation and Definitions</h2>
          <p>The words whose initial letters are capitalized have meanings defined under the following conditions.</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account</strong> means a unique account created for You to access our Service.</li>
            <li><strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party.</li>
            <li><strong>Application</strong> refers to Nosty's, the software program provided by the Company.</li>
            <li><strong>Company</strong> refers to MOZK Solutions (pty) ltd.</li>
            <li><strong>Country</strong> refers to: South Africa</li>
            <li><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</li>
            <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
            <li><strong>Service</strong> refers to the Application.</li>
            <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company.</li>
            <li><strong>Usage Data</strong> refers to data collected automatically.</li>
            <li><strong>You</strong> means the individual accessing or using the Service.</li>
          </ul>

          <h2 className="font-semibold text-xl mt-6">Collecting and Using Your Personal Data</h2>
          <p><strong>Personal Data</strong> we may collect: Email address, First and last name, Phone number, Address (State, Province, ZIP/Postal code, City), Usage Data.</p>
          <p><strong>Usage Data</strong> is collected automatically and may include IP address, browser type/version, pages visited, time spent, device identifiers, and diagnostic data.</p>
          <p>While using Our Application, with Your prior permission, we may collect information regarding Your location, and pictures/information from Your Device's camera and photo library. You can enable or disable access through Your Device settings.</p>

          <h2 className="font-semibold text-xl mt-6">Use of Your Personal Data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and maintain our Service.</li>
            <li>To manage Your Account and registration.</li>
            <li>For the performance of a contract relating to Your purchases.</li>
            <li>To contact You via email, calls, SMS, or push notifications.</li>
            <li>To provide news, special offers, and information about similar goods/services unless You opt out.</li>
            <li>To manage Your requests.</li>
            <li>For business transfers (mergers, acquisitions, etc.).</li>
            <li>For data analysis, usage trends, and improving our Service.</li>
          </ul>

          <h2 className="font-semibold text-xl mt-6">Sharing Your Information</h2>
          <p>We may share Your information with Service Providers, Affiliates, business partners, other users (in public areas), in business transfers, or with Your consent.</p>

          <h2 className="font-semibold text-xl mt-6">Retention &amp; Transfer</h2>
          <p>We retain Personal Data only as long as necessary for the purposes set out in this Policy or to comply with our legal obligations. Your information may be transferred to and maintained on computers located outside Your jurisdiction. We take all steps reasonably necessary to ensure Your data is treated securely.</p>

          <h2 className="font-semibold text-xl mt-6">Delete Your Personal Data</h2>
          <p>You have the right to delete or request deletion of Personal Data We have collected. You may update or delete information from Your account settings, or contact Us directly.</p>

          <h2 className="font-semibold text-xl mt-6">Disclosure</h2>
          <p>We may disclose Your Personal Data in business transactions, to law enforcement when legally required, to comply with legal obligations, protect our rights/property, prevent wrongdoing, protect user safety, or defend against legal liability.</p>

          <h2 className="font-semibold text-xl mt-6">Security</h2>
          <p>While We strive to use commercially reasonable means to protect Your Personal Data, no method of transmission over the Internet or electronic storage is 100% secure.</p>

          <h2 className="font-semibold text-xl mt-6">Third-Party Services</h2>
          <p>We use Google Places to return information about places. Information gathered is held in accordance with Google's Privacy Policy.</p>

          <h2 className="font-semibold text-xl mt-6">Children's Privacy</h2>
          <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under 13.</p>

          <h2 className="font-semibold text-xl mt-6">Links to Other Websites</h2>
          <p>Our Service may contain links to other websites not operated by Us. We have no control over and assume no responsibility for their content or privacy practices.</p>

          <h2 className="font-semibold text-xl mt-6">Changes to this Privacy Policy</h2>
          <p>We may update Our Privacy Policy from time to time. We will notify You via email and/or a prominent notice on Our Service prior to changes becoming effective.</p>

          <h2 className="font-semibold text-xl mt-6">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, You can contact us through the in-app support channels.</p>
        </article>
      </div>
    </div>
  );
}
