'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Package, 
  DollarSign, 
  Leaf,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react'
import { formatCurrency, formatCO2, formatNumber, getDaysUntilDeadline } from '@/lib/utils'
import Link from 'next/link'

interface DashboardData {
  stats: {
    totalDeclarations: number
    pendingDeclarations: number
    completedDeclarations: number
    totalImports: number
    totalEmissions: number
    totalValue: number
    nextDeadline: string
    recentActivity: Array<{
      id: string
      type: string
      description: string
      date: string
      relatedId?: string
    }>
  }
  sectorStats: Array<{
    _id: string
    totalImports: number
    totalQuantity: number
    totalValue: number
    totalEmissions: number
  }>
  countryStats: Array<{
    _id: string
    totalImports: number
    totalQuantity: number
    totalValue: number
    totalEmissions: number
  }>
  monthlyTrends: Array<{
    _id: { year: number; month: number }
    totalImports: number
    totalValue: number
    totalEmissions: number
  }>
  recentDeclarations: Array<{
    _id: string
    reportingPeriod: { quarter: number; year: number }
    status: string
    deadlineDate: string
    summary: {
      totalImports: number
      totalEmissions: number
      totalValue: number
    }
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Erreur lors du chargement des données')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Erreur</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Réessayer</Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return <DashboardSkeleton />
  }

  const nextDeadlineDate = new Date(data.stats.nextDeadline)
  const daysUntilDeadline = getDaysUntilDeadline(nextDeadlineDate)
  const isDeadlineUrgent = daysUntilDeadline <= 30

  // Formater les données pour les graphiques
  const sectorChartData = data.sectorStats.map(sector => ({
    name: getSectorLabel(sector._id),
    emissions: sector.totalEmissions,
    value: sector.totalValue,
    imports: sector.totalImports
  }))

  const monthlyChartData = data.monthlyTrends.map(trend => ({
    name: `${trend._id.month}/${trend._id.year}`,
    emissions: trend.totalEmissions,
    value: trend.totalValue,
    imports: trend.totalImports
  }))

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de vos déclarations CBAM
          </p>
        </div>
        <Link href="/dashboard/declarations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle déclaration
          </Button>
        </Link>
      </div>

      {/* Alerte prochaine échéance */}
      {isDeadlineUrgent && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Échéance proche</p>
                <p className="text-sm text-muted-foreground">
                  Prochaine échéance CBAM dans {daysUntilDeadline} jour{daysUntilDeadline > 1 ? 's' : ''} 
                  ({nextDeadlineDate.toLocaleDateString('fr-FR')})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Déclarations totales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalDeclarations}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.pendingDeclarations} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Importations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.totalImports)}</div>
            <p className="text-xs text-muted-foreground">
              Nombre total d'importations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Valeur des importations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Émissions carbone</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCO2(data.stats.totalEmissions, 't')}</div>
            <p className="text-xs text-muted-foreground">
              Total des émissions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Graphique des émissions par secteur */}
        <Card>
          <CardHeader>
            <CardTitle>Émissions par secteur</CardTitle>
            <CardDescription>
              Répartition des émissions carbone par secteur d'activité
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sectorChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="emissions"
                >
                  {sectorChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCO2(Number(value), 't')} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top pays fournisseurs */}
        <Card>
          <CardHeader>
            <CardTitle>Principaux pays fournisseurs</CardTitle>
            <CardDescription>
              Top 5 des pays par valeur d'importation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.countryStats.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis tickFormatter={(value) => formatCurrency(value, 'EUR').replace('€', '')} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="totalValue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Évolution temporelle */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des émissions</CardTitle>
          <CardDescription>
            Évolution des émissions carbone au cours des 6 derniers mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCO2(value, 't').replace(' t CO₂e', '')} />
              <Tooltip formatter={(value) => formatCO2(Number(value), 't')} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="emissions" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Émissions (t CO₂e)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Déclarations récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Déclarations récentes</CardTitle>
            <CardDescription>
              Vos dernières déclarations CBAM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentDeclarations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune déclaration trouvée
                </p>
              ) : (
                data.recentDeclarations.map((declaration) => (
                  <div key={declaration._id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">
                        T{declaration.reportingPeriod.quarter} {declaration.reportingPeriod.year}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {declaration.summary.totalImports} importation{declaration.summary.totalImports > 1 ? 's' : ''} • {formatCO2(declaration.summary.totalEmissions, 't')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(declaration.status)}>
                        {getStatusLabel(declaration.status)}
                      </Badge>
                      <Link href={`/dashboard/declarations/${declaration._id}`}>
                        <Button variant="ghost" size="sm">Voir</Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Dernières actions sur votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune activité récente
                </p>
              ) : (
                data.stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getSectorLabel(sector: string): string {
  const labels: Record<string, string> = {
    cement: 'Ciment',
    iron_steel: 'Fer et acier',
    aluminum: 'Aluminium',
    fertilizers: 'Engrais',
    electricity: 'Électricité',
    hydrogen: 'Hydrogène'
  }
  return labels[sector] || sector
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Soumise',
    validated: 'Validée',
    rejected: 'Rejetée',
    pending: 'En attente'
  }
  return labels[status] || status
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: 'outline',
    submitted: 'default',
    validated: 'secondary',
    rejected: 'destructive',
    pending: 'default'
  }
  return variants[status] || 'outline'
}

function getActivityIcon(type: string) {
  const icons: Record<string, JSX.Element> = {
    declaration_created: <Plus className="h-4 w-4 text-blue-500" />,
    declaration_submitted: <Calendar className="h-4 w-4 text-orange-500" />,
    declaration_validated: <CheckCircle className="h-4 w-4 text-green-500" />,
    import_added: <Package className="h-4 w-4 text-purple-500" />
  }
  return icons[type] || <Clock className="h-4 w-4 text-gray-500" />
}