import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Server,
  Globe,
  Database,
  Zap,
  ArrowLeft,
  RefreshCw,
  Mail,
  Bell
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import SEO from "@/components/SEO"

const SystemStatus = () => {
  const navigate = useNavigate()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const services = [
    {
      id: "api",
      name: "API Services",
      status: "operational",
      uptime: "99.99%",
      responseTime: "120ms",
      lastIncident: "2 days ago",
      description: "Core API endpoints and authentication"
    },
    {
      id: "web_app",
      name: "Web Application",
      status: "operational",
      uptime: "99.98%",
      responseTime: "85ms",
      lastIncident: "1 week ago",
      description: "User interface and dashboard"
    },
    {
      id: "database",
      name: "Database",
      status: "operational",
      uptime: "99.97%",
      responseTime: "45ms",
      lastIncident: "3 weeks ago",
      description: "Data storage and retrieval"
    },
    {
      id: "auth",
      name: "Authentication",
      status: "operational",
      uptime: "99.99%",
      responseTime: "95ms",
      lastIncident: "1 month ago",
      description: "User authentication and authorization"
    },
    {
      id: "storage",
      name: "File Storage",
      status: "operational",
      uptime: "99.96%",
      responseTime: "200ms",
      lastIncident: "2 weeks ago",
      description: "Document and evidence storage"
    },
    {
      id: "integrations",
      name: "Integrations",
      status: "operational",
      uptime: "99.95%",
      responseTime: "150ms",
      lastIncident: "5 days ago",
      description: "Third-party integrations and webhooks"
    }
  ]

  const incidents = [
    {
      id: 1,
      title: "Brief API latency increase",
      status: "resolved",
      severity: "minor",
      startTime: "2024-01-15 14:30 UTC",
      endTime: "2024-01-15 14:45 UTC",
      duration: "15 minutes",
      description: "Increased response times for API endpoints due to database optimization",
      affectedServices: ["api", "database"]
    },
    {
      id: 2,
      title: "Scheduled maintenance completed",
      status: "resolved",
      severity: "maintenance",
      startTime: "2024-01-10 02:00 UTC",
      endTime: "2024-01-10 04:00 UTC",
      duration: "2 hours",
      description: "Successfully completed scheduled maintenance with performance improvements",
      affectedServices: ["api", "web_app", "database"]
    }
  ]

  const maintenance = [
    {
      id: 1,
      title: "Database optimization",
      scheduledDate: "January 20, 2024",
      scheduledTime: "02:00 - 04:00 UTC",
      description: "Database performance optimization and index updates",
      affectedServices: ["database", "api"],
      status: "scheduled"
    }
  ]

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastUpdated(new Date())
      setIsRefreshing(false)
    }, 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'maintenance':
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Operational</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Degraded</Badge>
      case 'down':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Down</Badge>
      case 'maintenance':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Maintenance</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Critical</Badge>
      case 'major':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Major</Badge>
      case 'minor':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Minor</Badge>
      case 'maintenance':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Maintenance</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <>
      <SEO 
        title="System Status - Aegis GRC Service Status"
        description="Check the current status of Aegis GRC services, API uptime, and any ongoing incidents or maintenance. Real-time system status and performance metrics."
        keywords="Aegis GRC status, system status, service status, uptime, incidents, maintenance, API status"
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
              System Status
            </h1>
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-3xl mx-auto leading-relaxed">
              Real-time status of Aegis GRC services and infrastructure
            </p>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="text-2xl font-bold text-foreground">
              All Systems Operational
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {services.map((service) => (
            <Card key={service.id} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium text-foreground">{service.uptime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Response Time</span>
                  <span className="text-sm font-medium text-foreground">{service.responseTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Incident</span>
                  <span className="text-sm font-medium text-foreground">{service.lastIncident}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Incidents Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Recent Incidents
          </h2>

          {incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Card key={incident.id} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {incident.status === 'resolved' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {incident.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {incident.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getSeverityBadge(incident.severity)}
                      <Badge 
                        variant={incident.status === 'resolved' ? 'default' : 'outline'}
                        className={incident.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                      >
                        {incident.status === 'resolved' ? 'Resolved' : 'Ongoing'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Timeline</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span className="text-foreground">{incident.startTime}</span>
                        </div>
                        {incident.endTime && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Resolved:</span>
                            <span className="text-foreground">{incident.endTime}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="text-foreground">{incident.duration}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Affected Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {incident.affectedServices.map((serviceId) => {
                          const service = services.find(s => s.id === serviceId)
                          return (
                            <Badge key={serviceId} variant="outline" className="text-xs">
                              {service?.name || serviceId}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Recent Incidents
              </h3>
              <p className="text-muted-foreground">
                All systems have been running smoothly without any incidents.
              </p>
            </Card>
          )}
        </div>

        {/* Maintenance Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Scheduled Maintenance
          </h2>

          {maintenance.length > 0 ? (
            <div className="space-y-4">
              {maintenance.map((item) => (
                <Card key={item.id} className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Scheduled
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Scheduled Time</h4>
                      <p className="text-sm text-foreground">{item.scheduledTime}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Affected Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {item.affectedServices.map((serviceId) => {
                          const service = services.find(s => s.id === serviceId)
                          return (
                            <Badge key={serviceId} variant="outline" className="text-xs">
                              {service?.name || serviceId}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Scheduled Maintenance
              </h3>
              <p className="text-muted-foreground">
                No maintenance is currently scheduled. We'll notify you in advance of any planned maintenance.
              </p>
            </Card>
          )}
        </div>

        {/* Contact Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Need to Report an Issue?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            If you're experiencing issues not reflected on this page, please contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/contact')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 px-6 py-3 rounded-lg font-semibold"
            >
              <Bell className="h-4 w-4 mr-2" />
              Subscribe to Updates
            </Button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Experience Reliable GRC Management
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join organizations worldwide who trust Aegis GRC for their critical governance, risk, and compliance needs.
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

export default SystemStatus