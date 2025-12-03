"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Header from "@/components/header"
import { useState } from "react"
import MyAccountModal from "@/components/my-account-modal"

export default function PrivacyStatementPage() {
  const router = useRouter()
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header onMenuClick={() => setIsAccountModalOpen(true)} />
      
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground mb-3 sm:mb-4 transition text-sm touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Content */}
        <div className="bg-card rounded-xl p-4 sm:p-6 md:p-8 border border-border shadow-sm">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6">
            Privacy Statement
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm sm:text-base leading-relaxed">
              <strong className="text-foreground">Last Updated:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">1. Introduction</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                Welcome to Oscar's Pizza & Kebab. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Statement explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">2. Information We Collect</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">2.1 Personal Information</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    When you place an order or create an account, we may collect:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                    <li>Name and contact information (email address, phone number)</li>
                    <li>Delivery address and location data</li>
                    <li>Payment information (processed securely through third-party payment processors)</li>
                    <li>Order history and preferences</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">2.2 Automatically Collected Information</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    We may automatically collect certain information when you visit our website:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                    <li>IP address and browser type</li>
                    <li>Device information</li>
                    <li>Usage data and browsing patterns</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your orders and account</li>
                <li>Improve our services and website functionality</li>
                <li>Send you promotional offers and updates (with your consent)</li>
                <li>Ensure the security and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                We do not sell your personal information. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                <li><strong className="text-foreground">Service Providers:</strong> With trusted third-party service providers who assist us in operating our business (e.g., payment processors, delivery services)</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong className="text-foreground">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">5. Data Security</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">6. Your Rights</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                Under applicable data protection laws, you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate or incomplete data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Request restriction of processing</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and personalize content. You can control cookies through your browser settings, but disabling cookies may affect website functionality.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">8. Children's Privacy</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">9. Changes to This Privacy Statement</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                We may update this Privacy Statement from time to time. We will notify you of any material changes by posting the new Privacy Statement on this page and updating the "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the updated Privacy Statement.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">10. Contact Us</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                If you have any questions, concerns, or requests regarding this Privacy Statement or our data practices, please contact us at:
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mt-4 border border-border">
                <p className="text-sm sm:text-base leading-relaxed">
                  <strong className="text-foreground">Oscar's Pizza & Kebab</strong><br />
                  17 John's Street, Limerick, LIMERICK<br />
                  Email: info@oscarspizza.ie
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* My Account Modal */}
      <MyAccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />
    </div>
  )
}

