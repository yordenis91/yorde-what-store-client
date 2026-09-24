import { Link } from 'react-router-dom'
import { LegalLayout } from './LegalLayout'

export function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="September 24, 2026">
      <p>
        These Terms of Service ("Terms") govern access to and use of the Yorde What Store platform, including the
        merchant dashboard, storefront hosting, and related services (collectively, the "Service"), provided by
        Yorde What Store ("Yorde What Store," "we," "us," or "our"). By creating an account, creating a store, or
        otherwise using the Service, you ("Merchant," "you," or "your") agree to these Terms.
      </p>
      <p>If you do not agree to these Terms, do not use the Service.</p>

      <section>
        <h2>1. The Service</h2>
        <p>
          Yorde What Store is a multi-tenant e-commerce platform that lets a Merchant create and operate an online
          store ("Store") without building or hosting their own infrastructure. Through the Service, a Merchant can,
          among other things:
        </p>
        <ul>
          <li>Create and manage product listings, categories, taxes, coupons, and shipping options;</li>
          <li>Receive and manage customer orders;</li>
          <li>
            Accept online payments through supported third-party payment processors (currently Stripe and
            MercadoPago);
          </li>
          <li>
            Receive order notifications and fulfill orders through supported messaging channels (currently WhatsApp
            and Telegram) or by email;
          </li>
          <li>Customize their storefront's appearance, branding, and content;</li>
          <li>View sales and traffic data through a dashboard.</li>
        </ul>
        <p className="mt-2">
          Some features may be limited, gated, or offered only on certain subscription plans, and may change over
          time as described in Section 9.
        </p>
      </section>

      <section>
        <h2>2. Eligibility and Account Registration</h2>
        <p>To use the Service you must:</p>
        <ul>
          <li>
            Be at least 18 years old, or the age of legal majority in your jurisdiction, and have the legal capacity
            to enter into a binding contract;
          </li>
          <li>Provide accurate, current, and complete registration information, and keep it up to date;</li>
          <li>
            Be responsible for safeguarding your account credentials, including any two-factor authentication you
            enable, and for all activity that occurs under your account;
          </li>
          <li>Notify us promptly at the contact address in Section 15 if you suspect unauthorized use of your account.</li>
        </ul>
        <p className="mt-2">
          You are responsible for any staff or team members you invite to your Store's account and for their
          compliance with these Terms.
        </p>
      </section>

      <section>
        <h2>3. Merchant Responsibilities</h2>
        <p>You are solely responsible for:</p>
        <ul>
          <li>
            <strong>Your Store's content.</strong> Product listings, descriptions, images, pricing, policies, and any
            other content you upload or publish through the Service ("Merchant Content").
          </li>
          <li>
            <strong>Your Store's transactions.</strong> The products or services you sell, order fulfillment,
            shipping, returns, refunds, and customer service to your own customers ("Customers").
          </li>
          <li>
            <strong>Legal compliance.</strong> Complying with all laws applicable to your business, including
            consumer protection, product safety, advertising, sales tax / VAT collection and remittance, and
            export/import regulations. Yorde What Store does not calculate, collect, or remit taxes on your behalf
            beyond the tax-rate tooling made available in the dashboard, which you are responsible for configuring
            correctly.
          </li>
          <li>
            <strong>Your own policies.</strong> Publishing your own terms of sale, shipping policy, refund/return
            policy, and privacy policy for your Store's Customers, to the extent required by law. Yorde What Store's
            Privacy Policy governs our handling of data as the platform operator, but does not replace a Merchant's
            own obligations to their Customers.
          </li>
          <li>
            <strong>Lawful use of messaging channels.</strong> If you enable WhatsApp or Telegram fulfillment,
            complying with those platforms' own terms of service and any applicable messaging/opt-in consent
            requirements (e.g., not sending unsolicited marketing messages).
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Prohibited Uses</h2>
        <p>You may not use the Service to sell, list, or promote:</p>
        <ul>
          <li>Illegal goods or services under applicable law;</li>
          <li>Counterfeit or infringing goods;</li>
          <li>Goods or services that infringe a third party's intellectual property, privacy, or other rights;</li>
          <li>Content that is fraudulent, deceptive, or misleading to Customers;</li>
          <li>Anything prohibited by our payment processor's or messaging providers' acceptable use policies.</li>
        </ul>
        <p className="mt-2">
          You may not: attempt to gain unauthorized access to the Service or other tenants' data; interfere with the
          Service's normal operation; probe, scan, or test the vulnerability of the Service without authorization; or
          use the Service to send spam.
        </p>
        <p className="mt-2">
          We reserve the right to suspend or terminate accounts that violate this section, with or without notice,
          depending on severity.
        </p>
      </section>

      <section>
        <h2>5. Fees and Payment</h2>
        <ul>
          <li>
            Certain features of the Service require a paid subscription plan. Applicable fees, billing frequency, and
            plan features are described at checkout or in your dashboard at the time of purchase.
          </li>
          <li>
            Fees are billed in advance and are non-refundable except as required by law or as we otherwise state at
            the time of sale.
          </li>
          <li>
            We may change our fees or plans on prospective notice; continued use of the Service after a fee change
            takes effect constitutes acceptance of the new fee.
          </li>
          <li>
            Payments you accept from your Customers are processed by a third-party payment processor (currently
            Stripe and/or MercadoPago, depending on your Store's configuration). Processor fees, payout timing,
            chargebacks, and disputes are governed by that processor's own terms, which you must separately accept
            in order to enable online payments. Yorde What Store is not a party to the payment relationship between
            you and your Customer and does not hold or control your funds.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Third-Party Services</h2>
        <p>
          The Service integrates with third-party providers, including but not limited to Stripe and MercadoPago
          (payments), WhatsApp and Telegram (order fulfillment messaging), and email delivery providers (transactional
          email). Your use of
          these integrations is subject to the respective third party's terms and privacy practices, which we
          encourage you to review. We are not responsible for the acts, omissions, availability, or policies of these
          third parties.
        </p>
      </section>

      <section>
        <h2>7. Intellectual Property</h2>
        <ul>
          <li>
            <strong>Our IP.</strong> The Service, including its software, design, and branding (excluding Merchant
            Content), is owned by Yorde What Store or its licensors and is protected by intellectual property laws.
            These Terms do not grant you any right to use our trademarks or branding without prior written consent.
          </li>
          <li>
            <strong>Your Content.</strong> You retain all rights to Merchant Content you upload. By uploading
            Merchant Content, you grant Yorde What Store a worldwide, non-exclusive, royalty-free license to host,
            store, reproduce, and display that content solely as necessary to operate and provide the Service (for
            example, resizing and serving product images, or displaying your Store to Customers).
          </li>
          <li>
            You represent that you have the necessary rights to all Merchant Content you upload and that it does not
            infringe any third party's rights.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Data and Privacy</h2>
        <p>
          Our collection and use of personal data in connection with the Service is described in our{' '}
          <Link to="/privacy" className="font-medium text-brand-700 hover:text-brand-800">
            Privacy Policy
          </Link>
          . As between you and Yorde What Store, you are responsible for your own Customers' personal data that you
          collect, use, or process through your Store, and for having a lawful basis and appropriate disclosures
          (including your own Store-facing privacy policy) for doing so. Yorde What Store acts as a service provider
          / processor with respect to Customer data you control as the Merchant.
        </p>
      </section>

      <section>
        <h2>9. Service Availability and Changes</h2>
        <ul>
          <li>
            We aim to keep the Service available and reliable but do not guarantee uninterrupted or error-free
            operation. The Service may be temporarily unavailable for maintenance, updates, or reasons outside our
            control.
          </li>
          <li>
            We may add, change, or remove features, and may change plan pricing or limits, at our discretion, on
            reasonable notice for material changes that affect paid plans.
          </li>
          <li>
            We back up platform data on a regular schedule as part of operating the Service, but backups are an
            operational safeguard, not a substitute for you maintaining your own copies of critical business records
            where required by law.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Term, Suspension, and Termination</h2>
        <ul>
          <li>These Terms remain in effect while you use the Service.</li>
          <li>You may stop using the Service and close your account at any time.</li>
          <li>
            We may suspend or terminate your access to the Service, in whole or in part, if you breach these Terms,
            if required by law, or if we reasonably believe your use poses a risk to the Service, other Merchants,
            Customers, or third parties.
          </li>
          <li>
            Upon termination, your right to use the Service ends. We may retain data as required by law or as
            described in our Privacy Policy, and may delete Store data after a reasonable period following
            termination.
          </li>
        </ul>
      </section>

      <section>
        <h2>11. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
          IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.
        </p>
      </section>

      <section>
        <h2>12. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, YORDE WHAT STORE AND ITS OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          REVENUE, DATA, OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL AGGREGATE
          LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US FOR
          THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
        <p className="mt-2">
          Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above
          limitations may not apply to you.
        </p>
      </section>

      <section>
        <h2>13. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Yorde What Store from any claims, damages, losses, and expenses
          (including reasonable attorneys' fees) arising from: (a) your Merchant Content; (b) your use of the Service
          in violation of these Terms or applicable law; or (c) your Store's transactions with your Customers.
        </p>
      </section>

      <section>
        <h2>14. Governing Law and Disputes</h2>
        <p>
          These Terms are governed by the laws of the United States and the State of Florida, without regard to its
          conflict-of-laws principles. Any dispute arising from these Terms or the Service will be resolved in the
          state or federal courts located in Florida, and you consent to personal jurisdiction there.
        </p>
      </section>

      <section>
        <h2>15. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we will provide notice (for
          example, by email or an in-dashboard notice) before the changes take effect. Continued use of the Service
          after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>
          Questions about these Terms can be sent to:{' '}
          <a href="mailto:info@yws.com" className="font-medium text-brand-700 hover:text-brand-800">
            info@yws.com
          </a>
        </p>
      </section>
    </LegalLayout>
  )
}
