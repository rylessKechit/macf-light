import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

const plans = [
  {
    name: "Découverte",
    badge: "Essai gratuit",
    badgeVariant: "outline" as const,
    price: "0€",
    period: "/mois",
    description: "Parfait pour tester la plateforme",
    features: [
      "1 déclaration par trimestre",
      "10 importations max",
      "Support par email",
      "Export PDF basique"
    ],
    buttonText: "Commencer gratuitement",
    buttonVariant: "outline" as const,
    popular: false
  },
  {
    name: "Starter",
    badge: "Le plus populaire",
    badgeVariant: "default" as const,
    price: "49€",
    period: "/mois",
    description: "Idéal pour les PME avec imports réguliers",
    features: [
      "Déclarations illimitées",
      "100 importations/mois",
      "Gestion fournisseurs",
      "Rapports avancés",
      "Support prioritaire"
    ],
    buttonText: "Choisir Starter",
    buttonVariant: "default" as const,
    popular: true
  },
  {
    name: "Pro",
    badge: "Entreprise",
    badgeVariant: "outline" as const,
    price: "149€",
    period: "/mois",
    description: "Pour les grandes entreprises",
    features: [
      "Tout illimité",
      "Multi-utilisateurs",
      "API avancée",
      "Support téléphonique",
      "Formation personnalisée"
    ],
    buttonText: "Choisir Pro",
    buttonVariant: "outline" as const,
    popular: false
  }
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tarifs transparents et abordables
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choisissez le plan qui correspond à la taille de votre entreprise
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.popular ? 'border-primary' : ''}`}
            >
              <CardHeader>
                <Badge variant={plan.badgeVariant} className="w-fit">
                  {plan.badge}
                </Badge>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.description}
                </CardDescription>
                <div className="text-3xl font-bold">
                  {plan.price} <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="block">
                  <Button className="w-full" variant={plan.buttonVariant}>
                    {plan.buttonText}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Tous les plans incluent la TVA • Résiliation à tout moment • Données hébergées en France
          </p>
          <Link href="#contact" className="text-primary hover:underline">
            Besoin d'un plan sur mesure ? Contactez-nous
          </Link>
        </div>
      </div>
    </section>
  )
}