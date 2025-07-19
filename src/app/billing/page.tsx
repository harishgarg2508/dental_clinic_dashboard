"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Receipt,
  Inbox,
} from "lucide-react"
import { getAllTreatments, getTreatmentForReceipt } from "@/lib/firebase"
import {
  generateReceiptPDF,
  defaultClinicInfo,
  sendReceiptToWhatsApp,
} from "@/lib/receipt-generator"
import { toast } from "sonner"
import { format } from "date-fns"

// --- Helper for styling status badges ---
const statusColorMap = {
  PAID: "bg-green-100 text-green-800 border-green-200",
  UNPAID: "bg-red-100 text-red-800 border-red-200",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800 border-yellow-200",
}

interface Treatment {
  id: string
  patientId: string
  patientName: string
  entryDate: Date
  diagnosis: string
  treatmentPlan: string
  toothNumber: string
  totalAmount: number
  amountPaid: number
  balance: number
  paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID"
  tro?: string
}

const handleGenerateReceipt = async (treatmentId: string) => {
  try {
    const { treatment, patient } = await getTreatmentForReceipt(treatmentId)
    await generateReceiptPDF({
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        dob: patient.dob,
        gender: patient.gender,
      },
      treatment,
      clinic: defaultClinicInfo,
    })
    toast.success("Receipt generated successfully!")
  } catch (error) {
    console.error("Error generating receipt:", error)
    toast.error("Failed to generate receipt. Please try again.")
  }
}

const handleSendToWhatsApp = async (treatmentId: string) => {
  try {
    const { treatment, patient } = await getTreatmentForReceipt(treatmentId)
    await sendReceiptToWhatsApp({
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        dob: patient.dob,
        gender: patient.gender,
      },
      treatment,
      clinic: defaultClinicInfo,
    })
    toast.success("Receipt sent to WhatsApp successfully!")
  } catch (error) {
    console.error("Error sending to WhatsApp:", error)
    toast.error("Failed to send receipt to WhatsApp. Please try again.")
  }
}

export default function BillingPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [filteredTreatments, setFilteredTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const data = await getAllTreatments()
        setTreatments(data)
        setFilteredTreatments(data)
      } catch (error) {
        console.error("Error loading treatments:", error)
        toast.error("Could not load billing data.")
      } finally {
        setLoading(false)
      }
    }
    loadTreatments()
  }, [])

  useEffect(() => {
    let filtered = treatments
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.paymentStatus === statusFilter)
    }
    setFilteredTreatments(filtered)
  }, [treatments, statusFilter])

  const totalRevenue = treatments.reduce((sum, t) => sum + t.amountPaid, 0)
  const totalOutstanding = treatments.reduce((sum, t) => sum + t.balance, 0)
  const totalPotential = totalRevenue + totalOutstanding
  const unpaidTreatmentsCount = treatments.filter(
    (t) => t.paymentStatus === "UNPAID" || t.paymentStatus === "PARTIALLY_PAID"
  ).length

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-md mb-2" />
        <div className="h-4 w-96 bg-slate-200 animate-pulse rounded-md mb-8" />
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Billing & Payments
        </h2>
        <p className="text-muted-foreground mt-1">
          A complete overview of your clinic's financial health.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Revenue
            </CardTitle>
            <div className="p-2 bg-green-200/80 rounded-full">
              <DollarSign className="h-5 w-5 text-green-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-green-600">
              From {treatments.length} total treatments
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-red-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Outstanding Amount
            </CardTitle>
            <div className="p-2 bg-red-200/80 rounded-full">
              <AlertCircle className="h-5 w-5 text-red-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-red-600">
              From {unpaidTreatmentsCount} pending treatments
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl border-none bg-gradient-to-br from-blue-50 to-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Collection Rate
            </CardTitle>
            <div className="p-2 bg-blue-200/80 rounded-full">
              <TrendingUp className="h-5 w-5 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {totalPotential > 0
                ? ((totalRevenue / totalPotential) * 100).toFixed(1)
                : "0.0"}
              %
            </div>
            <p className="text-xs text-blue-600">
              Percentage of payments collected
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm rounded-xl border-slate-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-gray-800">
                Payment Records
              </CardTitle>
              <CardDescription className="mt-1">
                Track all payments and outstanding balances.
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreatments.length > 0 ? (
                  filteredTreatments.map((treatment) => (
                    <TableRow
                      key={treatment.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <TableCell className="font-medium text-gray-600 whitespace-nowrap">
                        {format(treatment.entryDate, "dd MMM, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium text-gray-800">
                        {treatment.patientName}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-gray-600">
                        {treatment.diagnosis}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        ₹{treatment.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium whitespace-nowrap">
                        ₹{treatment.amountPaid.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium whitespace-nowrap ${
                          treatment.balance > 0
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        ₹{treatment.balance.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`font-semibold ${
                            statusColorMap[treatment.paymentStatus]
                          }`}
                        >
                          {treatment.paymentStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center space-x-2 transition-transform hover:scale-105">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateReceipt(treatment.id)}
                            className="hover:bg-slate-100 transition-all"
                          >
                            <Receipt className="mr-1.5 h-4 w-4" />
                            Receipt
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendToWhatsApp(treatment.id)}
                            className="text-green-600 border-green-200 hover:text-green-700 hover:bg-green-50 transition-all"
                          >
                            <svg
                              className="mr-1.5 h-4 w-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M16.75 13.96c.25.13.48.22.69.3.23.09.44.16.63.21.2.05.38.08.54.1.18.02.34.03.48.03.58 0 1.09-.12 1.54-.38.45-.26.8-.63 1.05-1.1s.38-.99.38-1.58c0-.66-.15-1.28-.45-1.88s-.7-1.09-1.2-1.48c-.5-.39-1.09-.68-1.76-.85s-1.4-.25-2.18-.25c-.86 0-1.69.13-2.48.4s-1.52.66-2.19 1.18c-.67.52-1.23 1.15-1.67 1.88s-.67 1.53-.67 2.4c0 .76.15 1.47.45 2.13.3.66.7 1.22 1.2 1.67.5.45 1.08.8 1.75 1.03.67.23 1.38.34 2.12.34.25 0 .5-.02.75-.07s.49-.11.7-.2c.2-.09.38-.19.53-.3.15-.11.28-.23.38-.35.04-.04.08-.08.1-.13l.07-.13c.02-.03.03-.05.03-.06zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.73 0 3.39-.44 4.85-1.22l3.43.91-.93-3.32A9.97 9.97 0 0022 12C22 6.48 17.52 2 12 2z" />
                            </svg>
                            Share
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-16 text-gray-500"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Inbox className="h-12 w-12 text-gray-400" />
                        <h3 className="text-lg font-semibold">No Records Found</h3>
                        <p className="text-sm">
                          No billing records match your current filter.
                        </p>
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