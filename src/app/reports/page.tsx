"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, TrendingUp, Users, Calendar, BarChart2, DollarSign, Activity, Inbox } from "lucide-react"
import { getAllTreatments, getPatientStats, exportToExcel, getTROAppointments } from "@/lib/firebase"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, isPast } from "date-fns"

// ENHANCEMENT: Type definition for clarity
interface Treatment {
  id: string
  entryDate: Date
  amountPaid: number
  balance: number
  paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID"
  tro?: Date
  // Add other treatment properties as needed for export
  [key: string]: any
}

interface TROAppointment {
  id: string
  patientName: string
  tro: Date
  entryDate: Date
  diagnosis: string
}

interface ReportData {
  totalRevenue: number
  totalTreatments: number
  newPatients: number
  unpaidAmount: number
  treatments: Treatment[]
  troAppointments: TROAppointment[]
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("month")
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalTreatments: 0,
    newPatients: 0,
    unpaidAmount: 0,
    treatments: [],
    troAppointments: [],
  })

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let startDate: Date
        let endDate: Date = now

        switch (dateRange) {
          case "month":
            startDate = startOfMonth(now)
            endDate = endOfMonth(now)
            break
          case "year":
            startDate = startOfYear(now)
            endDate = endOfYear(now)
            break
          default: // 'all'
            startDate = new Date(0)
            break
        }

        // Fetch all data in parallel
        const [allTreatments, patientStats, troAppointments] = await Promise.all([
          getAllTreatments(),
          getPatientStats(),
          getTROAppointments(startOfMonth(now), endOfMonth(now)), // TRO is always for this month
        ])

        const filteredTreatments = allTreatments.filter(
          (t: Treatment) => t.entryDate >= startDate && t.entryDate <= endDate
        )

        const totalRevenue = filteredTreatments.reduce((sum, t) => sum + t.amountPaid, 0)
        const unpaidAmount = filteredTreatments.reduce((sum, t) => sum + t.balance, 0)

        setReportData({
          totalRevenue,
          unpaidAmount,
          treatments: filteredTreatments,
          totalTreatments: filteredTreatments.length,
          newPatients: patientStats.newThisMonth, // This stat is always for the current month
          troAppointments,
        })
      } catch (error) {
        console.error("Error loading report data:", error)
        toast.error("Failed to load report data.")
      } finally {
        setLoading(false)
      }
    }

    loadReportData()
  }, [dateRange])

  const handleExportReport = async () => {
    if (reportData.treatments.length === 0) {
      toast.info("No data available to export for the selected range.")
      return
    }
    try {
      toast.promise(exportToExcel(reportData.treatments, `report-${dateRange}-${format(new Date(), "yyyy-MM-dd")}`), {
        loading: "Generating Excel file...",
        success: "Report exported successfully!",
        error: "Failed to export report.",
      })
    } catch (error) {
      console.error("Error exporting report:", error)
    }
  }

  // ENHANCEMENT: A dedicated loading component for a better skeleton screen
  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
                <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-md" />
                <div className="h-4 w-72 bg-slate-200 animate-pulse rounded-md" />
            </div>
            <div className="flex items-center gap-2">
                <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-md" />
                <div className="h-10 w-36 bg-slate-200 animate-pulse rounded-md" />
            </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
             <Card key={i} className="p-6 bg-white shadow-sm rounded-xl">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                 <div className="h-4 w-20 bg-slate-200 animate-pulse rounded" />
                 <div className="h-10 w-10 bg-slate-200 animate-pulse rounded-full" />
               </CardHeader>
               <CardContent className="p-0 mt-4">
                 <div className="h-8 w-32 bg-slate-200 animate-pulse rounded mb-2" />
                 <div className="h-3 w-40 bg-slate-200 animate-pulse rounded" />
               </CardContent>
             </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Reports & Analytics</h2>
          <p className="text-muted-foreground mt-1">Analyze your clinic's performance.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-white shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} className="shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* ENHANCEMENT: KPI cards with gradients and better styling */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800">Revenue</CardTitle>
                <div className="p-2 bg-green-200/80 rounded-full"><DollarSign className="h-5 w-5 text-green-700" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-700">₹{reportData.totalRevenue.toLocaleString('en-IN')}</div>
                <p className="text-xs text-green-600 capitalize">{dateRange} to date</p>
            </CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">Treatments</CardTitle>
                <div className="p-2 bg-blue-200/80 rounded-full"><FileText className="h-5 w-5 text-blue-700" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-blue-700">{reportData.totalTreatments}</div>
                <p className="text-xs text-blue-600 capitalize">{dateRange} to date</p>
            </CardContent>
        </Card>
         <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-violet-50 to-violet-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-violet-800">New Patients</CardTitle>
                <div className="p-2 bg-violet-200/80 rounded-full"><Users className="h-5 w-5 text-violet-700" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-violet-700">{reportData.newPatients}</div>
                <p className="text-xs text-violet-600">This month</p>
            </CardContent>
        </Card>
        <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-amber-50 to-amber-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-800">TRO Appointments</CardTitle>
                <div className="p-2 bg-amber-200/80 rounded-full"><Calendar className="h-5 w-5 text-amber-700" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-amber-700">{reportData.troAppointments.length}</div>
                <p className="text-xs text-amber-600">Scheduled this month</p>
            </CardContent>
        </Card>
      </div>
      
      {/* ENHANCEMENT: Restyled summary cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm rounded-xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><BarChart2 className="text-blue-600"/>Revenue Summary</CardTitle>
            <CardDescription>Financial performance for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">Total Billed</span>
                    <span className="font-semibold text-gray-800">₹{(reportData.totalRevenue + reportData.unpaidAmount).toLocaleString('en-IN')}</span>
                </li>
                <li className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">Amount Collected</span>
                    <span className="font-semibold text-green-600">₹{reportData.totalRevenue.toLocaleString('en-IN')}</span>
                </li>
                <li className="flex justify-between items-center pb-3">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-semibold text-destructive">₹{reportData.unpaidAmount.toLocaleString('en-IN')}</span>
                </li>
                <li className="flex justify-between items-center border-t pt-4 mt-2 bg-slate-50 p-3 rounded-lg">
                    <span className="font-bold text-gray-700">Collection Rate</span>
                    <span className="font-bold text-lg text-blue-700">
                        {reportData.totalRevenue + reportData.unpaidAmount > 0
                          ? ((reportData.totalRevenue / (reportData.totalRevenue + reportData.unpaidAmount)) * 100).toFixed(1)
                          : "0.0"}%
                    </span>
                </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Activity className="text-violet-600"/>Treatment Analysis</CardTitle>
            <CardDescription>Breakdown of treatments for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
             <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">Paid Treatments</span>
                    <span className="font-semibold text-green-600">{reportData.treatments.filter((t) => t.paymentStatus === "PAID").length}</span>
                </li>
                 <li className="flex justify-between items-center border-b pb-3">
                    <span className="text-muted-foreground">Partially Paid</span>
                    <span className="font-semibold text-amber-600">{reportData.treatments.filter((t) => t.paymentStatus === "PARTIALLY_PAID").length}</span>
                </li>
                <li className="flex justify-between items-center pb-3">
                    <span className="text-muted-foreground">Unpaid Treatments</span>
                    <span className="font-semibold text-destructive">{reportData.treatments.filter((t) => t.paymentStatus === "UNPAID").length}</span>
                </li>
                <li className="flex justify-between items-center border-t pt-4 mt-2 bg-slate-50 p-3 rounded-lg">
                    <span className="font-bold text-gray-700">Avg. Treatment Value</span>
                    <span className="font-bold text-lg text-violet-700">
                        ₹{reportData.totalTreatments > 0
                          ? ((reportData.totalRevenue + reportData.unpaidAmount) / reportData.totalTreatments).toLocaleString('en-IN', {minimumFractionDigits: 2})
                          : "0.00"}
                    </span>
                </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* ENHANCEMENT: Restyled TRO table with badges */}
      <Card className="shadow-sm rounded-xl border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="text-amber-600" />
            Upcoming Appointments (TRO) - {format(new Date(), 'MMMM yyyy')}
          </CardTitle>
          <CardDescription>Patients scheduled for follow-up treatments this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Appointment Date</TableHead>
                  <TableHead>Original Treatment</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.troAppointments.length > 0 ? (
                  reportData.troAppointments.map((appt) => (
                    <TableRow key={appt.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-medium text-gray-800">{appt.patientName}</TableCell>
                      <TableCell className="font-medium text-gray-600">{format(appt.tro, "dd MMM, yyyy")}</TableCell>
                      <TableCell className="text-gray-500">{format(appt.entryDate, "dd MMM, yyyy")}</TableCell>
                      <TableCell className="text-gray-500 max-w-xs truncate">{appt.diagnosis}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`font-semibold ${isPast(appt.tro) ? 'text-red-700 bg-red-100 border-red-200' : 'text-blue-700 bg-blue-100 border-blue-200'}`}>
                            {isPast(appt.tro) ? 'Overdue' : 'Upcoming'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                            <Inbox className="h-12 w-12 text-gray-400" />
                            <h3 className="text-lg font-semibold">All Clear!</h3>
                            <p className="text-sm">No TRO appointments found for this month.</p>
                        </div>
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