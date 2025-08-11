import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db/mongodb'
import CbamDeclaration from '@/models/CbamDeclaration'
import CbamImport from '@/models/CbamImport'
import mongoose from 'mongoose'
import { ApiResponse, DashboardStats } from '@/types/cbam'
import { getNextCbamDeadline } from '@/lib/utils'

// GET /api/dashboard - Récupérer les statistiques du tableau de bord
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await connectDB()

    const userId = session.user.id
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // Statistiques générales des déclarations
    const totalDeclarations = await CbamDeclaration.countDocuments({ userId })
    const pendingDeclarations = await CbamDeclaration.countDocuments({ 
      userId, 
      status: { $in: ['draft', 'pending'] } 
    })
    const completedDeclarations = await CbamDeclaration.countDocuments({ 
      userId, 
      status: 'validated' 
    })

    // Récupérer les déclarations récentes
    const recentDeclarationsRaw = await CbamDeclaration.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('reportingPeriod status summary deadlineDate createdAt submittedAt validatedAt')
      .lean()

    // Convertir en plain objects pour éviter les problèmes de typage
    const recentDeclarations = recentDeclarationsRaw.map((decl: any) => ({
      _id: decl._id,
      reportingPeriod: decl.reportingPeriod,
      status: decl.status,
      summary: decl.summary,
      deadlineDate: decl.deadlineDate,
      createdAt: decl.createdAt,
      submittedAt: decl.submittedAt,
      validatedAt: decl.validatedAt
    }))

    // Statistiques des importations
    const importStatsAgg = await CbamImport.aggregate([
      {
        $lookup: {
          from: 'cbamdeclarations',
          localField: 'declarationId',
          foreignField: '_id',
          as: 'declaration'
        }
      },
      { $unwind: '$declaration' },
      { $match: { 'declaration.userId': userObjectId } },
      {
        $group: {
          _id: null,
          totalImports: { $sum: 1 },
          totalEmissions: { $sum: '$carbonEmissions' },
          totalValue: { $sum: '$totalValue' }
        }
      }
    ])

    const importStats = importStatsAgg.length > 0 ? importStatsAgg[0] : {
      totalImports: 0,
      totalEmissions: 0,
      totalValue: 0
    }

    // Prochaine échéance
    const nextDeadline = getNextCbamDeadline()

    // Activité récente
    const recentActivity = []
    for (const decl of recentDeclarations.slice(0, 5)) {
      const period = `T${decl.reportingPeriod.quarter} ${decl.reportingPeriod.year}`
      const declId = decl._id.toString()
      
      if (decl.validatedAt) {
        recentActivity.push({
          id: declId,
          type: 'declaration_validated' as const,
          description: `Déclaration ${period} validée`,
          date: new Date(decl.validatedAt).toISOString(),
          relatedId: declId
        })
      } else if (decl.submittedAt) {
        recentActivity.push({
          id: declId,
          type: 'declaration_submitted' as const,
          description: `Déclaration ${period} soumise`,
          date: new Date(decl.submittedAt).toISOString(),
          relatedId: declId
        })
      } else {
        recentActivity.push({
          id: declId,
          type: 'declaration_created' as const,
          description: `Déclaration ${period} créée`,
          date: new Date(decl.createdAt).toISOString(),
          relatedId: declId
        })
      }
    }

    // Statistiques par secteur
    const sectorStats = await CbamImport.aggregate([
      {
        $lookup: {
          from: 'cbamdeclarations',
          localField: 'declarationId',
          foreignField: '_id',
          as: 'declaration'
        }
      },
      { $unwind: '$declaration' },
      { $match: { 'declaration.userId': userObjectId } },
      {
        $lookup: {
          from: 'cbamproducts',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.sector',
          totalImports: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          totalEmissions: { $sum: '$carbonEmissions' }
        }
      },
      { $sort: { totalEmissions: -1 } }
    ])

    // Statistiques par pays
    const countryStats = await CbamImport.aggregate([
      {
        $lookup: {
          from: 'cbamdeclarations',
          localField: 'declarationId',
          foreignField: '_id',
          as: 'declaration'
        }
      },
      { $unwind: '$declaration' },
      { $match: { 'declaration.userId': userObjectId } },
      {
        $group: {
          _id: '$supplierCountry',
          totalImports: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalValue' },
          totalEmissions: { $sum: '$carbonEmissions' }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 }
    ])

    // Évolution mensuelle
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyTrends = await CbamImport.aggregate([
      {
        $lookup: {
          from: 'cbamdeclarations',
          localField: 'declarationId',
          foreignField: '_id',
          as: 'declaration'
        }
      },
      { $unwind: '$declaration' },
      { 
        $match: { 
          'declaration.userId': userObjectId,
          createdAt: { $gte: sixMonthsAgo }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalImports: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalEmissions: { $sum: '$carbonEmissions' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])

    // Trier les activités par date
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const dashboardStats: DashboardStats = {
      totalDeclarations,
      pendingDeclarations,
      completedDeclarations,
      totalImports: importStats.totalImports,
      totalEmissions: importStats.totalEmissions,
      totalValue: importStats.totalValue,
      nextDeadline: nextDeadline.toISOString(),
      recentActivity: recentActivity.slice(0, 5)
    }

    const response: ApiResponse = {
      success: true,
      data: {
        stats: dashboardStats,
        sectorStats,
        countryStats,
        monthlyTrends,
        recentDeclarations
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}