import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Blobs, cls, LOGO_URL } from '@/lib/theme';

const PrivacyPolicy = () => {
  return (
    <div className={cls.pageBg}>
      <Blobs />

      {/* Header */}
      <div className="relative z-10 bg-white/60 backdrop-blur-lg border-b border-white/40 sticky top-0">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-700">
            <ArrowLeft className="w-4 h-4" />
            back
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-9 h-9 bg-white rounded-2xl flex items-center justify-center sticker-shadow">
              <img src={LOGO_URL} alt="MakersTab" className="w-6 h-6" />
            </div>
            <span className="font-display text-2xl text-emerald-700">makerstab</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className={`${cls.card} p-6 sm:p-10`}>
          <h1 className="font-display text-5xl sm:text-6xl text-emerald-700 mb-2">privacy policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: November 19, 2025</p>

          <div className="prose prose-green max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                MakersTab ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our meal plan management service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">1. Account Information</h3>
              <p className="text-gray-700 leading-relaxed mb-2">When you create an account, we collect:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Full name</li>
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Meal plan budget amount</li>
                <li>Current semester (Fall/Spring/Summer)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2. Transaction Data</h3>
              <p className="text-gray-700 leading-relaxed mb-2">When you upload receipts, we collect and process:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Receipt images (photos you upload)</li>
                <li>Extracted transaction details (items, prices, quantities, categories)</li>
                <li>Transaction dates and times</li>
                <li>Remaining meal plan balance</li>
                <li>Merchant information (Makers Cafe)</li>
                <li>Optional transaction memos</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3. Usage Analytics</h3>
              <p className="text-gray-700 leading-relaxed mb-2">We automatically collect anonymous usage data including:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Device type and browser information</li>
                <li>Pages visited and features used</li>
                <li>Time spent in the app</li>
                <li>Error logs and crash reports</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4. Cafe Menu Data</h3>
              <p className="text-gray-700 leading-relaxed">
                We scrape and display publicly available menu information from Cafe Bon Appetit's website. This data is stored temporarily and updated daily.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-3">We use collected information to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Provide the Service:</strong> Process receipts, track transactions, and maintain your meal plan balance</li>
                <li><strong>Generate Insights:</strong> Create spending analytics, category breakdowns, and weekly budget recommendations</li>
                <li><strong>Improve the Service:</strong> Analyze usage patterns to enhance features and user experience</li>
                <li><strong>Security:</strong> Detect and prevent fraudulent activity or unauthorized access</li>
                <li><strong>Communications:</strong> Send important service updates (we do not send marketing emails)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Storage & Security</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>Storage Location:</strong> Your data is securely stored in MongoDB databases with encryption at rest.
              </p>
              <p className="text-gray-700 leading-relaxed mb-3">
                <strong>Security Measures:</strong> We implement industry-standard security practices including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Password hashing with bcrypt</li>
                <li>JWT token-based authentication</li>
                <li>HTTPS encryption for data transmission</li>
                <li>Regular security audits</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                <strong>Limitations:</strong> While we take reasonable measures to protect your data, no internet-based service is 100% secure. We cannot guarantee absolute security against unauthorized access or data breaches.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Third-Party Data Sharing</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We share your data with the following third-party services to provide functionality:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">OpenAI</h3>
              <p className="text-gray-700 leading-relaxed">
                Receipt images are sent to OpenAI's GPT-4o Vision API for OCR processing. OpenAI does not store or use your images for training purposes per their enterprise agreement.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">MongoDB</h3>
              <p className="text-gray-700 leading-relaxed">
                All user data and transactions are stored in MongoDB databases with encryption and access controls.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Cafe Bon Appetit</h3>
              <p className="text-gray-700 leading-relaxed">
                We scrape publicly available menu data from the Cafe Bon Appetit website. No personal user data is shared with them.
              </p>

              <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
                We do NOT sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">California Privacy Rights (CCPA)</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with specific rights:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Your Rights:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Right to Know:</strong> Request details about what personal data we collect and how it's used</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information (subject to legal exceptions)</li>
                <li><strong>Right to Opt-Out:</strong> We don't sell personal data, so no opt-out is needed</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">How to Exercise Your Rights:</h3>
              <p className="text-gray-700 leading-relaxed">
                To exercise any CCPA rights, please contact us through the app's feedback feature or send a request specifying which right you wish to exercise. We will verify your identity and respond within 45 days.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">Data Retention:</h3>
              <p className="text-gray-700 leading-relaxed">
                We retain your account data and transaction history as long as your account is active. Upon account deletion, all personal data is permanently removed within 30 days. Anonymous analytics data may be retained for service improvement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Cookies & Tracking</h2>
              <p className="text-gray-700 leading-relaxed">
                MakersTab uses minimal cookies for essential functionality:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li><strong>Authentication Token:</strong> Stored in localStorage to keep you logged in</li>
                <li><strong>Session Data:</strong> Temporary data to maintain your session state</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                We do not use third-party advertising cookies or tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                MakersTab is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected data from a child under 13, please contact us immediately so we can delete it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Responsibilities</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                To protect your privacy, you should:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Keep your password secure and do not share it with others</li>
                <li>Log out after using shared or public devices</li>
                <li>Review extracted receipt data before confirming transactions</li>
                <li>Avoid including sensitive personal information in transaction memos</li>
                <li>Report any unauthorized account access immediately</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Deletion & Account Closure</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                You may request account deletion at any time by contacting us through the app. Upon deletion:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Your account will be permanently closed</li>
                <li>All personal information, transaction history, and receipt images will be deleted within 30 days</li>
                <li>This action is irreversible - you will not be able to recover your data</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                Anonymous, aggregated analytics data may be retained for statistical purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. Material changes will be communicated through the app or via email. The "Last updated" date at the top indicates when changes were made. Your continued use of MakersTab after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us through:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li>The feedback feature within the MakersTab app</li>
                <li>California College of the Arts administration</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                We will respond to privacy-related inquiries within 45 days.
              </p>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500 italic">
                MakersTab is an independent student project and is not officially affiliated with California College of the Arts or Cafe Bon Appetit. This privacy policy applies solely to information collected by MakersTab.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
