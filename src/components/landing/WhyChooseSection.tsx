import { Leaf, Euro, Shield, Users } from 'lucide-react'

const reasons = [
  {
    icon: Leaf,
    title: "100% Française",
    description: "Développée en France avec expertise locale du CBAM"
  },
  {
    icon: Euro,
    title: "Prix transparents",
    description: "Tarification claire sans frais cachés ni engagement long terme"
  },
  {
    icon: Shield,
    title: "Sécurité RGPD",
    description: "Hébergement France, conformité RGPD et sécurité bancaire"
  },
  {
    icon: Users,
    title: "Support expert",
    description: "Accompagnement par des spécialistes CBAM français"
  }
]

export function WhyChooseSection() {
  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pourquoi choisir MACF Light ?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une solution française pensée spécifiquement pour les PME
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, index) => (
            <div key={index} className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <reason.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{reason.title}</h3>
              <p className="text-sm text-muted-foreground">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}