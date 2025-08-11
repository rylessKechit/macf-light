import Link from 'next/link'
import { Leaf } from 'lucide-react'

const footerLinks = {
  product: [
    { name: 'Fonctionnalités', href: '#features' },
    { name: 'Tarifs', href: '#pricing' },
    { name: 'Démo', href: '#demo' },
    { name: 'API', href: '#api' }
  ],
  support: [
    { name: 'Centre d\'aide', href: '#help' },
    { name: 'Contact', href: '#contact' },
    { name: 'Guides CBAM', href: '#guides' },
    { name: 'Statut', href: '#status' }
  ],
  legal: [
    { name: 'Confidentialité', href: '#privacy' },
    { name: 'CGU', href: '#terms' },
    { name: 'Cookies', href: '#cookies' },
    { name: 'RGPD', href: '#gdpr' }
  ]
}

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">MACF Light</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              La solution française pour vos déclarations CBAM. Simplifiez votre conformité carbone.
            </p>
            <p className="text-xs text-muted-foreground">
              © 2024 MACF Light. Tous droits réservés.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Produit</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Légal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}