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
import { ArrowLeft, Plus, Edit, Receipt, Phone, Calendar, User, Download, RefreshCw, AlertCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  getPatientById,
  getPatientTreatments,
  addTreatmentToPatient,
  updateTreatmentPayment,
  getCompletePatientData,
  deleteSingleTreatment,
  addPatientPayment,
} from "@/lib/firebase"
import { format, differenceInYears } from "date-fns"
import { toast } from "sonner"
import {
  generateReceiptPDF,
  generatePatientCompletePDF,
  defaultClinicInfo,
  sendReceiptToWhatsApp,
} from "@/lib/receipt-generator"

interface PatientPayment {
  amount: number
  date: Date
  note?: string
}

interface Patient {
  id: string
  name: string
  phone: string
  age: number
  gender: string
  firstVisitDate: Date
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
  paymentHistory?: PatientPayment[]
}

interface PaymentRecord {
  amount: number
  date: Date | { toDate(): Date } // Support both Date and Firestore Timestamp
  note?: string
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
  paymentHistory: PaymentRecord[]
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
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [addingTreatment, setAddingTreatment] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState("")
  const [newPaymentNote, setNewPaymentNote] = useState("")

 const [newTreatment, setNewTreatment] = useState({
    diagnosis: "",
    treatmentPlan: "",
    toothNumber: "",
    totalAmount: "",
    amountPaid: "",
    entryDate:"", //new Date().toISOString().split("T")[0], // Default to today
    tro: "",
  })

  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNote, setPaymentNote] = useState("")

  const handleDeleteTreatment = async (treatmentId: string, diagnosis: string) => {
    if (window.confirm(`Are you sure you want to delete the treatment: "${diagnosis}"? This action cannot be undone.`)) {
      try {
        await deleteSingleTreatment(treatmentId);
        
        // Instantly update the UI by removing the treatment from the local state
        // and reloading the patient data to get the updated financial summary.
        setTreatments(prev => prev.filter(t => t.id !== treatmentId));
        await loadPatientData(); // Reload to update financial cards
        
        toast.success("Treatment deleted successfully.");
      } catch (error) {
        console.error("Error deleting treatment:", error);
        toast.error("Failed to delete treatment.");
      }
    }
  };
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

      const totalAmount = Number.parseFloat(newTreatment.totalAmount)
      const amountPaid = Number.parseFloat(newTreatment.amountPaid) || 0

      if (isNaN(totalAmount) || totalAmount < 0) {
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

      const treatmentData = {
        diagnosis: newTreatment.diagnosis.trim(),
        treatmentPlan: newTreatment.treatmentPlan.trim(),
        toothNumber: newTreatment.toothNumber.trim(),
        totalAmount,
        amountPaid,
        entryDate: new Date(newTreatment.entryDate),
        tro: newTreatment.tro ? new Date(newTreatment.tro) : undefined,
        paymentHistory: amountPaid > 0 ? [{
          amount: amountPaid,
          date: new Date(),
          note: "Initial payment"
        }] : []
      }

      console.log(`🏥 Prepared treatment data:`, treatmentData)
      console.log(`🏥 Calling addTreatmentToPatient with patientId: "${patientId}"`)
      const treatmentId = await addTreatmentToPatient(patientId, treatmentData)
      console.log(`✅ Treatment added with ID: ${treatmentId}`)

      console.log(`🔄 Reloading patient data after treatment addition...`)
      await loadPatientData()

      setShowAddTreatment(false)
      setNewTreatment({
        diagnosis: "",
        treatmentPlan: "",
        toothNumber: "",
        totalAmount: "",
        amountPaid: "",
        entryDate:"",// new Date().toISOString().split("T")[0],
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
  const handleAddPatientPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingPayment(true)

    try {
      const amount = Number.parseFloat(newPaymentAmount)

      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid payment amount")
        return
      }

      if (!patient || amount > patient.outstandingBalance) {
        toast.error("Payment amount cannot exceed outstanding balance")
        return
      }

      console.log(`💰 Adding new patient payment: ₹${amount}`)

      // Call the new addPatientPayment function
      await addPatientPayment(patient.id, amount, newPaymentNote)

      // Reload data to refresh UI
      await loadPatientData()

      setShowPaymentDialog(false)
      setNewPaymentAmount("")
      setNewPaymentNote("")

      toast.success("Payment added successfully!")
    } catch (error) {
      console.error("❌ Error adding payment:", error)
      toast.error("Failed to add payment")
    } finally {
      setUpdatingPayment(false)
    }
  }

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingPayment(true)

    if (!selectedTreatment) return

    try {
      const newAmount = Number.parseFloat(paymentAmount)

      if (isNaN(newAmount) || newAmount < 0) {
        toast.error("Please enter a valid payment amount")
        return
      }

      if (newAmount > (selectedTreatment.totalAmount - selectedTreatment.amountPaid)) {
        toast.error("New payment amount cannot exceed remaining balance")
        return
      }

      console.log(`💰 Adding new payment for treatment ${selectedTreatment.id}: ₹${newAmount}`)

      await updateTreatmentPayment(selectedTreatment.id, newAmount, paymentNote)

      // Reload data
      await loadPatientData()

      setShowEditPayment(false)
      setSelectedTreatment(null)
      setPaymentAmount("")
      setPaymentNote("")

      toast.success("Payment added successfully!")
    } catch (error) {
      console.error("❌ Error adding payment:", error)
      toast.error("Failed to add payment")
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

  // const calculateAge = (dob: string) => {
  //   if (!dob) return "N/A"
  //   return differenceInYears(new Date(), new Date(dob))
  // }

  const handleGenerateReceipt = async (treatment: Treatment) => {
    try {
      if (!patient) return

      await generateReceiptPDF({
        patient: {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          age: patient.age,
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
  
  // --- MODIFIED FUNCTION ---
  // Passes `patient.age` instead of `patient.dob`
  const handleSendToWhatsApp = async (treatment: Treatment) => {
    try {
      if (!patient) return

      await sendReceiptToWhatsApp({
        patient: {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          age: patient.age,
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
  {/* --- MODIFIED CARD --- */}
{/* Displays `patient.age` directly */}
<Card className="bg-white dark:bg-slate-800 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
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
      <span className="font-semibold text-slate-700 dark:text-slate-300">Age: {patient.age} years</span>
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
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center text-xl font-extrabold text-slate-900 dark:text-slate-100">
          <Receipt className="mr-3 h-6 w-6 text-green-500" />
          Financial Summary
        </div>
        <Button 
          variant="outline"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setShowPaymentDialog(true)}
          disabled={!patient.outstandingBalance}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Overall Summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-slate-600 dark:text-slate-400">Total Billed:</span>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-200">₹{patient.totalBilled.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-medium text-slate-600 dark:text-slate-400">Total Paid:</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-500">₹{patient.totalPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">Outstanding:</span>
            <span className={`text-2xl font-extrabold ${patient.outstandingBalance > 0 ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500"}`}>
              ₹{patient.outstandingBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  {/* Add Payment Dialog */}
  <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
    <DialogContent className="bg-white text-gray-800 border border-gray-200 shadow-xl shadow-blue-100/40 rounded-2xl sm:max-w-[500px]">
      <DialogHeader className="space-y-3">
        <DialogTitle className="text-xl font-semibold text-blue-700 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Add Patient Payment
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-600">
          Add a new payment for <span className="font-medium text-gray-900">{patient.name}</span>. 
          The amount will be automatically distributed across unpaid treatments in chronological order.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleAddPatientPayment} className="space-y-6">
        <div className="space-y-4 py-4">
          {/* Current Balance Summary */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Outstanding:</span>
              <span className="text-lg font-semibold text-red-600">₹{patient.outstandingBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="paymentAmount" className="text-gray-700 flex items-center justify-between">
              <span>Payment Amount</span>
              <span className="text-xs text-blue-600 font-medium">Max: ₹{patient.outstandingBalance.toFixed(2)}</span>
            </Label>
            <Input
              id="paymentAmount"
              placeholder="Enter amount"
              type="number"
              step="0.01"
              min="0"
              max={patient.outstandingBalance}
              value={newPaymentAmount}
              onChange={(e) => setNewPaymentAmount(e.target.value)}
              required
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Payment Note */}
          <div className="space-y-2">
            <Label htmlFor="paymentNote" className="text-gray-700">Note (Optional)</Label>
            <Textarea
              id="paymentNote"
              placeholder="Add a note for this payment"
              value={newPaymentNote}
              onChange={(e) => setNewPaymentNote(e.target.value)}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
            />
          </div>

          {/* Payment Preview */}
          {newPaymentAmount && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-100 space-y-2">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-gray-600">Current Outstanding:</span>
                <span className="font-medium text-red-600">₹{patient.outstandingBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-medium text-green-600">₹{Number(newPaymentAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm pt-2 border-t border-green-200">
                <span className="font-medium text-gray-700">New Balance:</span>
                <span className="font-semibold text-blue-600">
                  ₹{(patient.outstandingBalance - Number(newPaymentAmount)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3 pt-2 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPaymentDialog(false)}
            disabled={updatingPayment}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updatingPayment || !newPaymentAmount}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {updatingPayment ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Adding...</span>
              </div>
            ) : (
              <>Add Payment</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

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
                        <Phone className="mr-1 h-3 w-3" />
                        
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteTreatment(treatment.id, treatment.diagnosis)}
                        className="bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />                        
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
  <DialogContent className="sm:max-w-[600px] bg-gray-50 dark:bg-slate-950 rounded-xl shadow-lg flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100">
    
    {/* Header */}
    <DialogHeader className="p-6 border-b border-slate-200 dark:border-slate-700">
      <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Add New Treatment
      </DialogTitle>
      <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
        Add a new treatment record for{" "}
        <strong className="text-slate-700 dark:text-slate-300">
          {patient.name}
        </strong>{" "}
        (ID: {patient.id})
      </DialogDescription>
    </DialogHeader>

    {/* Scrollable Body */}
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <form id="addTreatmentForm" onSubmit={handleAddTreatment}>
        <div className="grid gap-6">
          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="font-medium text-slate-800 dark:text-slate-200">
              Diagnosis *
            </Label>
            <Textarea
              id="diagnosis"
              value={newTreatment.diagnosis}
              onChange={(e) =>
                setNewTreatment((prev) => ({ ...prev, diagnosis: e.target.value }))
              }
              placeholder="Enter diagnosis details"
              required
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600 rounded-lg"
            />
          </div>

          {/* Treatment Plan */}
          <div className="space-y-2">
            <Label htmlFor="treatmentPlan" className="font-medium text-slate-800 dark:text-slate-200">
              Treatment Plan
            </Label>
            <Textarea
              id="treatmentPlan"
              value={newTreatment.treatmentPlan}
              onChange={(e) =>
                setNewTreatment((prev) => ({ ...prev, treatmentPlan: e.target.value }))
              }
              placeholder="Describe the treatment plan"
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600 rounded-lg"
            />
          </div>

          {/* Entry Date & Tooth Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="entryDate" className="font-medium text-slate-800 dark:text-slate-200">
                Entry Date *
              </Label>
              <Input
                id="entryDate"
                type="date"
                value={newTreatment.entryDate}
                onChange={(e) =>
                  setNewTreatment((prev) => ({ ...prev, entryDate: e.target.value }))
                }
                required
                className="bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-blue-600 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toothNumber" className="font-medium text-slate-800 dark:text-slate-200">
                Tooth Number
              </Label>
              <Input
                id="toothNumber"
                value={newTreatment.toothNumber}
                onChange={(e) =>
                  setNewTreatment((prev) => ({ ...prev, toothNumber: e.target.value }))
                }
                placeholder="e.g., 25, 14-15"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600 rounded-lg"
              />
            </div>
          </div>

          {/* Next Appointment (TRO) */}
          <div className="space-y-2">
            <Label
              htmlFor="tro"
              className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              Next Appointment (TRO)
            </Label>
            <Input
              id="tro"
              type="date"
              value={newTreatment.tro}
              onChange={(e) =>
                setNewTreatment((prev) => ({ ...prev, tro: e.target.value }))
              }
              className="bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-blue-600 rounded-lg"
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmount" className="font-medium text-slate-800 dark:text-slate-200">
                Total Amount *
              </Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                min="-1"
                value={newTreatment.totalAmount}
                onChange={(e) =>
                  setNewTreatment((prev) => ({ ...prev, totalAmount: e.target.value }))
                }
                placeholder="0.00"
                required
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountPaid" className="font-medium text-slate-800 dark:text-slate-200">
                Amount Paid
              </Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="-1"
                value={newTreatment.amountPaid}
                onChange={(e) =>
                  setNewTreatment((prev) => ({ ...prev, amountPaid: e.target.value }))
                }
                placeholder="0.00"
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:ring-blue-600 rounded-lg"
              />
            </div>
          </div>

          {/* Summary Card */}
          <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-400">Total Amount:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  ₹{parseFloat(newTreatment.totalAmount || "0").toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-400">Amount Paid:</span>
                <span className="font-semibold text-green-700 dark:text-green-500">
                  ₹{parseFloat(newTreatment.amountPaid || "0").toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                <span className="text-slate-800 dark:text-slate-300">Balance Due:</span>
                <span
                  className={
                    parseFloat(newTreatment.totalAmount || "0") -
                      parseFloat(newTreatment.amountPaid || "0") >
                    0
                      ? "text-red-700 dark:text-red-500"
                      : "text-green-700 dark:text-green-500"
                  }
                >
                  ₹
                  {(
                    parseFloat(newTreatment.totalAmount || "0") -
                    parseFloat(newTreatment.amountPaid || "0")
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>

    {/* Footer */}
    <DialogFooter className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowAddTreatment(false)}
        disabled={addingTreatment}
        className="text-slate-700 border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="addTreatmentForm"
        disabled={addingTreatment}
        className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
      >
        {addingTreatment ? "Adding..." : "Add Treatment"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Add Payment Dialog */}
<Dialog open={showEditPayment} onOpenChange={setShowEditPayment}>
  <DialogContent className="bg-white text-gray-800 border border-gray-200 shadow-xl shadow-blue-100/40 rounded-2xl flex flex-col max-h-[90vh] max-w-2xl">
  <style jsx global>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(229, 231, 235, 0.6);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(59, 130, 246, 0.4);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(59, 130, 246, 0.7);
    }
  `}</style>

  <DialogHeader className="flex-shrink-0">
    <DialogTitle className="text-lg font-semibold text-blue-700">Add New Payment</DialogTitle>
    <DialogDescription className="text-sm text-gray-500">
      Add payment for treatment: {selectedTreatment?.diagnosis}
    </DialogDescription>
  </DialogHeader>

  <form onSubmit={handleUpdatePayment} className="flex flex-col overflow-hidden flex-1">
    <div className="grid gap-4 py-4 overflow-y-auto custom-scrollbar">

      {/* Treatment Details */}
      <div className="space-y-2">
        <Label className="text-gray-700 font-medium">Treatment Details</Label>
        <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-1 border border-blue-100">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-semibold text-gray-900">
              ₹{selectedTreatment?.totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Previously Paid:</span>
            <span className="font-semibold text-green-600">
              ₹{(selectedTreatment?.amountPaid || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Balance:</span>
            <span className="font-semibold text-red-600">
              ₹{selectedTreatment?.balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Only show payment fields if balance remains */}
      {(selectedTreatment?.balance ?? 0) > 0 && (
        <>
          {/* New Payment Input */}
          <div className="space-y-2">
            <Label htmlFor="paymentAmount" className="text-gray-700 flex items-center justify-between">
              <span>New Payment Amount</span>
            </Label>
            <Input
              id="paymentAmount"
              type="number"
              step="0.01"
              min="0"
              max={selectedTreatment?.balance}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              required
              // --- CHANGES HERE ---
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
            <p className="text-xs text-blue-500">
              Maximum remaining amount: ₹{(selectedTreatment?.balance ?? 0).toFixed(2)}
            </p>
          </div>

          {/* Payment Note */}
          <div className="space-y-2">
            <Label htmlFor="paymentNote" className="text-gray-700">Payment Note (Optional)</Label>
            <Textarea
              id="paymentNote"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Add any notes about this payment..."
              // --- CHANGES HERE ---
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-400 shadow-sm"
            />
          </div>

          {/* Updated Summary */}
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="text-sm space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-gray-600">Total After New Payment:</span>
                <span className="text-green-700">
                  ₹{((selectedTreatment?.amountPaid || 0) + Number.parseFloat(paymentAmount || "0")).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-600">New Balance:</span>
                <span
                  className={
                    (selectedTreatment?.totalAmount || 0) - ((selectedTreatment?.amountPaid || 0) + Number.parseFloat(paymentAmount || "0")) > 0
                      ? "text-red-600"
                      : "text-green-700 font-semibold"
                  }
                >
                  ₹{((selectedTreatment?.totalAmount || 0) - ((selectedTreatment?.amountPaid || 0) + Number.parseFloat(paymentAmount || "0"))).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment History */}
      {selectedTreatment?.paymentHistory && selectedTreatment.paymentHistory.length > 0 && (
        <div className="space-y-2">
          <Label className="text-gray-700 flex items-center justify-between font-medium">
            <span>Payment History</span>
            <span className="text-xs font-medium text-blue-600">
              {selectedTreatment.paymentHistory.length} payment{selectedTreatment.paymentHistory.length !== 1 ? 's' : ''}
            </span>
          </Label>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/80 pointer-events-none z-10 h-4 bottom-0"></div>
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar border border-gray-200">
              {selectedTreatment.paymentHistory.map((payment, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-start p-3 rounded-lg transition-colors duration-200 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-100'
                  } hover:bg-blue-50`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-700 font-semibold">₹{payment.amount.toFixed(2)}</span>
                      <span className="text-gray-400">•</span>
                      <p className="text-gray-500 text-xs">
                        {format(
                          payment.date instanceof Date
                            ? payment.date
                            : payment.date?.toDate?.()
                              ? payment.date.toDate()
                              : new Date(),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </p>
                    </div>
                    {payment.note && (
                      <p className="text-gray-500 text-xs mt-1 italic">"{payment.note}"</p>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      index === selectedTreatment.paymentHistory.length - 1
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index === selectedTreatment.paymentHistory.length - 1 ? 'Latest' : `#${index + 1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Footer */}
    <DialogFooter className="mt-4 flex-shrink-0">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setShowEditPayment(false)
          setPaymentAmount("")
          setPaymentNote("")
        }}
        disabled={updatingPayment}
        className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-blue-300 rounded-lg"
      >
        Cancel
      </Button>
      {(selectedTreatment?.balance ?? 0) > 0 && (
        <Button
          type="submit"
          disabled={updatingPayment}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          {updatingPayment ? "Adding Payment..." : "Add Payment"}
        </Button>
      )}
    </DialogFooter>
  </form>
</DialogContent>
</Dialog>
</div>
  )
}

