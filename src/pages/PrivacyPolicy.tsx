import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Shield, 
  Eye, 
  Database, 
  Users, 
  Lock,
  Globe,
  Calendar,
  Mail,
  ArrowLeft
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import SEO from "@/components/SEO"

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  const sections = [
    {
      title: "Information We Collect",
      icon: Database,
      content: [
        "Personal Information: We collect information you provide directly, such as name, email address, company information, and job title when you create an account or contact us.",
        "Usage Data: We automatically collect information about how you interact with our platform, including log files, device information, and usage patterns.",
        "GRC Data: As a governance, risk, and compliance platform, we process and store the data you input into the system, including risk assessments, control documentation, and policy information."
      ]
    },
    {
      title: "How We Use Your Information",
      icon: Eye,
      content: [
        "Service Delivery: To provide, maintain, and improve our GRC platform and services.",
        "Account Management: To manage your account, provide customer support, and send important service notifications.",
        "Product Development: To understand usage patterns and improve our platform's functionality and user experience.",
        "Security and Compliance: To detect, prevent, and respond to security incidents and ensure compliance with applicable regulations."
      ]
    },
    {
      title: "Data Security",
      icon: Lock,
      content: [
        "Encryption: All data is encrypted in transit using TLS 1.3 and at rest using industry-standard encryption protocols.",
        "Access Controls: Role-based access controls ensure users only access data appropriate to their role and permissions.",
        "Regular Audits: We conduct regular security audits and penetration testing to maintain the highest security standards.",
        "Multi-tenancy: Each organization is isolated with dedicated data storage and processing to prevent cross-contamination."
      ]
    },
    {
      title: "Data Retention",
      icon: Calendar,
      content: [
        "Account Data: We retain your account information for as long as your account remains active.",
        "GRC Data: Governance, risk, and compliance data is retained according to your organization's retention policies and applicable regulations.",
        "Backup Data: We maintain encrypted backups for disaster recovery purposes for up to 90 days.",
        "Deletion Requests: You can request data deletion, subject to legal and regulatory requirements."
      ]
    },
    {
      title: "Third-Party Services",
      icon: Globe,
      content: [
        "Subprocessors: We use vetted third-party services for hosting, analytics, and customer support.",
        "Data Processing Agreements: All third-party providers have data processing agreements that meet GDPR and other privacy requirements.",
        "International Transfers: Data may be processed in countries with adequate privacy protections as recognized by relevant authorities.",
        "Service Providers: We only share data necessary for service delivery and maintain strict confidentiality agreements."
      ]
    },
    {
      title: "Your Rights",
      icon: Users,
      content: [
        "Access: You can request access to the personal data we hold about you.",
        "Correction: You can request correction of inaccurate or incomplete personal data.",
        "Deletion: You can request deletion of your personal data, subject to legal requirements.",
        "Portability: You can request your data in a portable format for transfer to another service.",
        "Objection: You can object to processing of your personal data for specific purposes."
      ]
    }
  ]

  const policyUpdates = [
    {
      date: "January 1, 2025",
      description: "Initial privacy policy published"
    }
  ]

  return (
    <>
      <SEO 
        title="Privacy Policy - Aegis GRC"
        description="Learn how Aegis GRC collects, uses, and protects your personal and organizational data. Our comprehensive privacy policy outlines your rights and our commitments."
        keywords="Aegis GRC privacy policy, data protection, GDPR compliance, data security, privacy rights"
      />

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-3 text-white hover:text-blue-300 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Aegis GRC
              </span>
            </button>
          </div>
          
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-3xl mx-auto leading-relaxed">
              Our commitment to protecting your data and privacy
            </p>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border-b border-blue-200 dark:border-blue-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
              <Calendar className="h-4 w-4" />
              <span>Last Updated: January 1, 2025</span>
            </div>
            <Button
              onClick={() => navigate('/contact')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Us
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {/* Introduction */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Your Privacy Matters
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              At Aegis GRC, we are committed to protecting your privacy and ensuring the security of your data. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. 
              By using Aegis GRC, you agree to the practices described in this policy.
            </p>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="max-w-4xl mx-auto space-y-12">
          {sections.map((section, index) => {
            const IconComponent = section.icon
            return (
              <Card key={index} className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    {section.title}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {section.content.map((paragraph, pIndex) => (
                    <p key={pIndex} className="text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>

        {/* Policy Updates */}
        <div className="max-w-4xl mx-auto mt-16">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Policy Updates
            </h3>
            <p className="text-muted-foreground mb-6">
              We may update this Privacy Policy from time to time. We will notify you of any material changes 
              by posting the new policy on this page and updating the "Last Updated" date above.
            </p>
            
            <div className="space-y-3">
              {policyUpdates.map((update, index) => (
                <div key={index} className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-muted-foreground">
                    <strong>{update.date}:</strong> {update.description}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Questions About This Policy?
              </h3>
              <p className="text-muted-foreground mb-6">
                If you have questions or concerns about this Privacy Policy, please contact us:
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/contact')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Contact Us
                </Button>
                <Button
                  onClick={() => navigate('/terms')}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 px-6 py-3 rounded-lg font-semibold"
                >
                  View Terms of Service
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Secure Your GRC Processes?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join organizations worldwide who trust Aegis GRC with their most sensitive data and compliance requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/auth')}
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Start Free Trial
            </Button>
            <Button
              onClick={() => navigate('/contact')}
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-xl font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              Request Demo
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default PrivacyPolicy