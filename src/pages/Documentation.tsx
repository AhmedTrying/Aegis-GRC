import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Shield, 
  BookOpen,
  Play,
  CheckCircle,
  ArrowLeft,
  Clock,
  Users,
  Settings,
  BarChart3,
  FileText,
  Globe,
  Zap,
  Lock,
  ChevronRight
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import SEO from "@/components/SEO"

const Documentation = () => {
  const navigate = useNavigate()
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)

  const gettingStartedGuides = [
    {
      id: "setup-account",
      title: "Setting Up Your Account",
      description: "Create your organization and configure basic settings",
      duration: "5 min",
      difficulty: "Beginner",
      icon: Settings,
      steps: [
        {
          title: "Create Your Organization",
          description: "Start by creating your organization profile with basic information",
          content: "Navigate to the organization settings and fill in your company name, industry, and contact details. This information helps customize your GRC experience."
        },
        {
          title: "Configure Security Settings",
          description: "Set up authentication and access controls",
          content: "Enable two-factor authentication, configure password policies, and set up your preferred authentication method for enhanced security."
        },
        {
          title: "Invite Team Members",
          description: "Add users and assign appropriate roles",
          content: "Send invitations to your team members and assign roles based on their responsibilities: Admin for full access, Manager for operational tasks, or Viewer for read-only access."
        }
      ]
    },
    {
      id: "first-framework",
      title: "Adding Your First Framework",
      description: "Import and configure compliance frameworks",
      duration: "10 min",
      difficulty: "Beginner",
      icon: Globe,
      steps: [
        {
          title: "Choose a Framework",
          description: "Select from pre-built frameworks or create custom ones",
          content: "Browse our library of frameworks including ISO 27001, NIST CSF, SOC 2, HIPAA, and more. Each framework comes with pre-mapped controls and requirements."
        },
        {
          title: "Customize Framework Settings",
          description: "Tailor the framework to your organization",
          content: "Adjust framework settings, add custom controls, and configure assessment criteria that align with your specific compliance requirements."
        },
        {
          title: "Assign Framework Owners",
          description: "Designate team members responsible for framework management",
          content: "Assign framework administrators who will oversee compliance activities, review controls, and manage assessments within the framework."
        }
      ]
    },
    {
      id: "risk-management",
      title: "Risk Management Basics",
      description: "Learn to identify, assess, and manage risks",
      duration: "15 min",
      difficulty: "Intermediate",
      icon: Shield,
      steps: [
        {
          title: "Create Risk Categories",
          description: "Organize risks by type and business area",
          content: "Establish risk categories such as Strategic, Operational, Financial, Compliance, and Technical risks to maintain organized risk management."
        },
        {
          title: "Risk Assessment Process",
          description: "Evaluate likelihood and impact of identified risks",
          content: "Use our risk assessment matrix to evaluate each risk's likelihood and potential impact, then calculate overall risk scores for prioritization."
        },
        {
          title: "Treatment Planning",
          description: "Develop strategies to address identified risks",
          content: "Create treatment plans with specific actions, owners, and deadlines. Choose from accept, mitigate, transfer, or avoid strategies based on risk appetite."
        }
      ]
    }
  ]

  const advancedGuides = [
    {
      id: "framework-mapping",
      title: "Advanced Framework Mapping",
      description: "Map controls across multiple frameworks",
      duration: "20 min",
      difficulty: "Advanced",
      icon: Globe,
      steps: [
        {
          title: "Identify Common Controls",
          description: "Find controls that apply across multiple frameworks",
          content: "Analyze your frameworks to identify overlapping requirements and common controls that can satisfy multiple compliance obligations simultaneously."
        },
        {
          title: "Create Control Mappings",
          description: "Establish relationships between frameworks",
          content: "Use our mapping tools to create relationships between controls in different frameworks, reducing duplication and ensuring consistency."
        },
        {
          title: "Validate Mappings",
          description: "Review and approve framework mappings",
          content: "Have subject matter experts review the mappings to ensure accuracy and completeness before implementing across your compliance program."
        }
      ]
    },
    {
      id: "automated-workflows",
      title: "Automated Workflows",
      description: "Set up automation for GRC processes",
      duration: "25 min",
      difficulty: "Advanced",
      icon: Zap,
      steps: [
        {
          title: "Define Workflow Triggers",
          description: "Identify events that should initiate automated actions",
          content: "Set up triggers based on risk scores, control test failures, approaching deadlines, or policy review dates to automatically initiate workflows."
        },
        {
          title: "Configure Notification Rules",
          description: "Set up alerts and reminders for stakeholders",
          content: "Create notification rules that automatically inform the right people about important events, overdue items, or required actions."
        },
        {
          title: "Monitor Workflow Performance",
          description: "Track and optimize automated processes",
          content: "Use workflow analytics to monitor completion rates, identify bottlenecks, and continuously improve your automated GRC processes."
        }
      ]
    },
    {
      id: "api-integration",
      title: "API Integration Guide",
      description: "Connect Aegis GRC with other systems",
      duration: "30 min",
      difficulty: "Advanced",
      icon: Lock,
      steps: [
        {
          title: "API Authentication",
          description: "Set up secure API access",
          content: "Generate API keys with appropriate permissions and configure authentication methods to securely connect external systems with Aegis GRC."
        },
        {
          title: "Data Synchronization",
          description: "Sync data between systems",
          content: "Use our REST API to synchronize risk data, control status, and compliance information with your existing tools and databases."
        },
        {
          title: "Webhook Configuration",
          description: "Set up real-time notifications",
          content: "Configure webhooks to receive real-time notifications about important events, changes, and updates in your GRC data."
        }
      ]
    }
  ]

  const selectedGuideData = [...gettingStartedGuides, ...advancedGuides].find(g => g.id === selectedGuide)

  return (
    <>
      <SEO 
        title="Documentation - Aegis GRC User Guides"
        description="Comprehensive documentation and user guides for Aegis GRC. Learn how to set up frameworks, manage risks, configure controls, and optimize your GRC processes."
        keywords="Aegis GRC documentation, user guides, GRC tutorials, framework setup, risk management, compliance guides"
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
              Documentation
            </h1>
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-3xl mx-auto leading-relaxed">
              Step-by-step guides to help you get the most out of Aegis GRC
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        {selectedGuide ? (
          /* Detailed Guide View */
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => setSelectedGuide(null)}
              variant="ghost"
              className="mb-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documentation
            </Button>

            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  {selectedGuideData && <selectedGuideData.icon className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {selectedGuideData?.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {selectedGuideData?.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{selectedGuideData?.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{selectedGuideData?.difficulty}</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {selectedGuideData?.steps.map((step, index) => (
                <Card key={index} className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {step.description}
                      </p>
                      <div className="bg-accent/50 rounded-lg p-4">
                        <p className="text-foreground leading-relaxed">
                          {step.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Using Aegis GRC
              </Button>
            </div>
          </div>
        ) : (
          /* Documentation Overview */
          <>
            {/* Getting Started Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Getting Started
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Essential guides for new users to quickly set up and start using Aegis GRC
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {gettingStartedGuides.map((guide, index) => {
                  const IconComponent = guide.icon
                  return (
                    <Card key={index} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                         onClick={() => setSelectedGuide(guide.id)}>
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {guide.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            {guide.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{guide.duration}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{guide.difficulty}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Advanced Guides Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Advanced Guides
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Deep-dive guides for power users and administrators
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {advancedGuides.map((guide, index) => {
                  const IconComponent = guide.icon
                  return (
                    <Card key={index} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
                         onClick={() => setSelectedGuide(guide.id)}>
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {guide.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            {guide.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{guide.duration}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{guide.difficulty}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Quick Links Section */}
            <div className="mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Quick Reference
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Quick access to frequently used documentation
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    API Reference
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Complete API documentation for developers
                  </p>
                  <Button
                    onClick={() => navigate('/api-reference')}
                    variant="outline"
                    className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                  >
                    View API Docs
                  </Button>
                </Card>

                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    System Status
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Check service availability and incidents
                  </p>
                  <Button
                    onClick={() => navigate('/system-status')}
                    variant="outline"
                    className="w-full border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                  >
                    Check Status
                  </Button>
                </Card>

                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Best Practices
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Industry best practices for GRC
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950"
                  >
                    Learn More
                  </Button>
                </Card>

                <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Help Center
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    FAQs and troubleshooting guides
                  </p>
                  <Button
                    onClick={() => navigate('/help')}
                    variant="outline"
                    className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  >
                    Visit Help Center
                  </Button>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Need More Help?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our support team is ready to assist you with any questions or issues you may have
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/contact')}
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Contact Support
            </Button>
            <Button
              onClick={() => navigate('/help')}
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-xl font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              Visit Help Center
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Documentation