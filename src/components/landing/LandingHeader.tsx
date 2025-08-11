import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Leaf } from 'lucide-react'

export function LandingHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">MACF Light</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <Link href="#features" className="text-muted-foreground hover:text-foreground">
            Fonctionnalités
          </Link>
          <Link href="#pricing" className="text-muted-foreground hover:text-foreground">
            Tarifs
          </Link>
          <Link href="#about" className="text-muted-foreground hover:text-foreground">
            À propos
          </Link>
        </nav>
        <div className="flex gap-4">
          <Link href="/auth/signin">
            <Button variant="outline">Se connecter</Button>
          </Link>
          <Link href="/auth/signup">
            <Button>Commencer</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}