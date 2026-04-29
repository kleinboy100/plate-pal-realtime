import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck } from 'lucide-react';

interface PrivacyPolicyDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function PrivacyPolicyDialog({ open, onAccept, onDecline }: PrivacyPolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDecline(); }}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Privacy Policy</DialogTitle>
              <DialogDescription className="text-xs">Last updated: January 06, 2026</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] px-6 py-4">
          <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
            <p>
              This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.
            </p>
            <p>
              We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
            </p>

            <h3 className="font-semibold text-base mt-4">Interpretation and Definitions</h3>
            <p>The words whose initial letters are capitalized have meanings defined under the following conditions.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account</strong> means a unique account created for You to access our Service.</li>
              <li><strong>Affiliate</strong> means an entity that controls, is controlled by, or is under common control with a party.</li>
              <li><strong>Application</strong> refers to KasiConnect, the software program provided by the Company.</li>
              <li><strong>Company</strong> refers to MOZK Solutions (pty) ltd.</li>
              <li><strong>Country</strong> refers to: South Africa</li>
              <li><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</li>
              <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
              <li><strong>Service</strong> refers to the Application.</li>
              <li><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company.</li>
              <li><strong>Usage Data</strong> refers to data collected automatically.</li>
              <li><strong>You</strong> means the individual accessing or using the Service.</li>
            </ul>

            <h3 className="font-semibold text-base mt-4">Collecting and Using Your Personal Data</h3>
            <p><strong>Personal Data</strong> we may collect: Email address, First and last name, Phone number, Address (State, Province, ZIP/Postal code, City), Usage Data.</p>
            <p><strong>Usage Data</strong> is collected automatically and may include IP address, browser type/version, pages visited, time spent, device identifiers, and diagnostic data.</p>
            <p>While using Our Application, with Your prior permission, we may collect information regarding Your location, and pictures/information from Your Device's camera and photo library. You can enable or disable access through Your Device settings.</p>

            <h3 className="font-semibold text-base mt-4">Use of Your Personal Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain our Service.</li>
              <li>To manage Your Account and registration.</li>
              <li>For the performance of a contract relating to Your purchases.</li>
              <li>To contact You via email, calls, SMS, or push notifications.</li>
              <li>To provide news, special offers, and information about similar goods/services unless You opt out.</li>
              <li>To manage Your requests.</li>
              <li>For business transfers (mergers, acquisitions, etc.).</li>
              <li>For data analysis, usage trends, and improving our Service.</li>
            </ul>

            <h3 className="font-semibold text-base mt-4">Sharing Your Information</h3>
            <p>We may share Your information with Service Providers, Affiliates, business partners, other users (in public areas), in business transfers, or with Your consent.</p>

            <h3 className="font-semibold text-base mt-4">Retention &amp; Transfer</h3>
            <p>We retain Personal Data only as long as necessary for the purposes set out in this Policy or to comply with our legal obligations. Your information may be transferred to and maintained on computers located outside Your jurisdiction. We take all steps reasonably necessary to ensure Your data is treated securely.</p>

            <h3 className="font-semibold text-base mt-4">Delete Your Personal Data</h3>
            <p>You have the right to delete or request deletion of Personal Data We have collected. You may update or delete information from Your account settings, or contact Us directly.</p>

            <h3 className="font-semibold text-base mt-4">Disclosure</h3>
            <p>We may disclose Your Personal Data in business transactions, to law enforcement when legally required, to comply with legal obligations, protect our rights/property, prevent wrongdoing, protect user safety, or defend against legal liability.</p>

            <h3 className="font-semibold text-base mt-4">Security</h3>
            <p>While We strive to use commercially reasonable means to protect Your Personal Data, no method of transmission over the Internet or electronic storage is 100% secure.</p>

            <h3 className="font-semibold text-base mt-4">Third-Party Services</h3>
            <p>We use Google Places to return information about places. Information gathered is held in accordance with Google's Privacy Policy.</p>

            <h3 className="font-semibold text-base mt-4">Children's Privacy</h3>
            <p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under 13.</p>

            <h3 className="font-semibold text-base mt-4">Links to Other Websites</h3>
            <p>Our Service may contain links to other websites not operated by Us. We have no control over and assume no responsibility for their content or privacy practices.</p>

            <h3 className="font-semibold text-base mt-4">Changes to this Privacy Policy</h3>
            <p>We may update Our Privacy Policy from time to time. We will notify You via email and/or a prominent notice on Our Service prior to changes becoming effective.</p>

            <h3 className="font-semibold text-base mt-4">Contact Us</h3>
            <p>If you have any questions about this Privacy Policy, You can contact us through the in-app support channels.</p>
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            By accepting, you agree to the collection and use of your information as described above.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onDecline}>
              Decline
            </Button>
            <Button className="flex-1 btn-primary" onClick={onAccept}>
              Agree &amp; Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
