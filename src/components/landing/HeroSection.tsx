import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <Badge variant="outline" className="mb-4">
          🇪🇺 Conforme au règlement CBAM 2023/956
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Simplifiez vos <span className="text-primary">déclarations CBAM</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Solution SaaS française dédiée aux PME pour gérer facilement leurs obligations 
          de déclaration carbone dans le cadre du Mécanisme d'Ajustement Carbone aux Frontières (MACF/CBAM).
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Essai gratuit 30 jours
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#demo">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Voir la démo
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Aucune carte bancaire requise • Configuration en 5 minutes
        </p>
      </div>
    </section>
  )
}