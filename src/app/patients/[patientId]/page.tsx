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

      console.log(`💰 Updating payment for treatment ${selectedTreatment.id} to ₹${amount}`)

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
          <Button
           asChild variant="outline" size="sm">
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
          <Button
          className="bg-gray-600 hover:bg-gray-700 text-white" 
           asChild variant="outline" size="sm">
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
          <Button
          className="bg-gray-600 hover:bg-gray-700 text-white"
           onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
          className="bg-green-600 hover:bg-blue-700 text-white"
          
          onClick={handleExportCompletePDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          
          onClick={() => setShowAddTreatment(true)}>
            <Plus className="  mr-2 h-4 w-4" />
            Add Treatment
          </Button>
        </div>
      </div>

    <div className="grid gap-8 md:grid-cols-3">
  {/* Patient Information Card */}
  <Card className="bg-white dark:bg-slate-700 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
    <CardHeader>
      <CardTitle className="flex items-center text-xl font-extrabold text-slate-900 dark:text-slate-100">
        <User className="mr-3 h-6 w-6 text-blue-500" />
        Patient Information
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 text-base">
      <div className="flex items-center space-x-3">
        <Phone className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <span className="font-semibold text-slate-700 dark:text-slate-300">{patient.phone}</span>
      </div>
      <div className="flex items-center space-x-3">
        <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        <span className="font-semibold text-slate-700 dark:text-slate-300">Age: {calculateAge(patient.dob)} years</span>
      </div>
      <div>
        <span className="font-medium text-slate-600 dark:text-slate-400">Gender: </span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{patient.gender || "Not specified"}</span>
      </div>
      <div>
        <span className="font-medium text-slate-600 dark:text-slate-400">First Visit: </span>
        <span className="font-bold text-slate-800 dark:text-slate-200">{format(patient.firstVisitDate, "MMM dd, yyyy")}</span>
      </div>
    </CardContent>
  </Card>

  {/* Financial Summary Card */}
  <Card className="bg-white dark:bg-slate-700 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
    <CardHeader>
      <CardTitle className="flex items-center text-xl font-extrabold text-slate-900 dark:text-slate-100">
        <Receipt className="mr-3 h-6 w-6 text-green-500" />
        Financial Summary
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-slate-600 dark:text-slate-400">Total Billed:</span>
        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">₹{patient.totalBilled.toFixed(2)}</span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-slate-600 dark:text-slate-400">Total Paid:</span>
        <span className="text-lg font-bold text-green-600 dark:text-green-500">₹{patient.totalPaid.toFixed(2)}</span>
      </div>
      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
        <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">Outstanding:</span>
        <span className={`text-2xl font-extrabold ${patient.outstandingBalance > 0 ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"}`}>
          ₹{patient.outstandingBalance.toFixed(2)}
        </span>
      </div>
    </CardContent>
  </Card>

  {/* Treatment Statistics Card */}
  <Card className="bg-white dark:bg-slate-700 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
    <CardHeader>
      <CardTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Treatment Statistics</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-slate-600 dark:text-slate-400">Total Treatments:</span>
        <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{treatments.length}</span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-slate-600 dark:text-slate-400">Paid Treatments:</span>
        <span className="text-xl font-bold text-green-600 dark:text-green-500">
          {treatments.filter((t) => t.paymentStatus === "PAID").length}
        </span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="font-medium text-slate-600 dark:text-slate-400">Upcoming:</span>
        <span className="text-xl font-bold text-blue-600 dark:text-blue-500">
          {treatments.filter((t) => t.tro && new Date(t.tro) > new Date()).length}
        </span>
      </div>
    </CardContent>
  </Card>
</div>

     <Card className="bg-white shadow-md rounded-xl">
  <CardHeader>
    <CardTitle className="text-xl font-bold text-gray-800">
      Treatment History ({treatments.length} treatments)
    </CardTitle>
    <CardDescription className="text-gray-600">
      Complete history of all treatments and procedures for this patient
    </CardDescription>
  </CardHeader>

  <CardContent>
    {treatments.length === 0 ? (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Treatments Found</h3>
        <p className="text-gray-500 mb-4">This patient doesn't have any treatment records yet.</p>
        <Button onClick={() => setShowAddTreatment(true)} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add First Treatment
        </Button>
      </div>
    ) : (
      <div className="rounded-md border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="text-gray-600 font-semibold">Date</TableHead>
              <TableHead className="text-gray-600 font-semibold">Diagnosis</TableHead>
              <TableHead className="text-gray-600 font-semibold">Treatment</TableHead>
              <TableHead className="text-gray-600 font-semibold">Tooth #</TableHead>
              <TableHead className="text-gray-600 font-semibold">Amount</TableHead>
              <TableHead className="text-gray-600 font-semibold">Paid</TableHead>
              <TableHead className="text-gray-600 font-semibold">Balance</TableHead>
              <TableHead className="text-gray-600 font-semibold">Status</TableHead>
              <TableHead className="text-gray-600 font-semibold">Next Appt (TRO)</TableHead>
              <TableHead className="text-gray-600 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {treatments.map((treatment) => {
              const bg =
                treatment.paymentStatus === "PAID"
                  ? "bg-green-50"
                  : treatment.paymentStatus === "PARTIALLY_PAID"
                  ? "bg-yellow-50"
                  : "bg-red-50"

              return (
                <TableRow key={treatment.id} className={`${bg} hover:bg-opacity-80 transition`}>
                  <TableCell className="text-sm text-gray-700">
                    {format(treatment.entryDate, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-gray-700">
                    <div className="truncate" title={treatment.diagnosis}>
                      {treatment.diagnosis}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-gray-600">
                    <div className="truncate" title={treatment.treatmentPlan}>
                      {treatment.treatmentPlan}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {treatment.toothNumber || "N/A"}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-800">
                    ₹{treatment.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-green-600">
                    ₹{treatment.amountPaid.toFixed(2)}
                  </TableCell>
                  <TableCell className={treatment.balance > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                    ₹{treatment.balance.toFixed(2)}
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
                      className="text-xs px-2 py-1 font-semibold"
                    >
                      {treatment.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {treatment.tro ? (
                      <span className="text-blue-600 font-medium text-sm">
                        {format(treatment.tro, "MMM dd, yyyy")}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => openEditPayment(treatment)}
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleGenerateReceipt(treatment)}
                        className="bg-purple-100 text-purple-800 hover:bg-purple-200"
                      >
                        <Receipt className="mr-1 h-3 w-3" />
                        Receipt
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleSendToWhatsApp(treatment)}
                        className="bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        <svg className="mr-1 h-3 w-3 text-green-600 bg" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c...Z" />
                        </svg>
                        WhatsApp
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )}
  </CardContent>
</Card>


  {/* Add Treatment Dialog */}
<Dialog open={showAddTreatment} onOpenChange={setShowAddTreatment}>
  <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Add New Treatment
      </DialogTitle>
      <DialogDescription className="text-slate-600 dark:text-slate-400">
        Add a new treatment record for{' '}
        <strong className="text-slate-700 dark:text-slate-300">{patient.name}</strong> (ID: {patient.id})
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleAddTreatment}>
      <div className="grid gap-6 py-4">
        {/* Input fields with improved styling */}
        <div className="space-y-2">
          <Label htmlFor="diagnosis" className="font-medium text-slate-700 dark:text-slate-300">
            Diagnosis *
          </Label>
          <Textarea
            id="diagnosis"
            value={newTreatment.diagnosis}
            onChange={(e) => setNewTreatment((prev) => ({ ...prev, diagnosis: e.target.value }))}
            placeholder="Enter diagnosis details"
            required
            className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="treatmentPlan" className="font-medium text-slate-700 dark:text-slate-300">
            Treatment Plan
          </Label>
          <Textarea
            id="treatmentPlan"
            value={newTreatment.treatmentPlan}
            onChange={(e) => setNewTreatment((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
            placeholder="Describe the treatment plan"
            className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="toothNumber" className="font-medium text-slate-700 dark:text-slate-300">
              Tooth Number
            </Label>
            <Input
              id="toothNumber"
              value={newTreatment.toothNumber}
              onChange={(e) => setNewTreatment((prev) => ({ ...prev, toothNumber: e.target.value }))}
              placeholder="e.g., 25, 14-15"
              className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tro" className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              Next Appointment (TRO)
            </Label>
            <Input
              id="tro"
              type="date"
              value={newTreatment.tro}
              onChange={(e) => setNewTreatment((prev) => ({ ...prev, tro: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="bg-slate-50 border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalAmount" className="font-medium text-slate-700 dark:text-slate-300">
              Total Amount *
            </Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={newTreatment.totalAmount}
              onChange={(e) => setNewTreatment((prev) => ({ ...prev, totalAmount: e.target.value }))}
              placeholder="0.00"
              required
              className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountPaid" className="font-medium text-slate-700 dark:text-slate-300">
              Amount Paid
            </Label>
            <Input
              id="amountPaid"
              type="number"
              step="0.01"
              min="0"
              value={newTreatment.amountPaid}
              onChange={(e) => setNewTreatment((prev) => ({ ...prev, amountPaid: e.target.value }))}
              placeholder="0.00"
              className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Financial Summary Box */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Amount:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                ₹{parseFloat(newTreatment.totalAmount || '0').toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Amount Paid:</span>
              <span className="font-semibold text-green-600 dark:text-green-500">
                ₹{parseFloat(newTreatment.amountPaid || '0').toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
              <span className="text-slate-700 dark:text-slate-300">Balance Due:</span>
              <span
                className={
                  parseFloat(newTreatment.totalAmount || '0') - parseFloat(newTreatment.amountPaid || '0') > 0
                    ? 'text-red-600 dark:text-red-500'
                    : 'text-green-600 dark:text-green-500'
                }
              >
                ₹{(parseFloat(newTreatment.totalAmount || '0') - parseFloat(newTreatment.amountPaid || '0')).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddTreatment(false)}
          disabled={addingTreatment}
          className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={addingTreatment} className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
          {addingTreatment ? 'Adding...' : 'Add Treatment'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>


     {/* Edit Payment Dialog */}
<Dialog open={showEditPayment} onOpenChange={setShowEditPayment}>
  <DialogContent className="bg-gray-900 text-gray-100">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold text-white">Update Payment</DialogTitle>
      <DialogDescription className="text-sm text-gray-400">
        Update payment for treatment: {selectedTreatment?.diagnosis}
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleUpdatePayment}>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Treatment Details</Label>
          <div className="p-3 bg-gray-800 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Amount:</span>
              <span className="font-medium text-white">₹{selectedTreatment?.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Paid:</span>
              <span className="font-medium text-green-400">₹{selectedTreatment?.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Balance:</span>
              <span className="font-medium text-red-400">₹{selectedTreatment?.balance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentAmount" className="text-gray-300">New Payment Amount</Label>
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
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
          />
        </div>

        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-sm">
            <div className="flex justify-between font-medium">
              <span className="text-gray-400">New Balance:</span>
              <span
                className={
                  (selectedTreatment?.totalAmount || 0) - Number.parseFloat(paymentAmount || "0") > 0
                    ? "text-red-400"
                    : "text-green-400"
                }
              >
                ₹{((selectedTreatment?.totalAmount || 0) - Number.parseFloat(paymentAmount || "0")).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowEditPayment(false)}
          disabled={updatingPayment}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={updatingPayment}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {updatingPayment ? "Updating Payment..." : "Update Payment"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

    </div>
  )
}
