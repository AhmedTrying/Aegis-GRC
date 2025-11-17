import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  Code,
  Key,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  ArrowLeft,
  BookOpen,
  Settings,
  Lock,
  Server,
  Activity
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import SEO from "@/components/SEO"

const APIReference = () => {
  const navigate = useNavigate()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const endpoints = [
    {
      id: "auth",
      method: "POST",
      path: "/api/auth/login",
      title: "Authentication",
      description: "Authenticate user and obtain access token",
      category: "Authentication",
      authRequired: false,
      parameters: [
        { name: "email", type: "string", required: true, description: "User email address" },
        { name: "password", type: "string", required: true, description: "User password" }
      ],
      response: `{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}`,
      errorResponse: `{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}`
    },
    {
      id: "organizations",
      method: "GET",
      path: "/api/organizations",
      title: "List Organizations",
      description: "Retrieve all organizations for the authenticated user",
      category: "Organizations",
      authRequired: true,
      parameters: [
        { name: "page", type: "integer", required: false, description: "Page number for pagination" },
        { name: "limit", type: "integer", required: false, description: "Number of items per page" }
      ],
      response: `{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "org_123",
        "name": "Acme Corporation",
        "created_at": "2024-01-15T10:30:00Z",
        "role": "admin"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}`
    },
    {
      id: "risks",
      method: "POST",
      path: "/api/risks",
      title: "Create Risk",
      description: "Create a new risk in the system",
      category: "Risk Management",
      authRequired: true,
      parameters: [
        { name: "title", type: "string", required: true, description: "Risk title" },
        { name: "description", type: "string", required: true, description: "Risk description" },
        { name: "likelihood", type: "integer", required: true, description: "Risk likelihood (1-5)" },
        { name: "impact", type: "integer", required: true, description: "Risk impact (1-5)" },
        { name: "category", type: "string", required: true, description: "Risk category" }
      ],
      response: `{
  "success": true,
  "data": {
    "risk": {
      "id": "risk_123",
      "title": "Data Breach Risk",
      "description": "Potential unauthorized access to sensitive data",
      "likelihood": 3,
      "impact": 5,
      "risk_score": 15,
      "status": "open",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}`
    },
    {
      id: "controls",
      method: "GET",
      path: "/api/controls",
      title: "List Controls",
      description: "Retrieve all controls for an organization",
      category: "Controls",
      authRequired: true,
      parameters: [
        { name: "framework_id", type: "string", required: false, description: "Filter by framework ID" },
        { name: "status", type: "string", required: false, description: "Filter by control status" }
      ],
      response: `{
  "success": true,
  "data": {
    "controls": [
      {
        "id": "ctrl_123",
        "code": "A.5.1",
        "title": "Information security policies",
        "description": "Policies for information security",
        "status": "compliant",
        "last_tested": "2024-01-10T14:20:00Z",
        "framework_id": "iso27001"
      }
    ]
  }
}`
    },
    {
      id: "frameworks",
      method: "GET",
      path: "/api/frameworks",
      title: "List Frameworks",
      description: "Get available compliance frameworks",
      category: "Frameworks",
      authRequired: true,
      parameters: [],
      response: `{
  "success": true,
  "data": {
    "frameworks": [
      {
        "id": "iso27001",
        "name": "ISO 27001:2022",
        "description": "Information Security Management",
        "version": "2022",
        "total_controls": 93
      },
      {
        "id": "nist_csf",
        "name": "NIST Cybersecurity Framework",
        "description": "Cybersecurity Framework",
        "version": "1.1",
        "total_controls": 108
      }
    ]
  }
}`
    }
  ]

  const codeExamples = {
    javascript: `// JavaScript/Node.js Example
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.aegisgrc.com',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

// Create a new risk
async function createRisk() {
  try {
    const response = await api.post('/api/risks', {
      title: "Data Breach Risk",
      description: "Potential unauthorized access to sensitive data",
      likelihood: 3,
      impact: 5,
      category: "Security"
    });
    
    console.log('Risk created:', response.data);
  } catch (error) {
    console.error('Error creating risk:', error.response.data);
  }
}

createRisk();`,

    python: `# Python Example
import requests
import json

class AegisGRCAPI:
    def __init__(self, api_key):
        self.base_url = 'https://api.aegisgrc.com'
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_risk(self, risk_data):
        url = f'{self.base_url}/api/risks'
        response = requests.post(url, headers=self.headers, json=risk_data)
        
        if response.status_code == 201:
            return response.json()
        else:
            raise Exception(f'Error: {response.status_code} - {response.text}')

# Usage
api = AegisGRCAPI('YOUR_API_KEY')
risk_data = {
    "title": "Data Breach Risk",
    "description": "Potential unauthorized access to sensitive data",
    "likelihood": 3,
    "impact": 5,
    "category": "Security"
}

try:
    result = api.create_risk(risk_data)
    print('Risk created successfully:', result)
except Exception as e:
    print('Error:', e)`,

    curl: `# cURL Example
curl -X POST "https://api.aegisgrc.com/api/risks" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{
    "title": "Data Breach Risk",
    "description": "Potential unauthorized access to sensitive data",
    "likelihood": 3,
    "impact": 5,
    "category": "Security"
  }'`
  }

  const selectedEndpointData = endpoints.find(e => e.id === selectedEndpoint)

  return (
    <>
      <SEO 
        title="API Reference - Aegis GRC Developer Documentation"
        description="Complete API documentation for Aegis GRC. Authentication, endpoints, code examples, and integration guides for developers building GRC applications."
        keywords="Aegis GRC API, API documentation, GRC API, REST API, developer documentation, integration guide"
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
              API Reference
            </h1>
            <p className="text-xl md:text-2xl text-blue-200/80 max-w-3xl mx-auto leading-relaxed">
              Integrate Aegis GRC with your existing tools and workflows using our REST API
            </p>
          </div>
        </div>
      </div>

      {/* API Overview */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
              <Code className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              RESTful API
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Our REST API provides programmatic access to all Aegis GRC features. Build custom integrations, 
              automate workflows, and connect with your existing tools and systems.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                <Key className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Secure Authentication
              </h3>
              <p className="text-muted-foreground text-sm">
                API key-based authentication with role-based access controls
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                RESTful Design
              </h3>
              <p className="text-muted-foreground text-sm">
                Standard HTTP methods and JSON responses for easy integration
              </p>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm text-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Real-time Updates
              </h3>
              <p className="text-muted-foreground text-sm">
                Webhook support for real-time notifications and updates
              </p>
            </Card>
          </div>
        </div>

        {/* Base URL and Authentication */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Base URL
            </h3>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-6">
              <code className="text-sm text-foreground">
                https://api.aegisgrc.com
              </code>
            </div>

            <h3 className="text-2xl font-bold text-foreground mb-6">
              Authentication
            </h3>
            <p className="text-muted-foreground mb-6">
              All API requests require authentication. Include your API key in the Authorization header:
            </p>
            
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-4">
              <code className="text-sm text-foreground">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Security Note</h4>
                  <p className="text-sm text-muted-foreground">
                    Keep your API keys secure and never expose them in client-side code. 
                    Rotate keys regularly and use environment variables in your applications.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Endpoints */}
        <div className="max-w-6xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-foreground mb-8">
            API Endpoints
          </h3>

          <div className="space-y-6">
            {endpoints.map((endpoint) => (
              <Card key={endpoint.id} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={endpoint.method === 'POST' ? 'default' : 'secondary'}
                        className={endpoint.method === 'POST' ? 'bg-green-600' : 'bg-blue-600'}
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono text-foreground">
                        {endpoint.path}
                      </code>
                    </div>
                    {endpoint.authRequired && (
                      <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                        <Lock className="h-3 w-3 mr-1" />
                        Auth Required
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {endpoint.title}
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    {endpoint.description}
                  </p>

                  {endpoint.parameters.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-semibold text-foreground mb-2">Parameters</h5>
                      <div className="space-y-2">
                        {endpoint.parameters.map((param, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm">
                            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-foreground">
                              {param.name}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {param.type}
                            </Badge>
                            {param.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            <span className="text-muted-foreground">{param.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h5 className="font-semibold text-foreground mb-2">Success Response</h5>
                      <div className="relative">
                        <pre className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-xs overflow-x-auto">
                          <code className="text-foreground">{endpoint.response}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(endpoint.response, `${endpoint.id}-response`)}
                        >
                          {copiedCode === `${endpoint.id}-response` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {endpoint.errorResponse && (
                      <div>
                        <h5 className="font-semibold text-foreground mb-2">Error Response</h5>
                        <div className="relative">
                          <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-xs overflow-x-auto">
                            <code className="text-foreground">{endpoint.errorResponse}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(endpoint.errorResponse!, `${endpoint.id}-error`)}
                          >
                            {copiedCode === `${endpoint.id}-error` ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Code Examples */}
        <div className="max-w-6xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-foreground mb-8">
            Code Examples
          </h3>

          <div className="space-y-8">
            {Object.entries(codeExamples).map(([language, code]) => (
              <Card key={language} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-foreground capitalize">
                      {language} Example
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(code, language)}
                    >
                      {copiedCode === language ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <div className="relative">
                    <pre className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-sm overflow-x-auto max-h-96">
                      <code className="text-foreground">{code}</code>
                    </pre>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Rate Limiting
              </h3>
            </div>
            
            <div className="space-y-4 text-muted-foreground">
              <p>
                API requests are rate-limited to ensure fair usage and system stability. 
                Current limits are:
              </p>
              
              <ul className="list-disc list-inside space-y-2">
                <li>100 requests per minute for authenticated endpoints</li>
                <li>20 requests per minute for authentication endpoints</li>
                <li>1000 requests per hour for data export endpoints</li>
              </ul>

              <p>
                Rate limit information is included in response headers:
              </p>

              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                <code className="text-sm text-foreground">
                  X-RateLimit-Limit: 100<br />
                  X-RateLimit-Remaining: 85<br />
                  X-RateLimit-Reset: 1640995200
                </code>
              </div>
            </div>
          </Card>
        </div>

        {/* Error Codes */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                Error Codes
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Badge variant="destructive">400</Badge>
                <div>
                  <h4 className="font-semibold text-foreground">Bad Request</h4>
                  <p className="text-sm text-muted-foreground">Invalid request parameters or malformed JSON</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge variant="destructive">401</Badge>
                <div>
                  <h4 className="font-semibold text-foreground">Unauthorized</h4>
                  <p className="text-sm text-muted-foreground">Invalid or expired authentication token</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge variant="destructive">403</Badge>
                <div>
                  <h4 className="font-semibold text-foreground">Forbidden</h4>
                  <p className="text-sm text-muted-foreground">Insufficient permissions for the requested operation</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge variant="destructive">404</Badge>
                <div>
                  <h4 className="font-semibold text-foreground">Not Found</h4>
                  <p className="text-sm text-muted-foreground">Requested resource does not exist</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge variant="destructive">429</Badge>
                <div>
                  <h4 className="font-semibold text-foreground">Rate Limited</h4>
                  <p className="text-sm text-muted-foreground">Too many requests, please try again later</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Badge variant="destructive">500</Badge>
                <div>
                  <h4 className="font-semibold text-foreground">Internal Server Error</h4>
                  <p className="text-sm text-muted-foreground">Something went wrong on our end</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Building?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Get your API key and start integrating Aegis GRC with your applications today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/auth')}
              className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Get API Key
            </Button>
            <Button
              onClick={() => navigate('/contact')}
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-xl font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default APIReference