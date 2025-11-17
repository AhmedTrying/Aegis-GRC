import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Shield, 
  FileText, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle,
  Mail,
  ArrowLeft,
  Globe,
  Zap,
  Lock
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import SEO from "@/components/SEO"

const TermsOfService = () => {
  const navigate = useNavigate()

  const sections = [
    {
      title: "Acceptance of Terms",
      icon: CheckCircle,
      content: [
        "By accessing and using Aegis GRC, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our platform.",
        "These terms apply to all users, including individual users, organizations, and enterprise customers. Additional terms may apply to specific features or services."
      ]
    },
    {
      title: "Use of Service",
      icon: Globe,
      content: [
        "License Grant: Aegis GRC grants you a limited, non-exclusive, non-transferable license to access and use the platform for your internal business purposes.",
        "User Responsibilities: You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.",
        "Prohibited Uses: You may not use the platform for any illegal, harmful, or unauthorized purposes, including data scraping, reverse engineering, or unauthorized access."
      ]
    },
    {
      title: "Data and Content",
      icon: FileText,
      content: [
        "Your Data: You retain ownership of all data you input into the platform. Aegis GRC will only use your data to provide and improve the service.",
        "Data Security: We implement industry-standard security measures to protect your data, but cannot guarantee absolute security against all threats.",
        "Data Backup: Regular backups are performed, but you are responsible for maintaining your own copies of critical data."
      ]
    },
    {
      title: "Intellectual Property",
      icon: Shield,
      content: [
        "Platform Ownership: Aegis GRC retains all rights, title, and interest in the platform, including all software, trademarks, and intellectual property.",
        "User Content: You grant Aegis GRC a limited license to use, store, and process your content solely for providing the service.",
        "Feedback: Any feedback or suggestions you provide may be used by Aegis GRC without obligation or compensation."
      ]
    },
    {
      title: "Service Availability",
      icon: Zap,
      content: [
        "Uptime Commitment: We strive to maintain 99.9% uptime, but do not guarantee uninterrupted access to the platform.",
        "Maintenance: Scheduled maintenance may temporarily affect service availability. We will provide advance notice when possible.",
        "Force Majeure: We are not liable for service interruptions due to circumstances beyond our reasonable control."
      ]
    },
    {
      title: "Limitation of Liability",
      icon: AlertCircle,
      content: [
        "Disclaimer: The platform is provided 'as is' without warranties of any kind, express or implied.",
        "Liability Limit: Aegis GRC's total liability shall not exceed the amounts paid by you for the service in the 12 months preceding the claim.",
        "Exclusions: We are not liable for indirect, incidental, special, or consequential damages arising from your use of the platform."
      ]
    }
  ]

  const keyPoints = [
    {
      title: "Free Trial",
      description: "30-day free trial with full access to all features",
      icon: Clock
    },
    {
      title: "Monthly Subscription",
      description: "Flexible monthly plans starting at $99/month",
      icon: Users
    },
    {
      title: "Enterprise Plans",
      description: "Custom pricing for large organizations",
      icon: Shield
    },
    {
      title: "Data Export",
      description: "Full data export available at any time",
      icon: FileText
    }
  ]

  const terminationClauses = [
    "You may terminate your account at any time through the platform settings",
    "We may suspend or terminate accounts for violations of these terms",
    "Upon termination, your access to the platform will be immediately revoked",
    "Data retention policies apply to terminated accounts as outlined in our Privacy Policy"
  ]

  return (
    <>
      <SEO 
        title="Terms of Service - Aegis GRC"
        description="Read the Terms of Service for Aegis GRC. Understand your rights and responsibilities when using our governance, risk, and compliance platform."
        keywords="Aegis GRC terms of service, service agreement, user agreement, platform terms, GRC platform terms"
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
              Terms of Service
            </h1>
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-3xl mx-auto leading-relaxed">
              Please read these terms carefully before using our platform
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
              Contact Support
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
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Agreement Overview
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              These Terms of Service govern your access to and use of Aegis GRC's governance, risk, and compliance platform. 
              By using our services, you agree to comply with these terms and all applicable laws and regulations.
            </p>
          </div>
        </div>

        {/* Key Points */}
        <div className="max-w-6xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            Key Service Features
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {keyPoints.map((point, index) => {
              const IconComponent = point.icon
              return (
                <Card key={index} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {point.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {point.description}
                  </p>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Terms Sections */}
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

        {/* Termination Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Termination
              </h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                These terms remain in effect until terminated by you or Aegis GRC. Termination conditions include:
              </p>
              
              <ul className="space-y-3">
                {terminationClauses.map((clause, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                    <span className="text-muted-foreground">{clause}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Questions About These Terms?
              </h3>
              <p className="text-muted-foreground mb-6">
                If you have questions or concerns about these Terms of Service, please contact us:
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/contact')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Contact Support
                </Button>
                <Button
                  onClick={() => navigate('/privacy')}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 px-6 py-3 rounded-lg font-semibold"
                >
                  View Privacy Policy
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
            Ready to Accept These Terms?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join organizations worldwide who trust Aegis GRC for their governance, risk, and compliance needs.
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

export default TermsOfService