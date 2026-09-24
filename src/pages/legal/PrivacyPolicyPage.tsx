import { LegalLayout } from './LegalLayout'

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="September 24, 2026">
      <p>
        This Privacy Policy explains how Yorde What Store ("we," "us," or "our") collects, uses, shares, and protects
        personal data in connection with our multi-tenant e-commerce platform (the "Service").
      </p>

      <section>
        <h2>1. Scope</h2>
        <p>This Policy covers two categories of people whose data we process:</p>
        <ul>
          <li>
            <strong>Merchants</strong> — businesses and individuals who register for an account to create and operate
            a Store on the Service.
          </li>
          <li>
            <strong>Customers</strong> — people who visit or place an order on a Merchant's Store hosted on the
            Service.
          </li>
        </ul>
        <p className="mt-2">
          For Customer data, Yorde What Store generally acts as a <strong>service provider / data processor</strong>{' '}
          on behalf of the Merchant, who controls their own Store and decides what to collect and how to use it for
          their business. For Merchant account data (i.e., data about the business itself and its staff), Yorde What
          Store acts as the <strong>data controller</strong>.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p className="font-medium text-gray-900">From Merchants (account data):</p>
        <ul>
          <li>Name, email address, phone number, and password (stored as a salted hash, never in plain text);</li>
          <li>
            Store details you provide: store name, tagline, description, logo/banner images, social links, currency,
            timezone, tax and shipping configuration;
          </li>
          <li>
            Payment processor credentials you connect (e.g., Stripe or MercadoPago keys) and messaging bot
            credentials (e.g., Telegram bot token), which are encrypted at rest;
          </li>
          <li>Billing information for your own subscription to the Service, processed by our payment processor;</li>
          <li>Two-factor authentication (TOTP) secrets, if you enable 2FA;</li>
          <li>Support communications you send us.</li>
        </ul>

        <p className="mt-4 font-medium text-gray-900">
          From Customers (collected on behalf of, and controlled by, the Merchant):
        </p>
        <ul>
          <li>Name, email, phone number, and shipping/billing address provided at checkout or account registration;</li>
          <li>Order history, order contents, and order status;</li>
          <li>Account credentials, if the Customer creates a storefront account;</li>
          <li>Coupon codes used.</li>
        </ul>

        <p className="mt-4 font-medium text-gray-900">Automatically collected (both Merchants and Customers):</p>
        <ul>
          <li>
            Log and device data: IP address, browser type, and pages visited, including basic storefront
            visit/traffic data used to power the Merchant's dashboard analytics;
          </li>
          <li>
            Cookies or similar technologies used for authentication (session/refresh tokens) and, where enabled,
            basic analytics.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Information</h2>
        <p>We use personal data to:</p>
        <ul>
          <li>
            Provide, operate, and maintain the Service, including authenticating accounts and enforcing tenant data
            isolation between Merchants;
          </li>
          <li>
            Process and fulfill orders, including passing necessary order and payment details to the applicable
            payment processor (Stripe and/or MercadoPago, depending on the Store's configuration) to complete a
            transaction;
          </li>
          <li>
            Send transactional communications: order confirmations, password resets, account notifications, and —
            where a Merchant has enabled it — order-fulfillment messages sent via WhatsApp or Telegram to the
            Merchant, or transactional email to the Customer;
          </li>
          <li>Provide the Merchant's dashboard analytics (sales, traffic, stock);</li>
          <li>Maintain the security and integrity of the Service, including backups, fraud prevention, and abuse detection;</li>
          <li>Comply with legal obligations and enforce our Terms of Service;</li>
          <li>Improve and develop the Service.</li>
        </ul>
        <p className="mt-2">We do not sell personal data.</p>
      </section>

      <section>
        <h2>4. How We Share Information</h2>
        <p>We share personal data only as necessary to provide the Service, with:</p>
        <ul>
          <li>
            <strong>Payment processors</strong> (currently Stripe and/or MercadoPago, depending on the Store's
            configuration) — to process payments and payouts. Each processor's own privacy policy governs its
            handling of payment data.
          </li>
          <li>
            <strong>Messaging and email providers</strong> (WhatsApp Business / Telegram Bot API, and our
            transactional email provider) — solely to deliver order and account notifications a Merchant has
            configured.
          </li>
          <li>
            <strong>Infrastructure and hosting providers</strong> — to run the Service, including S3-compatible
            object storage used for encrypted, access-controlled database backups.
          </li>
          <li>
            <strong>Merchants</strong>, with respect to their own Customers' data collected through their Store —
            this is inherent to how the Service works (a Store needs to see its own orders and customers) and is the
            Merchant's responsibility to handle lawfully.
          </li>
          <li>
            <strong>Legal and safety purposes</strong> — if required by law, subpoena, or to protect the rights,
            property, or safety of Yorde What Store, our users, or the public.
          </li>
          <li>
            <strong>Business transfers</strong> — if Yorde What Store is involved in a merger, acquisition, or sale
            of assets, personal data may be transferred as part of that transaction, subject to this Policy or a
            successor policy with materially equivalent protections.
          </li>
        </ul>
        <p className="mt-2">
          We do not share Merchant or Customer data with unrelated third parties for their own marketing purposes.
        </p>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          We apply technical and organizational measures appropriate to the sensitivity of the data we hold,
          including:
        </p>
        <ul>
          <li>
            Database-level tenant isolation (row-level security) so one Merchant's data is not accessible from
            another Merchant's account context;
          </li>
          <li>Encryption of sensitive credentials (payment and messaging bot credentials) at rest;</li>
          <li>Password hashing and optional two-factor authentication for Merchant accounts;</li>
          <li>
            Encrypted, access-restricted, regularly rotated off-site database backups, used only for disaster
            recovery;
          </li>
          <li>Access controls limiting who can access production data.</li>
        </ul>
        <p className="mt-2">
          No system is completely secure, and we cannot guarantee absolute security. If we become aware of a data
          breach affecting your personal data, we will notify you as required by applicable law.
        </p>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <ul>
          <li>
            We retain Merchant account data for as long as the account is active, and for a reasonable period after
            closure to comply with legal, tax, or dispute-resolution obligations.
          </li>
          <li>
            Customer order data is retained by the Merchant's Store for as long as the Merchant's account is active,
            and is subject to the Merchant's own retention practices and legal obligations (e.g., tax record-keeping).
          </li>
          <li>Database backups are retained on a rolling basis (currently up to 14 days) and are then automatically deleted.</li>
          <li>We may retain de-identified or aggregated data indefinitely for analytics purposes.</li>
        </ul>
      </section>

      <section>
        <h2>7. Your Rights and Choices</h2>
        <p>
          Depending on where you are located, you may have rights to access, correct, delete, or export your personal
          data, or to object to or restrict certain processing.
        </p>
        <ul>
          <li>
            <strong>Merchants</strong> can access and update most of their own account and Store data directly from
            the dashboard, or request assistance at the contact below.
          </li>
          <li>
            <strong>Customers</strong> who wish to exercise privacy rights over data held by a specific Store should
            first contact that Store directly, since the Merchant controls that data. If you are unable to resolve
            your request with the Merchant, you may contact us at the address below and we will assist as the data
            processor for that Store.
          </li>
        </ul>
        <p className="mt-2">
          Nothing in this Policy limits any additional rights you may have under the specific privacy law that
          applies to you (for example, state consumer privacy laws in the United States, or the GDPR if you are
          located in the European Economic Area).
        </p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>
          We use cookies and similar technologies that are strictly necessary to operate the Service (for example, to
          keep you signed in) and, where a Merchant enables analytics, to understand aggregate Store traffic. We do
          not currently use third-party advertising cookies.
        </p>
      </section>

      <section>
        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not directed to, and we do not knowingly collect personal data from, children under the age
          of 13 (or the relevant minimum age in your jurisdiction). If we learn we have collected such data, we will
          delete it.
        </p>
      </section>

      <section>
        <h2>10. International Data Transfers</h2>
        <p>
          The Service and the infrastructure it runs on may be located in a country different from where you or your
          Customers reside. By using the Service, you acknowledge that your data may be transferred to and processed
          in such countries, which may have different data protection laws than your own.
        </p>
      </section>

      <section>
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Policy from time to time. If we make material changes, we will provide notice (for
          example, by email or an in-dashboard notice) before the changes take effect.
        </p>
      </section>

      <section>
        <h2>12. Contact Us</h2>
        <p>
          Questions about this Privacy Policy, or requests regarding your personal data, can be sent to:{' '}
          <a href="mailto:info@yws.com" className="font-medium text-brand-700 hover:text-brand-800">
            info@yws.com
          </a>
        </p>
      </section>
    </LegalLayout>
  )
}
