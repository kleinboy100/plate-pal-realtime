import { Link } from 'react-router-dom';
import { Trash2, ArrowLeft, Mail } from 'lucide-react';

export default function DeleteAccount() {
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
            <Trash2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Delete Your Account</h1>
            <p className="text-sm text-muted-foreground">Nosty's — MOZK Solutions (pty) ltd</p>
          </div>
        </header>

        <article className="space-y-4 text-sm md:text-base text-foreground/90 leading-relaxed">
          <p>
            You can request the deletion of your Nosty's account and all associated
            personal data at any time. This page explains how to make that request and
            what happens to your data.
          </p>

          <h2 className="font-semibold text-xl mt-6">How to request deletion</h2>
          <p>
            Send an email to our support team from the email address linked to your
            account, with the subject line <strong>"Delete My Account"</strong>. We will
            verify your identity and process the request.
          </p>
          <a
            href="mailto:mozksolutions@gmail.com?subject=Delete%20My%20Account&body=Please%20delete%20my%20Nosty's%20account%20and%20all%20associated%20data."
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            <Mail className="w-4 h-4" />
            Email a deletion request
          </a>

          <h2 className="font-semibold text-xl mt-6">What gets deleted</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your account and login credentials</li>
            <li>Your profile information (name, email, phone number, addresses)</li>
            <li>Your saved preferences and notification settings</li>
          </ul>

          <h2 className="font-semibold text-xl mt-6">What may be retained</h2>
          <p>
            Certain records, such as completed order and payment history, may be retained
            for up to the period required by law (for example, for tax, accounting, and
            fraud-prevention purposes) before being permanently deleted. After this period,
            the data is securely and permanently removed.
          </p>

          <h2 className="font-semibold text-xl mt-6">Processing time</h2>
          <p>
            Deletion requests are typically completed within 30 days of verification. You
            will receive a confirmation email once your account and data have been deleted.
          </p>

          <p className="mt-6">
            Questions? Contact us at{' '}
            <a href="mailto:mozksolutions@gmail.com" className="text-primary underline">
              mozksolutions@gmail.com
            </a>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
