import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CheckCircle, 
  FileText,
  BarChart3,
  Clock,
  Shield,
  Users,
  TrendingUp
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: "Déclarations automatisées",
    description: "Créez et soumettez vos déclarations trimestrielles avec un assistant intelligent",
    items: [
      "Formulaires pré-remplis",
      "Validation automatique",
      "Export PDF officiel"
    ]
  },
  {
    icon: BarChart3,
    title: "Calcul des émissions",
    description: "Calcul automatique des émissions carbone basé sur vos données d'importation",
    items: [
      "Base de données produits CBAM",
      "Facteurs d'émission officiels",
      "Certificats CBAM intégrés"
    ]
  },
  {
    icon: Clock,
    title: "Gestion des échéances",
    description: "Ne manquez plus jamais une échéance avec nos alertes intelligentes",
    items: [
      "Rappels automatiques",
      "Calendrier intégré",
      "Dashboard temps réel"
    ]
  },
  {
    icon: Shield,
    title: "Conformité garantie",
    description: "Respectez automatiquement tous les requis du règlement européen CBAM",
    items: [
      "Réglementation à jour",
      "Vérifications intégrées",
      "Support juridique"
    ]
  },
  {
    icon: Users,
    title: "Gestion des fournisseurs",
    description: "Centralisez les données de vos fournisseurs et leurs certificats d'émissions",
    items: [
      "Annuaire fournisseurs",
      "Certificats centralisés",
      "Validation automatique"
    ]
  },
  {
    icon: TrendingUp,
    title: "Rapports & Analytics",
    description: "Analysez vos émissions et optimisez votre empreinte carbone",
    items: [
      "Tableaux de bord visuels",
      "Évolution temporelle",
      "Export Excel/PDF"
    ]
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tout ce dont vous avez besoin pour le CBAM
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une plateforme complète pour gérer vos déclarations trimestrielles en toute conformité
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}