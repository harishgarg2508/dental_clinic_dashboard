"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Edit, Receipt, Phone, Calendar, User, Download, RefreshCw, AlertCircle } from "lucide-react"
import Link from "next/link"
import {
  getPatientById,
  getPatientTreatments,
  addTreatmentToPatient,
  updateTreatmentPayment,
  getCompletePatientData,
} from "@/lib/firebase"
import { format, differenceInYears } from "date-fns"
import { toast } from "sonner"
import {
  generateReceiptPDF,
  generatePatientCompletePDF,
  defaultClinicInfo,
  sendReceiptToWhatsApp,
} from "@/lib/receipt-generator"

interface Patient {
  id: string
  name: string
  phone: string
  dob: string
  gender: string
  firstVisitDate: Date
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
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
  tro?: Date
}

export default function PatientDetailPage() {
  const params = useParams()
  const patientId = params.patientId as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddTreatment, setShowAddTreatment] = useState(false)
  const [showEditPayment, setShowEditPayment] = useState(false)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [addingTreatment, setAddingTreatment] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)

  const [newTreatment, setNewTreatment] = useState({
    diagnosis: "",
    treatmentPlan: "",
    toothNumber: "",
    totalAmount: "",
    amountPaid: "",
    tro: "",
  })

  const [paymentAmount, setPaymentAmount] = useState("")

  const loadPatientData = async () => {
    try {
      console.log(`🔄 ===== LOADING PATIENT DATA =====`)
      console.log(`👤 Patient ID: "${patientId}"`)

      if (!patientId || patientId.trim() === "") {
        throw new Error("Invalid patient ID")
      }

      // Load patient and treatments in parallel
      const [patientData, treatmentData] = await Promise.all([
        getPatientById(patientId),
        getPatientTreatments(patientId),
      ])

      console.log(`✅ Patient loaded: "${patientData.name}"`)
      console.log(`✅ Treatments loaded: ${treatmentData.length} treatments`)

      setPatient(patientData)
      setTreatments(treatmentData)

      console.log(`🎉 ===== PATIENT DATA LOADING COMPLETED =====`)
    } catch (error) {
      console.error("❌ ===== PATIENT DATA LOADING FAILED =====")
      console.error("Error:", error)
      toast.error(`Failed to load patient data: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  useEffect(() => {
    if (patientId) {
      console.log(`🚀 Component mounted with patientId: "${patientId}"`)
      setLoading(true)
      loadPatientData().finally(() => setLoading(false))
    }
  }, [patientId])

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered")
    setRefreshing(true)
    await loadPatientData()
    setRefreshing(false)
    toast.success("Data refreshed successfully!")
  }

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingTreatment(true)

    try {
      console.log(`🏥 ===== STARTING TREATMENT ADDITION =====`)
      console.log(`👤 Target Patient ID: "${patientId}"`)
      console.log(`🏥 Form data:`, newTreatment)

      // Validation
      const totalAmount = Number.parseFloat(newTreatment.totalAmount)
      const amountPaid = Number.parseFloat(newTreatment.amountPaid) || 0

      if (isNaN(totalAmount) || totalAmount <= 0) {
        toast.error("Please enter a valid total amount")
        return
      }

      if (amountPaid > totalAmount) {
        toast.error("Amount paid cannot exceed total amount")
        return
      }

      if (!newTreatment.diagnosis.trim()) {
        toast.error("Please enter a diagnosis")
        return
      }

      // Prepare treatment data
      const treatmentData = {
        diagnosis: newTreatment.diagnosis.trim(),
        treatmentPlan: newTreatment.treatmentPlan.trim(),
        toothNumber: newTreatment.toothNumber.trim(),
        totalAmount,
        amountPaid,
        tro: newTreatment.tro ? new Date(newTreatment.tro) : undefined,
      }

      console.log(`🏥 Prepared treatment data:`, treatmentData)

      // ⚠️ CRITICAL: Use addTreatmentToPatient for existing patients
      console.log(`🏥 Calling addTreatmentToPatient with patientId: "${patientId}"`)
      const treatmentId = await addTreatmentToPatient(patientId, treatmentData)
      console.log(`✅ Treatment added with ID: ${treatmentId}`)

      // Reload data to show the new treatment
      console.log(`🔄 Reloading patient data after treatment addition...`)
      await loadPatientData()

      // Reset form and close dialog
      setShowAddTreatment(false)
      setNewTreatment({
        diagnosis: "",
        treatmentPlan: "",
        toothNumber: "",
        totalAmount: "",
        amountPaid: "",
        tro: "",
      })

      toast.success("Treatment added successfully!")
      console.log(`🎉 ===== TREATMENT ADDITION COMPLETED =====`)
    } catch (error) {
      console.error("❌ ===== TREATMENT ADDITION FAILED =====")
      console.error("Error:", error)
      toast.error(`Failed to add treatment: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setAddingTreatment(false)
    }
  }

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingPayment(true)

    if (!selectedTreatment) return

    try {
      const amount = Number.parseFloat(paymentAmount)

      if (isNaN(amount) || amount < 0) {
        toast.error("Please enter a valid payment amount")
        return
      }

      if (amount > selectedTreatment.totalAmount) {
        toast.error("Payment amount cannot exceed total amount")
        return
      }

      console.log(`💰 Updating payment for treatment ${selectedTreatment.id} to $${amount}`)

      await updateTreatmentPayment(selectedTreatment.id, amount)

      // Reload data
      await loadPatientData()

      setShowEditPayment(false)
      setSelectedTreatment(null)
      setPaymentAmount("")

      toast.success("Payment updated successfully!")
    } catch (error) {
      console.error("❌ Error updating payment:", error)
      toast.error("Failed to update payment")
    } finally {
      setUpdatingPayment(false)
    }
  }

  const openEditPayment = (treatment: Treatment) => {
    console.log(`💰 Opening payment editor for treatment:`, treatment)
    setSelectedTreatment(treatment)
    setPaymentAmount(treatment.amountPaid.toString())
    setShowEditPayment(true)
  }

  const calculateAge = (dob: string) => {
    if (!dob) return "N/A"
    return differenceInYears(new Date(), new Date(dob))
  }

  const handleGenerateReceipt = async (treatment: Treatment) => {
    try {
      if (!patient) return

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
          tro: treatment.tro,
        },
        clinic: defaultClinicInfo,
      })
    } catch (error) {
      console.error("Error generating receipt:", error)
      toast.error("Failed to generate receipt. Please try again.")
    }
  }

  const handleExportCompletePDF = async () => {
    try {
      if (!patient) return

      const { patient: patientData, treatments: treatmentsData } = await getCompletePatientData(patientId)
      await generatePatientCompletePDF(patientData, treatmentsData)
      toast.success("Complete patient record exported successfully!")
    } catch (error) {
      console.error("Error exporting complete PDF:", error)
      toast.error("Failed to export complete record. Please try again.")
    }
  }

  const handleSendToWhatsApp = async (treatment: Treatment) => {
    try {
      if (!patient) return

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/patients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Patient Not Found</h3>
            <p className="text-red-700 mb-4">
              Could not find patient with ID: <code className="bg-red-100 px-2 py-1 rounded">{patientId}</code>
            </p>
            <div className="flex justify-center space-x-2">
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Retry
              </Button>
              <Button asChild variant="outline">
                <Link href="/patients">Back to Patients</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/patients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{patient.name}</h2>
            <p className="text-sm text-muted-foreground">Patient ID: {patient.id}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleExportCompletePDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => setShowAddTreatment(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Treatment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{patient.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Age: {calculateAge(patient.dob)} years</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Gender: </span>
              <span>{patient.gender || "Not specified"}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">First Visit: </span>
              <span>{format(patient.firstVisitDate, "MMM dd, yyyy")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Billed:</span>
              <span className="font-medium">${patient.totalBilled.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Paid:</span>
              <span className="font-medium text-green-600">${patient.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Outstanding Balance:</span>
              <span className={`font-bold ${patient.outstandingBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                ${patient.outstandingBalance.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Treatment Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Treatments:</span>
              <span className="font-medium">{treatments.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Paid Treatments:</span>
              <span className="font-medium text-green-600">
                {treatments.filter((t) => t.paymentStatus === "PAID").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Upcoming Appointments:</span>
              <span className="font-medium text-blue-600">
                {treatments.filter((t) => t.tro && t.tro > new Date()).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treatment History ({treatments.length} treatments)</CardTitle>
          <CardDescription>Complete history of all treatments and procedures for this patient</CardDescription>
        </CardHeader>
        <CardContent>
          {treatments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Treatments Found</h3>
              <p className="text-muted-foreground mb-4">This patient doesn't have any treatment records yet.</p>
              <Button onClick={() => setShowAddTreatment(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Treatment
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Tooth #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Appt (TRO)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatments.map((treatment) => (
                    <TableRow key={treatment.id}>
                      <TableCell>{format(treatment.entryDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={treatment.diagnosis}>
                          {treatment.diagnosis}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={treatment.treatmentPlan}>
                          {treatment.treatmentPlan}
                        </div>
                      </TableCell>
                      <TableCell>{treatment.toothNumber || "N/A"}</TableCell>
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
                      <TableCell>
                        {treatment.tro ? (
                          <span
                            className={`text-sm ${treatment.tro > new Date() ? "text-blue-600 font-medium" : "text-muted-foreground"}`}
                          >
                            {format(treatment.tro, "MMM dd, yyyy")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditPayment(treatment)}>
                            <Edit className="mr-1 h-3 w-3" />
                            Edit Payment
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleGenerateReceipt(treatment)}>
                            <Receipt className="mr-1 h-3 w-3" />
                            Receipt
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendToWhatsApp(treatment)}
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
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Treatment Dialog */}
      <Dialog open={showAddTreatment} onOpenChange={setShowAddTreatment}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Treatment</DialogTitle>
            <DialogDescription>
              Add a new treatment record for <strong>{patient.name}</strong> (ID: {patient.id})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTreatment}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                <Textarea
                  id="diagnosis"
                  value={newTreatment.diagnosis}
                  onChange={(e) => setNewTreatment((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis details"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatmentPlan">Treatment Plan</Label>
                <Textarea
                  id="treatmentPlan"
                  value={newTreatment.treatmentPlan}
                  onChange={(e) => setNewTreatment((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
                  placeholder="Describe the treatment plan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toothNumber">Tooth Number</Label>
                <Input
                  id="toothNumber"
                  value={newTreatment.toothNumber}
                  onChange={(e) => setNewTreatment((prev) => ({ ...prev, toothNumber: e.target.value }))}
                  placeholder="e.g., 25, 14-15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tro" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Next Appointment (TRO) - Optional
                </Label>
                <Input
                  id="tro"
                  type="date"
                  value={newTreatment.tro}
                  onChange={(e) => setNewTreatment((prev) => ({ ...prev, tro: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for one-day treatments that don't require follow-up
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTreatment.totalAmount}
                    onChange={(e) => setNewTreatment((prev) => ({ ...prev, totalAmount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Amount Paid</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newTreatment.amountPaid}
                    onChange={(e) => setNewTreatment((prev) => ({ ...prev, amountPaid: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>${Number.parseFloat(newTreatment.totalAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>${Number.parseFloat(newTreatment.amountPaid || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1 mt-1">
                    <span>Balance:</span>
                    <span
                      className={
                        Number.parseFloat(newTreatment.totalAmount || "0") -
                          Number.parseFloat(newTreatment.amountPaid || "0") >
                        0
                          ? "text-destructive"
                          : "text-green-600"
                      }
                    >
                      $
                      {(
                        Number.parseFloat(newTreatment.totalAmount || "0") -
                        Number.parseFloat(newTreatment.amountPaid || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                  {newTreatment.tro && (
                    <div className="flex justify-between mt-2 pt-2 border-t">
                      <span className="text-blue-600">Next Appointment:</span>
                      <span className="text-blue-600 font-medium">
                        {new Date(newTreatment.tro).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTreatment(false)}
                disabled={addingTreatment}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingTreatment}>
                {addingTreatment ? "Adding Treatment..." : "Add Treatment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={showEditPayment} onOpenChange={setShowEditPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment</DialogTitle>
            <DialogDescription>Update payment for treatment: {selectedTreatment?.diagnosis}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePayment}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Treatment Details</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>${selectedTreatment?.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Paid:</span>
                    <span>${selectedTreatment?.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span>${selectedTreatment?.balance.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">New Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedTreatment?.totalAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="flex justify-between font-medium">
                    <span>New Balance:</span>
                    <span
                      className={
                        (selectedTreatment?.totalAmount || 0) - Number.parseFloat(paymentAmount || "0") > 0
                          ? "text-destructive"
                          : "text-green-600"
                      }
                    >
                      ${((selectedTreatment?.totalAmount || 0) - Number.parseFloat(paymentAmount || "0")).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditPayment(false)}
                disabled={updatingPayment}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatingPayment}>
                {updatingPayment ? "Updating Payment..." : "Update Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
