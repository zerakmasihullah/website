"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Header from "@/components/header"
import { useState } from "react"
import MyAccountModal from "@/components/my-account-modal"

export default function TermsOfUsePage() {
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
            Terms of Use
          </h1>
          
          <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-sm sm:text-base leading-relaxed">
              <strong className="text-foreground">Last Updated:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                By accessing and using the Oscar's Pizza & Kebab website and ordering services, you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">2. Use of the Service</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">2.1 Eligibility</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    You must be at least 18 years old to place an order. By using our service, you represent and warrant that you are of legal age to form a binding contract.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">2.2 Account Registration</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    You may be required to create an account to place orders. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">2.3 Prohibited Uses</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    You agree not to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
                    <li>Use the service for any illegal or unauthorized purpose</li>
                    <li>Violate any laws in your jurisdiction</li>
                    <li>Transmit any viruses, malware, or harmful code</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt the service</li>
                    <li>Use automated systems to access the service without permission</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">3. Orders and Payment</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">3.1 Order Placement</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    When you place an order, you are making an offer to purchase products at the prices listed. We reserve the right to accept or reject any order at our discretion. All orders are subject to product availability.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">3.2 Pricing</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    All prices are displayed in Euro (€) and include applicable taxes. We reserve the right to change prices at any time without prior notice. Prices displayed are valid at the time of order placement.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">3.3 Payment</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    Payment can be made by cash on delivery or online through secure payment processors. By providing payment information, you represent that you are authorized to use the payment method.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">3.4 Minimum Order</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    A minimum order amount of €10.00 applies for delivery orders. Collection orders may have different minimum requirements.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">4. Delivery and Collection</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">4.1 Delivery</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    We offer delivery services within our designated delivery area. Delivery fees apply as indicated at checkout. Estimated delivery times are provided for guidance only and are not guaranteed. We are not responsible for delays caused by factors beyond our control.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">4.2 Collection</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    You may choose to collect your order from our restaurant. Please arrive at the specified collection time. Orders not collected within a reasonable time may be cancelled or subject to additional charges.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">4.3 Delivery Address</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    You are responsible for providing accurate delivery address information. We are not liable for orders delivered to incorrect addresses provided by you.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">5. Cancellations and Refunds</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">5.1 Order Cancellation</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    You may cancel your order before it is prepared. Once preparation has begun, cancellation may not be possible. Contact us immediately if you need to cancel an order.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">5.2 Refunds</h3>
                  <p className="text-sm sm:text-base leading-relaxed">
                    Refunds will be processed in accordance with our refund policy. If you are not satisfied with your order, please contact us within 24 hours of delivery/collection. Refunds are subject to our discretion and may require proof of issue.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">6. Intellectual Property</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                All content on this website, including text, graphics, logos, images, and software, is the property of Oscar's Pizza & Kebab or its licensors and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">7. Limitation of Liability</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                To the maximum extent permitted by law, Oscar's Pizza & Kebab shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">8. Indemnification</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                You agree to indemnify and hold harmless Oscar's Pizza & Kebab, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the service or violation of these Terms of Use.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">9. Modifications to Terms</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                We reserve the right to modify these Terms of Use at any time. We will notify users of any material changes by posting the updated terms on this page and updating the "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">10. Governing Law</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                These Terms of Use shall be governed by and construed in accordance with the laws of Ireland. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the Irish courts.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-8 mb-4">11. Contact Information</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                If you have any questions about these Terms of Use, please contact us at:
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

