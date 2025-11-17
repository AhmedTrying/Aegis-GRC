import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Shield, 
  Search, 
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Users,
  Settings,
  Zap,
  Globe,
  Lock
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import SEO from "@/components/SEO"

const HelpCenter = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = [
    {
      title: "Getting Started",
      icon: BookOpen,
      description: "Account setup, onboarding, and basic navigation",
      articles: 12
    },
    {
      title: "Account Management",
      icon: Users,
      description: "User roles, permissions, and organization settings",
      articles: 8
    },
    {
      title: "GRC Features",
      icon: Shield,
      description: "Risks, controls, frameworks, and compliance",
      articles: 15
    },
    {
      title: "Integrations",
      icon: Zap,
      description: "API usage, webhooks, and third-party connections",
      articles: 6
    },
    {
      title: "Security",
      icon: Lock,
      description: "Data protection, access controls, and compliance",
      articles: 9
    },
    {
      title: "Troubleshooting",
      icon: Settings,
      description: "Common issues, error messages, and solutions",
      articles: 7
    }
  ]

  const quickLinks = [
    { title: "Create Your First Risk", href: "/docs/risks" },
    { title: "Set Up Framework Mapping", href: "/docs/frameworks" },
    { title: "Invite Team Members", href: "/docs/users" },
    { title: "Generate Compliance Reports", href: "/docs/reports" },
    { title: "Configure Notifications", href: "/docs/settings" },
    { title: "API Documentation", href: "/api-reference" }
  ]

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@aegisgrc.com",
      responseTime: "24-48 hours"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team",
      contact: "Available 9 AM - 6 PM EST",
      responseTime: "5-10 minutes"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak with a support specialist",
      contact: "+1 (555) 123-4567",
      responseTime: "Business hours"
    }
  ]

  return (
    <>
      <SEO 
        title="Help Center - Aegis GRC Support"
        description="Get help with Aegis GRC. Browse FAQs, documentation, and contact support for assistance with governance, risk, and compliance management."
        keywords="Aegis GRC help, GRC support, FAQ, documentation, customer support, help center"
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
              How Can We Help?
            </h1>
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-2xl mx-auto leading-relaxed">
              Find answers to common questions, browse our documentation, or get in touch with our support team
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help... (e.g., 'How to create a risk' or 'framework mapping')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg border-border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 pb-16">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">
            Browse by Category
          </h2>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Find the help you need organized by topic
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {categories.map((category, index) => {
            const IconComponent = category.icon
            return (
              <Card key={index} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {category.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {category.articles} articles
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        View Articles
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Quick answers to common questions about Aegis GRC
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {filteredFaqs.map((faq, index) => (
              <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 text-left hover:bg-accent/50 transition-colors duration-200 flex items-center justify-between"
                >
                  <h3 className="text-lg font-semibold text-foreground pr-4">
                    {faq.question}
                  </h3>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-6 border-t border-border/30">
                    <p className="text-muted-foreground leading-relaxed pt-4">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            ))}
            
            {filteredFaqs.length === 0 && (
              <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No results found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or browse our categories above.
                </p>
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  Clear Search
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Quick Links
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Jump directly to popular help topics
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid gap-3 md:grid-cols-2">
            {quickLinks.map((link, index) => (
              <Button
                key={index}
                variant="ghost"
                className="justify-start text-left p-4 h-auto border border-border/50 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                onClick={() => navigate(link.href)}
              >
                <BookOpen className="h-4 w-4 mr-3 text-blue-600 dark:text-blue-400" />
                <span className="text-foreground">{link.title}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Need More Help?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our support team is here to assist you
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {contactMethods.map((method, index) => {
              const IconComponent = method.icon
              return (
                <Card key={index} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {method.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {method.description}
                  </p>
                  <p className="text-foreground font-medium mb-2">
                    {method.contact}
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{method.responseTime}</span>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <Button
              onClick={() => navigate('/contact')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// FAQ Data
const faqs = [
  {
    question: "What is Aegis GRC?",
    answer: "Aegis GRC is a comprehensive Governance, Risk, and Compliance platform that helps organizations manage their risk assessments, compliance frameworks, policies, and audit processes in one centralized location. It features AI-assisted insights and multi-tenant architecture with role-based access controls.",
    category: "General"
  },
  {
    question: "How do I get started with Aegis GRC?",
    answer: "Getting started is simple: 1) Sign up for a free trial, 2) Create your organization, 3) Invite team members, 4) Set up your first framework (ISO 27001, NIST CSF, SOC 2, etc.), and 5) Begin adding risks and controls. Our onboarding wizard will guide you through each step.",
    category: "Getting Started"
  },
  {
    question: "What frameworks does Aegis GRC support?",
    answer: "Aegis GRC supports major compliance frameworks including ISO 27001, NIST Cybersecurity Framework, SOC 2, HIPAA, GDPR, PCI DSS, and custom frameworks. You can map controls across multiple frameworks and track compliance status in real-time.",
    category: "Frameworks"
  },
  {
    question: "How does role-based access control work?",
    answer: "Aegis GRC provides three main roles: Admin (full access), Manager (can create and edit but not manage users), and Viewer (read-only access). Each role has specific permissions that ensure proper segregation of duties and security compliance.",
    category: "Access Control"
  },
  {
    question: "Can I export my data?",
    answer: "Yes, Aegis GRC provides comprehensive data export capabilities. You can export risks, controls, frameworks, policies, and reports in various formats including CSV, PDF, and JSON. Enterprise plans include automated backup and data portability features.",
    category: "Data Management"
  },
  {
    question: "What kind of reports can I generate?",
    answer: "Aegis GRC offers various reports including risk assessments, compliance status, control effectiveness, policy attestations, audit trails, and executive dashboards. Reports can be customized and scheduled for automatic generation and distribution.",
    category: "Reporting"
  },
  {
    question: "How secure is my data?",
    answer: "Security is our top priority. We use industry-standard encryption (TLS 1.3 in transit, AES-256 at rest), multi-factor authentication, role-based access controls, and regular security audits. Our platform is built on enterprise-grade infrastructure with SOC 2 compliance.",
    category: "Security"
  },
  {
    question: "What is the pricing model?",
    answer: "Aegis GRC offers flexible pricing with a 30-day free trial, monthly subscriptions starting at $99/month, and enterprise plans with custom features. Pricing is based on the number of users and features required. Contact our sales team for enterprise pricing.",
    category: "Pricing"
  },
  {
    question: "Can I integrate Aegis GRC with other tools?",
    answer: "Yes, Aegis GRC provides API access, webhooks, and integrations with popular tools like Slack, Microsoft Teams, Jira, and various SIEM systems. Our API allows for custom integrations and automation of GRC processes.",
    category: "Integrations"
  },
  {
    question: "What support options are available?",
    answer: "We offer multiple support channels including email support (24-48 hour response), live chat (business hours), phone support (enterprise plans), comprehensive documentation, video tutorials, and a community forum. Enterprise customers get priority support with dedicated account managers.",
    category: "Support"
  }
]

export default HelpCenter