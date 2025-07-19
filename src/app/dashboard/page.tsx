"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDays, Users, DollarSign, TrendingUp, FileText, AlertCircle, Database, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { getPatientStats, getTreatmentStats, getRecentTreatments, addSampleData } from "@/lib/firebase"
import Link from "next/link"
import { toast } from "sonner"

interface DashboardStats {
  totalPatients: number
  newPatientsThisMonth: number
  totalRevenue: number
  unpaidAmount: number
  totalTreatments: number
}

interface RecentTreatment {
  id: string
  patientName: string
  diagnosis: string
  totalAmount: number
  paymentStatus: string
  entryDate: Date
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    newPatientsThisMonth: 0,
    totalRevenue: 0,
    unpaidAmount: 0,
    totalTreatments: 0,
  })
  const [recentTreatments, setRecentTreatments] = useState<RecentTreatment[]>([])
  const [loading, setLoading] = useState(true)
  const [sampleDataLoading, setSampleDataLoading] = useState(false)

  const loadDashboardData = async () => {
    try {
      console.log("Loading dashboard data...")
      const [patientStats, treatmentStats, recent] = await Promise.all([
        getPatientStats(),
        getTreatmentStats(),
        getRecentTreatments(5),
      ])

      setStats({
        totalPatients: patientStats.total,
        newPatientsThisMonth: patientStats.newThisMonth,
        totalRevenue: treatmentStats.totalRevenue,
        unpaidAmount: treatmentStats.unpaidAmount,
        totalTreatments: treatmentStats.totalTreatments,
      })

      setRecentTreatments(recent)
      console.log("Dashboard data loaded successfully")
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast.error("Error loading dashboard data. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleAddSampleData = async () => {
    setSampleDataLoading(true)
    try {
      await addSampleData()
      toast.success("Sample data added successfully!")
      // Reload dashboard data
      await loadDashboardData()
    } catch (error) {
      console.error("Error adding sample data:", error)
      toast.error("Error adding sample data. Check console for details.")
    } finally {
      setSampleDataLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {stats.totalPatients === 0 && (
            <Button onClick={handleAddSampleData} variant="outline" disabled={sampleDataLoading}>
              <Database className="mr-2 h-4 w-4" />
              {sampleDataLoading ? "Adding..." : "Add Sample Data"}
            </Button>
          )}
          <Button asChild>
            <Link href="/patients/add">
              <Plus className="mr-2 h-4 w-4" />
              Add New Patient
            </Link>
          </Button>
        </div>
      </div>

      {stats.totalPatients === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">No Data Found</h3>
                <p className="text-sm text-yellow-700">
                  It looks like you don't have any patients yet. Click "Add Sample Data" to get started with some test
                  data, or "Add New Patient" to create your first patient record.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">+{stats.newPatientsThisMonth} new this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalTreatments} treatments completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${stats.unpaidAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Outstanding balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newPatientsThisMonth}</div>
            <p className="text-xs text-muted-foreground">New patients registered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Treatments</CardTitle>
            <CardDescription>Latest patient treatments and their payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTreatments.map((treatment) => (
                <div key={treatment.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{treatment.patientName}</p>
                    <p className="text-sm text-muted-foreground">{treatment.diagnosis}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium">${treatment.totalAmount.toFixed(2)}</div>
                    <Badge variant={treatment.paymentStatus === "PAID" ? "default" : "destructive"}>
                      {treatment.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentTreatments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent treatments found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href="/patients/add">
                <FileText className="mr-2 h-4 w-4" />
                Add New Patient
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/patients">
                <Users className="mr-2 h-4 w-4" />
                View All Patients
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/patients?filter=unpaid">
                <AlertCircle className="mr-2 h-4 w-4" />
                View Unpaid Bills
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/reports">
                <CalendarDays className="mr-2 h-4 w-4" />
                Generate Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
