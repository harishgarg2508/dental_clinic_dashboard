"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileText, TrendingUp, Users, Calendar } from "lucide-react"
import { getAllTreatments, getPatientStats, exportToExcel, getTROAppointments } from "@/lib/firebase"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("month")
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalTreatments: 0,
    newPatients: 0,
    unpaidAmount: 0,
    treatments: [] as any[],
    troAppointments: [] as any[],
  })

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const [treatments, patientStats] = await Promise.all([getAllTreatments(), getPatientStats()])

        // Filter treatments based on date range
        const now = new Date()
        let startDate: Date
        let endDate: Date

        switch (dateRange) {
          case "month":
            startDate = startOfMonth(now)
            endDate = endOfMonth(now)
            break
          case "year":
            startDate = startOfYear(now)
            endDate = endOfYear(now)
            break
          default:
            startDate = new Date(0)
            endDate = now
        }

        const filteredTreatments = treatments.filter((t) => t.entryDate >= startDate && t.entryDate <= endDate)

        // Get TRO appointments for this month
        const troAppointments = await getTROAppointments(startOfMonth(now), endOfMonth(now))

        const totalRevenue = filteredTreatments.reduce((sum, t) => sum + t.amountPaid, 0)
        const unpaidAmount = filteredTreatments.reduce((sum, t) => sum + t.balance, 0)

        setReportData({
          totalRevenue,
          totalTreatments: filteredTreatments.length,
          newPatients: patientStats.newThisMonth,
          unpaidAmount,
          treatments: filteredTreatments,
          troAppointments,
        })
      } catch (error) {
        console.error("Error loading report data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadReportData()
  }, [dateRange])

  const handleExportReport = async () => {
    try {
      await exportToExcel(reportData.treatments, `report-${dateRange}-${format(new Date(), "yyyy-MM-dd")}`)
    } catch (error) {
      console.error("Error exporting report:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${reportData.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange === "month" ? "This month" : dateRange === "year" ? "This year" : "All time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treatments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalTreatments}</div>
            <p className="text-xs text-muted-foreground">Total treatments completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.newPatients}</div>
            <p className="text-xs text-muted-foreground">New registrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TRO Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{reportData.troAppointments.length}</div>
            <p className="text-xs text-muted-foreground">This month's appointments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Summary</CardTitle>
            <CardDescription>Financial performance overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Billed:</span>
              <span className="font-medium">${(reportData.totalRevenue + reportData.unpaidAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount Collected:</span>
              <span className="font-medium text-green-600">${reportData.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Outstanding:</span>
              <span className="font-medium text-destructive">${reportData.unpaidAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Collection Rate:</span>
                <span className="font-bold">
                  {reportData.totalRevenue + reportData.unpaidAmount > 0
                    ? ((reportData.totalRevenue / (reportData.totalRevenue + reportData.unpaidAmount)) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treatment Analysis</CardTitle>
            <CardDescription>Treatment patterns and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Treatments:</span>
              <span className="font-medium">{reportData.totalTreatments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Paid Treatments:</span>
              <span className="font-medium text-green-600">
                {reportData.treatments.filter((t) => t.paymentStatus === "PAID").length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Unpaid Treatments:</span>
              <span className="font-medium text-destructive">
                {reportData.treatments.filter((t) => t.paymentStatus === "UNPAID").length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Follow-up Required:</span>
              <span className="font-medium text-blue-600">
                {reportData.treatments.filter((t) => t.tro && t.tro > new Date()).length}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Average Treatment Value:</span>
                <span className="font-bold">
                  $
                  {reportData.totalTreatments > 0
                    ? ((reportData.totalRevenue + reportData.unpaidAmount) / reportData.totalTreatments).toFixed(2)
                    : "0.00"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TRO Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Upcoming Appointments (TRO) - This Month
          </CardTitle>
          <CardDescription>Patients scheduled for follow-up treatments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Appointment Date</TableHead>
                  <TableHead>Last Treatment</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.troAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">{appointment.patientName}</TableCell>
                    <TableCell>
                      <span
                        className={`${appointment.tro > new Date() ? "text-blue-600 font-medium" : "text-red-600"}`}
                      >
                        {format(appointment.tro, "MMM dd, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>{format(appointment.entryDate, "MMM dd, yyyy")}</TableCell>
                    <TableCell>{appointment.diagnosis}</TableCell>
                    <TableCell>
                      {appointment.tro > new Date() ? (
                        <span className="text-blue-600 text-sm">Upcoming</span>
                      ) : (
                        <span className="text-red-600 text-sm">Overdue</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {reportData.troAppointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No TRO appointments scheduled for this month
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
