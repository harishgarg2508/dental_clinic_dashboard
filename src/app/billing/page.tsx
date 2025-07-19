"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, TrendingUp, AlertCircle, Receipt } from "lucide-react"
import { getAllTreatments } from "@/lib/firebase"
import { format } from "date-fns"

// Add these imports at the top
import { generateReceiptPDF, defaultClinicInfo, sendReceiptToWhatsApp } from "@/lib/receipt-generator"
import { getTreatmentForReceipt } from "@/lib/firebase"
import { toast } from "sonner"

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
}

// Add this function before the component
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
      treatment: {
        id: treatment.id,
        entryDate: treatment.entryDate,
        diagnosis: treatment.diagnosis,
        treatmentPlan: treatment.treatmentPlan,
        toothNumber: treatment.toothNumber,
        totalAmount: treatment.totalAmount,
        amountPaid: treatment.amountPaid,
        balance: treatment.balance,
        paymentStatus: treatment.paymentStatus,
      },
      clinic: defaultClinicInfo,
    })
  } catch (error) {
    console.error("Error generating receipt:", error)
    toast.error("Failed to generate receipt. Please try again.")
  }
}

// Add this new function before the component
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
      treatment: {
        id: treatment.id,
        entryDate: treatment.entryDate,
        diagnosis: treatment.diagnosis,
        treatmentPlan: treatment.treatmentPlan,
        toothNumber: treatment.toothNumber,
        totalAmount: treatment.totalAmount,
        amountPaid: treatment.amountPaid,
        balance: treatment.balance,
        paymentStatus: treatment.paymentStatus,
        tro: treatment.tro,
      },
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
      } finally {
        setLoading(false)
      }
    }

    loadTreatments()
  }, [])

  useEffect(() => {
    let filtered = treatments

    if (statusFilter !== "all") {
      filtered = filtered.filter((treatment) => treatment.paymentStatus === statusFilter)
    }

    setFilteredTreatments(filtered)
  }, [treatments, statusFilter])

  const totalRevenue = treatments.reduce((sum, t) => sum + t.amountPaid, 0)
  const totalOutstanding = treatments.reduce((sum, t) => sum + t.balance, 0)
  const unpaidTreatments = treatments.filter((t) => t.paymentStatus === "UNPAID").length

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Billing & Payments</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Billing & Payments</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {treatments.length} treatments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{unpaidTreatments} unpaid treatments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {treatments.length > 0 ? ((totalRevenue / (totalRevenue + totalOutstanding)) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Payment collection rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>Track all payments and outstanding balances</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreatments.map((treatment) => (
                  <TableRow key={treatment.id}>
                    <TableCell>{format(treatment.entryDate, "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{treatment.patientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{treatment.diagnosis}</TableCell>
                    <TableCell>${treatment.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">${treatment.amountPaid.toFixed(2)}</TableCell>
                    <TableCell className={treatment.balance > 0 ? "text-destructive" : "text-green-600"}>
                      ${treatment.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          treatment.paymentStatus === "PAID"
                            ? "default"
                            : treatment.paymentStatus === "PARTIALLY_PAID"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {treatment.paymentStatus}
                      </Badge>
                    </TableCell>
                    {/* Update the Actions column in the table */}
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleGenerateReceipt(treatment.id)}>
                          <Receipt className="mr-1 h-3 w-3" />
                          Receipt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendToWhatsApp(treatment.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                          </svg>
                          WhatsApp
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTreatments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No billing records found matching your criteria
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
