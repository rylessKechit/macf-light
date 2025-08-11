import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Prêt à simplifier vos déclarations CBAM ?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Rejoignez les centaines de PME qui font confiance à MACF Light pour leur conformité carbone
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Commencer maintenant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#contact">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Demander une démo
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Configuration en 5 minutes • Support inclus • Satisfait ou remboursé 30 jours
        </p>
      </div>
    </section>
  )
}