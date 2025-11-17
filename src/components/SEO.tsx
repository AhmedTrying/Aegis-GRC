import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  structuredData?: object
}

const SEO = ({ 
  title = "Aegis GRC - Secure, AI-Assisted Governance, Risk & Compliance Platform",
  description = "Centralize risks, controls, audits, and evidence with Aegis GRC's smart, multi-tenant platform powered by AI. Enterprise-grade GRC solution with role-based access and automated workflows.",
  keywords = "GRC, governance, risk, compliance, AI, enterprise, risk management, compliance framework, SOC 2, ISO 27001, HIPAA, audit management",
  ogImage = "/aegis-logo.png",
  structuredData = null
}: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: string) => {
      const existingTag = property 
        ? document.querySelector(`meta[property="${property}"]`)
        : document.querySelector(`meta[name="${name}"]`)
      
      if (existingTag) {
        existingTag.setAttribute('content', content)
      } else {
        const metaTag = document.createElement('meta')
        if (property) {
          metaTag.setAttribute('property', property)
        } else {
          metaTag.setAttribute('name', name)
        }
        metaTag.setAttribute('content', content)
        document.head.appendChild(metaTag)
      }
    }

    // Update description
    updateMetaTag('description', description)
    
    // Update keywords
    updateMetaTag('keywords', keywords)
    
    // Update Open Graph tags
    updateMetaTag('', title, 'og:title')
    updateMetaTag('', description, 'og:description')
    updateMetaTag('', ogImage, 'og:image')
    updateMetaTag('', 'website', 'og:type')
    updateMetaTag('', window.location.href, 'og:url')
    
    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image')
    updateMetaTag('twitter:title', title)
    updateMetaTag('twitter:description', description)
    updateMetaTag('twitter:image', ogImage)

    // Add structured data if provided
    if (structuredData) {
      const existingScript = document.querySelector('script[type="application/ld+json"]')
      if (existingScript) {
        existingScript.textContent = JSON.stringify(structuredData)
      } else {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(structuredData)
        document.head.appendChild(script)
      }
    }

    // Cleanup function
    return () => {
      // Reset to default values when component unmounts
      document.title = "Aegis GRC"
    }
  }, [title, description, keywords, ogImage, structuredData])

  return null
}

export default SEO