"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { addNewPatientWithTreatment } from "@/lib/firebase"
import { toast } from "sonner"

export default function AddPatientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Patient data
    name: "",
    phone: "",
    age: "", // <-- Replaced dob with age
    gender: "",
    entryDate: "",  //new Date().toISOString().split("T")[0], // <-- Added entryDate

    // Treatment data
    diagnosis: "",
    treatmentPlan: "",
    toothNumber: "",
    totalAmount: "",
    amountPaid: "",
    tro: "", // Treatment Repeat On - next appointment date
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.name || !formData.phone || !formData.diagnosis || !formData.totalAmount) {
        toast.error("Please fill in all required fields")
        setLoading(false)
        return
      }

       if (!formData.entryDate) {
        toast.error("Please select an entry date")
        setLoading(false)
        return
      }

      const totalAmount = Number.parseFloat(formData.totalAmount)
      const amountPaid = Number.parseFloat(formData.amountPaid) || 0

      if (isNaN(totalAmount) || totalAmount <= 0) {
        toast.error("Please enter a valid total amount")
        setLoading(false)
        return
      }

      if (amountPaid > totalAmount) {
        toast.error("Amount paid cannot exceed total amount")
        setLoading(false)
        return
      }

      const patientData = {
        name: formData.name,
        phone: formData.phone,
        age: Number(formData.age) || 0, // <-- Convert string to number here
        gender: formData.gender,
      }

      const treatmentData = {
        diagnosis: formData.diagnosis,
        treatmentPlan: formData.treatmentPlan,
        toothNumber: formData.toothNumber,
        totalAmount,
        amountPaid,
        entryDate: new Date(formData.entryDate), // <-- Use entryDate
        tro: formData.tro ? new Date(formData.tro) : undefined,
      }

      const patientId = await addNewPatientWithTreatment(patientData, treatmentData)

      toast.success("Patient and treatment added successfully!")
      router.push(`/patients/${patientId}`)
    } catch (error) {
      console.error("Error adding patient:", error)
      toast.error("Failed to add patient. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Consistent input styling for a clean look
  const inputStyle = "bg-white border-gray-300 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
  const labelStyle = "text-sm font-medium text-gray-700"

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-gray-800">Add New Patient</h2>
          <Button asChild variant="outline" size="sm" className="bg-white hover:bg-gray-100">
            <Link href="/patients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Patient Information Card */}
            <Card className="bg-white shadow-sm border border-gray-200 rounded-lg">
              <CardHeader>
                <CardTitle className="text-gray-900">Patient Information</CardTitle>
                <CardDescription>Basic demographic information about the patient</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="entryDate" className={labelStyle}>
                    Entry Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => handleInputChange("entryDate", e.target.value)}
                    required
                    className={inputStyle}
                  />
                  <p className="text-xs text-gray-500">Use today's date or specify a date for historical records.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className={labelStyle}>
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter patient's full name"
                    required
                    className={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className={labelStyle}>
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter phone number"
                    required
                    className={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className={labelStyle}>
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    placeholder="Enter patient's age in years"
                    className={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className={labelStyle}>
                    Gender
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger className={inputStyle}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Treatment Information Card */}
            <Card className="bg-white shadow-sm border border-gray-200 rounded-lg">
              <CardHeader>
                <CardTitle className="text-gray-900">First Treatment</CardTitle>
                <CardDescription>Details of the initial treatment or consultation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnosis" className={labelStyle}>
                    Diagnosis <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="diagnosis"
                    value={formData.diagnosis}
                    onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                    placeholder="Enter diagnosis details"
                    required
                    className={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="treatmentPlan" className={labelStyle}>
                    Treatment Plan
                  </Label>
                  <Textarea
                    id="treatmentPlan"
                    value={formData.treatmentPlan}
                    onChange={(e) => handleInputChange("treatmentPlan", e.target.value)}
                    placeholder="Describe the treatment plan"
                    className={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toothNumber" className={labelStyle}>
                    Tooth Number
                  </Label>
                  <Input
                    id="toothNumber"
                    value={formData.toothNumber}
                    onChange={(e) => handleInputChange("toothNumber", e.target.value)}
                    placeholder="e.g., 25, 14-15"
                    className={inputStyle}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tro" className={`${labelStyle} flex items-center gap-2`}>
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Next Appointment (TRO) - Optional
                  </Label>
                  <Input
                    id="tro"
                    type="date"
                    value={formData.tro}
                    onChange={(e) => handleInputChange("tro", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={inputStyle}
                  />
                  <p className="text-xs text-gray-500">Leave empty if no follow-up is required.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount" className={labelStyle}>
                      Total Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.totalAmount}
                      onChange={(e) => handleInputChange("totalAmount", e.target.value)}
                      placeholder="0.00"
                      required
                      className={inputStyle}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amountPaid" className={labelStyle}>
                      Amount Paid
                    </Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amountPaid}
                      onChange={(e) => handleInputChange("amountPaid", e.target.value)}
                      placeholder="0.00"
                      className={inputStyle}
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-100 rounded-lg space-y-2">
                  <div className="text-sm space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium text-gray-800">
                        ₹{Number.parseFloat(formData.totalAmount || "0").toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount Paid:</span>
                      <span className="font-medium text-gray-800">
                        ₹{Number.parseFloat(formData.amountPaid || "0").toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Balance:</span>
                      <span
                        className={
                          Number.parseFloat(formData.totalAmount || "0") -
                            Number.parseFloat(formData.amountPaid || "0") >
                          0
                            ? "text-red-600 font-bold"
                            : "text-green-600 font-bold"
                        }
                      >
                        ₹
                        {(
                          Number.parseFloat(formData.totalAmount || "0") -
                            Number.parseFloat(formData.amountPaid || "0")
                        ).toFixed(2)}
                      </span>
                    </div>
                    {formData.tro && (
                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 text-sm">
                        <span className="text-teal-700 font-medium">Next Appointment:</span>
                        <span className="text-teal-700 font-bold">
                          {new Date(formData.tro).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" asChild disabled={loading} className="bg-white">
              <Link href="/patients">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-teal-500 text-white hover:bg-teal-600 focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-300"
            >
              {loading ? "Adding Patient..." : "Add Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}