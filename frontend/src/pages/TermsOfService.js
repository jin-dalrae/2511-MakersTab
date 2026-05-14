import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Blobs, cls, LOGO_URL } from '@/lib/theme';

const TermsOfService = () => {
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
          <h1 className="font-display text-5xl sm:text-6xl text-emerald-700 mb-2">terms of service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: November 19, 2025</p>

          <div className="prose prose-green max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing or using MakersTab ("the Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, please discontinue use of the Service immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Service Description</h2>
              <p className="text-gray-700 leading-relaxed">
                MakersTab is a meal plan management application designed for California College of the Arts students to track their dining expenses at Makers Cafe. The Service provides:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li>AI-powered receipt scanning and OCR (Optical Character Recognition)</li>
                <li>Meal plan balance tracking and budget management</li>
                <li>Transaction history and spending analytics</li>
                <li>Live cafe menu from Cafe Bon Appetit</li>
                <li>Weekly spending recommendations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Eligibility</h2>
              <p className="text-gray-700 leading-relaxed">
                You must be at least 13 years old to use MakersTab. By using this Service, you represent and warrant that you meet this age requirement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">User Accounts</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                To access MakersTab, you must create an account by providing:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Your name</li>
                <li>A valid email address</li>
                <li>A secure password</li>
                <li>Your meal plan budget amount</li>
                <li>Your current semester information</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Collection & Usage</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                When you use MakersTab, we collect and process:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Receipt Images:</strong> Photos you upload for OCR processing</li>
                <li><strong>Transaction Data:</strong> Item names, prices, quantities, categories, and dates extracted from receipts</li>
                <li><strong>Account Information:</strong> Name, email, meal plan amount, and semester</li>
                <li><strong>Usage Analytics:</strong> Anonymous data about how you interact with the Service</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                This data is used solely to provide the Service functionality, improve user experience, and generate spending insights. For more details, please see our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed">
                MakersTab relies on third-party services including but not limited to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li><strong>OpenAI:</strong> For AI-powered receipt OCR and data extraction</li>
                <li><strong>MongoDB:</strong> For secure data storage</li>
                <li><strong>Cafe Bon Appetit API:</strong> For live menu data</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                We are not responsible for errors, outages, or data breaches originating from these external services. Each third-party service is governed by its own terms and privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">User Conduct</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                You agree NOT to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Upload unlawful, harmful, fraudulent, or inappropriate content</li>
                <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
                <li>Use the Service for any illegal purpose</li>
                <li>Interfere with or disrupt the Service's functionality</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code</li>
                <li>Share your account credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Accuracy of Information</h2>
              <p className="text-gray-700 leading-relaxed">
                While MakersTab uses advanced AI technology for receipt scanning, <strong>you are responsible for verifying the accuracy</strong> of all extracted data, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li>Item names and prices</li>
                <li>Transaction totals</li>
                <li>Remaining balance amounts</li>
                <li>Transaction dates and times</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                Errors may occur during OCR processing. Always review extracted data before confirming transactions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Service Disclaimer</h2>
              <p className="text-gray-700 leading-relaxed">
                <strong>THE SERVICE IS PROVIDED "AS-IS" WITHOUT WARRANTY OF ANY KIND.</strong> We make no guarantees regarding:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li>Accuracy of OCR-extracted data</li>
                <li>Availability or uptime of the Service</li>
                <li>Completeness of menu data</li>
                <li>Timeliness of data updates</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                The Service may be modified, interrupted, or discontinued at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                To the maximum extent permitted by law, MakersTab, its developers, and affiliates shall NOT be liable for any:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li>Indirect, incidental, special, or consequential damages</li>
                <li>Loss of data, revenue, or profits</li>
                <li>Damages arising from OCR errors or inaccurate transaction tracking</li>
                <li>Issues resulting from third-party service failures</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                Your use of the Service is at your own risk. In no event shall our total liability exceed the amount you paid to use the Service (currently $0).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Deletion</h2>
              <p className="text-gray-700 leading-relaxed">
                You may request deletion of your account and associated data at any time. Upon deletion:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
                <li>Your account will be permanently removed</li>
                <li>All transaction history and receipt images will be deleted</li>
                <li>This action cannot be undone</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                Anonymous analytics data may be retained for service improvement purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Modifications to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Material changes will be communicated through the Service. Your continued use after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles. Any disputes shall be resolved exclusively in the state or federal courts located in California.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                For questions, concerns, or requests regarding these Terms of Service, please contact us through the feedback feature in the app or reach out to the California College of the Arts administration.
              </p>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500 italic">
                MakersTab is an independent student project and is not officially affiliated with California College of the Arts or Cafe Bon Appetit.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
