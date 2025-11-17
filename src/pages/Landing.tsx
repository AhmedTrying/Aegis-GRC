import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  Lock, 
  Database, 
  Users, 
  Zap, 
  Building2, 
  Briefcase, 
  DollarSign, 
  Heart, 
  GraduationCap, 
  Landmark,
  Send,
  Mail,
  Phone,
  MapPin,
  Clock,
  User,
  CheckCircle,
  BarChart3,
  FileText,
  Settings,
  Cloud,
  Globe
} from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { ThemeToggle } from "@/components/ThemeToggle"
import SEO from "@/components/SEO"

const Landing = () => {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('hero')
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
      
      const sections = ['hero', 'features', 'how-it-works', 'use-cases', 'contact']
      const currentSection = sections.find(section => {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          return rect.top <= 100 && rect.bottom >= 100
        }
        return false
      })
      
      if (currentSection) {
        setActiveSection(currentSection)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleStartTrialClick = () => {
    navigate('/auth')
  }

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      company: formData.get('company'),
      message: formData.get('message')
    }
    
    console.log('Contact form submitted:', data)
    alert('Thank you for your interest! We will contact you soon.')
    e.currentTarget.reset()
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Aegis GRC",
    "description": "Secure, AI-assisted governance, risk & compliance platform for modern enterprises.",
    "url": "https://aegisgrc.com",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "0",
        "priceCurrency": "USD",
        "unitText": "month"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    },
    "features": [
      "Risk Management",
      "Compliance Frameworks",
      "AI-Powered Insights",
      "Role-Based Access",
      "Automated Workflows",
      "Evidence Management"
    ]
  }

  const features = [
    {
      title: "Multi-Tenant & RLS Security",
      description: "Isolate every organization's data with org-scoped RLS, Supabase Auth, and per-org storage paths.",
      icon: Shield,
      gradient: "from-green-400 to-teal-500"
    },
    {
      title: "Risk Register & Scoring",
      description: "Log risks, owners, likelihood/impact, appetite thresholds, and review cadence.",
      icon: BarChart3,
      gradient: "from-blue-400 to-cyan-500"
    },
    {
      title: "Framework Mapping",
      description: "Map ISO 27001, NIST CSF, SOC 2, HIPAA, or custom frameworks to your controls.",
      icon: Globe,
      gradient: "from-orange-400 to-yellow-500"
    },
    {
      title: "Policies & Attestations",
      description: "Publish policies, collect attestations, and schedule 14/7/-day reminders.",
      icon: FileText,
      gradient: "from-pink-400 to-orange-500"
    },
    {
      title: "Controls & Tests",
      description: "Define controls, link evidence, and run periodic tests with pass/fail outcomes.",
      icon: Settings,
      gradient: "from-purple-400 to-pink-500"
    },
    {
      title: "Treatment Plans & Tasks",
      description: "Assign actions, owners, due dates, and track overdue items automatically.",
      icon: CheckCircle,
      gradient: "from-indigo-400 to-purple-500"
    },
    {
      title: "Audit Logs & Evidence",
      description: "Full audit trail of who changed what/when; upload evidence to org-scoped storage.",
      icon: Database,
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      title: "Dashboards & KPIs",
      description: "Real-time cards for open/high risks, compliance %, overdue plans, and attestations %.",
      icon: Cloud,
      gradient: "from-teal-400 to-green-500"
    }
  ]

  const useCases = [
    {
      title: "Cybersecurity Teams",
      description: "Track ISO/NIST controls, evidence, and security risks in one place.",
      icon: Shield,
      gradient: "from-blue-400 to-cyan-500"
    },
    {
      title: "Consultancies",
      description: "Manage multiple client tenants securely with per-org isolation.",
      icon: Briefcase,
      gradient: "from-purple-400 to-blue-500"
    },
    {
      title: "Financial Services",
      description: "Meet regulatory demands with audit trails and attestation workflows.",
      icon: DollarSign,
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      title: "Healthcare",
      description: "Maintain HIPAA/ISO 27001 compliance with policy and evidence management.",
      icon: Heart,
      gradient: "from-red-400 to-pink-500"
    },
    {
      title: "Government & Public Sector",
      description: "Standardize governance and risk reviews across departments.",
      icon: Landmark,
      gradient: "from-indigo-400 to-purple-500"
    },
    {
      title: "Education",
      description: "Centralize policies, access control reviews, and incident follow-ups.",
      icon: GraduationCap,
      gradient: "from-teal-400 to-blue-500"
    }
  ]

  return (
    <>
      <SEO 
        title="Aegis GRC - Secure, AI-Assisted Governance, Risk & Compliance Platform"
        description="Centralize risks, controls, audits, and evidence with Aegis GRC's smart, multi-tenant platform powered by AI. Enterprise-grade GRC solution with role-based access and automated workflows."
        keywords="GRC, governance, risk, compliance, AI, enterprise, risk management, compliance framework, SOC 2, ISO 27001, HIPAA, audit management"
        structuredData={structuredData}
      />
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                  <img src="/aegis-logo.png" alt="Logo" className="h-5 w-5 text-white object-contain" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Aegis GRC
                </span>
              </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'Use Cases', 'Testimonials', 'Contact'].map((item) => {
                const sectionId = item.toLowerCase().replace(' ', '-')
                return (
                  <button
                    key={item}
                    onClick={() => handleNavClick(sectionId)}
                    className={`text-sm font-medium uppercase tracking-wider transition-colors hover:text-blue-400 ${
                      activeSection === sectionId 
                        ? 'text-blue-400' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
              
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <Button 
                  onClick={handleStartTrialClick}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Start Free Trial</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
        
        <div className="container px-4 md:px-6 py-20 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
              <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">
                Enterprise GRC Platform
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              Secure, AI-Assisted
              <br />
              Governance, Risk &
              <br />
              Compliance
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-3xl mb-12 leading-relaxed">
              Centralize risks, controls, audits, and evidence — all in a smart, multi-tenant GRC dashboard powered by AI.
            </p>

            <div className="w-full max-w-2xl mb-12">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Draft a response to the government RFP based on our previous submissions."
                  className="w-full px-6 py-4 text-lg rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 pr-16"
                />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg">
                  <Send className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              <Button 
                onClick={handleStartTrialClick}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-3 hover:scale-105"
              >
                <Zap className="h-5 w-5" />
                <span>Start Free Trial</span>
              </Button>
              
              <Button 
                onClick={() => handleNavClick('contact')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:border-white/50 transition-all duration-300 hover:scale-105"
              >
                Request Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 mb-6">
              <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">
                Key Features
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Enterprise-Grade AI Platform
            </h2>
            
            <p className="text-xl text-blue-200/70 max-w-3xl leading-relaxed">
              Designed specifically for organizations that demand security, customization, and control.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 items-start">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-blue-200/70 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 mb-6">
              <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">
                How It Works
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              How It Works
            </h2>
            
            <p className="text-xl text-blue-200/70 max-w-3xl leading-relaxed">
              Our platform seamlessly integrates with your existing workflows and systems.
            </p>
          </div>
          
          <div className="grid gap-12 md:grid-cols-3 items-start">
            {[
              {
                step: "1",
                title: "Create Your Organization",
                description: "Invite your team; roles: admin, manager, viewer; SoD enforced for risk acceptance."
              },
              {
                step: "2", 
                title: "Add Frameworks & Risks",
                description: "Import frameworks, build your risk inventory, and link controls/policies."
              },
              {
                step: "3",
                title: "Monitor & Report", 
                description: "Automated reminders, compliance scoring, and audit-ready reports."
              }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-xl">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">
                  {item.title}
                </h3>
                
                <p className="text-blue-200/70 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-32 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 mb-6">
              <span className="text-sm font-medium text-blue-300 uppercase tracking-wider">
                Use Cases
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Transforming Industries
            </h2>
            
            <p className="text-xl text-blue-200/70 max-w-3xl leading-relaxed">
              Our AI platform is designed to meet the unique challenges of various sectors.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
            {useCases.map((useCase, index) => {
              const IconComponent = useCase.icon
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-3">
                    {useCase.title}
                  </h3>
                  
                  <p className="text-blue-200/70 text-sm leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Custom Enterprise Pricing
                </h2>
                
                <p className="text-xl text-blue-200/70 leading-relaxed mb-8">
                  We offer tailored pricing packages for enterprises and government agencies based on your specific needs and scale.
                </p>
              </div>
              
              <div className="space-y-6">
                {[
                  { icon: Users, text: "Role-based access (Admin/Manager/Viewer)" },
                  { icon: Database, text: "Org-scoped storage & evidence" },
                  { icon: Globe, text: "Framework mapping (ISO/NIST/SOC2/HIPAA)" },
                  { icon: Zap, text: "Automations: reviews, attestations, overdue tasks" },
                  { icon: Shield, text: "Audit logs & export" },
                  { icon: Lock, text: "SSO/SCIM (Enterprise)" }
                ].map((item, index) => {
                  const IconComponent = item.icon
                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-blue-200/80">{item.text}</span>
                    </div>
                  )
                })}
              </div>
              
              <div className="pt-6">
                <p className="text-blue-200/90 font-medium">
                  Contact us for a personalized quote and to discuss your specific requirements.
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6">
                Contact Aegis GRC
              </h3>
              
              <p className="text-blue-200/70 mb-8">
                Get in touch with our team to schedule a live product demo.
              </p>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-center space-x-4">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-300/70">Email</p>
                    <p className="text-white">ahmedmarwan.biz@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Phone className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-300/70">Phone</p>
                    <p className="text-white">+966 543347674</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <User className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-300/70">Demo Contact</p>
                    <p className="text-white">Ahmed Marwan</p>
                    <p className="text-sm text-blue-300/70">Product Lead, Aegis GRC</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-300/70">Location</p>
                    <p className="text-white">Riyadh, Saudi Arabia</p>
                    <p className="text-sm text-blue-300/70">Global / Remote</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-blue-300/70">Response Time</p>
                    <p className="text-white">We typically respond within 24 hours.</p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => handleNavClick('contact')}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Request Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900 border-t border-white/10">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <img src="/aegis-logo.png" alt="Logo" className="h-5 w-5 text-white object-contain" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Aegis GRC
                </span>
              </div>
              <p className="text-blue-200/60 text-sm leading-relaxed">
                AI-assisted GRC for organizations that demand security and scale.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-blue-200/60">
                <li><button onClick={() => handleNavClick('features')} className="hover:text-blue-400 transition-colors">Features</button></li>
                <li><button onClick={() => handleNavClick('use-cases')} className="hover:text-blue-400 transition-colors">Use Cases</button></li>
                <li><button className="hover:text-blue-400 transition-colors">Pricing</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-blue-200/60">
                <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-blue-200/60">
                <li><Link to="/help" className="hover:text-blue-400 transition-colors">Help Center</Link></li>
                <li><Link to="/docs" className="hover:text-blue-400 transition-colors">Documentation</Link></li>
                <li><Link to="/api" className="hover:text-blue-400 transition-colors">API Reference</Link></li>
                <li><Link to="/status" className="hover:text-blue-400 transition-colors">System Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-blue-200/60">
            <p>&copy; 2025 Aegis GRC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Landing