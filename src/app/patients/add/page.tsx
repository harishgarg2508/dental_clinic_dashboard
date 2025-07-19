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
    dob: "",
    gender: "",

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
      // Validate required fields
      if (!formData.name || !formData.phone || !formData.diagnosis || !formData.totalAmount) {
        toast.error("Please fill in all required fields")
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
        dob: formData.dob,
        gender: formData.gender,
      }

      const treatmentData = {
        diagnosis: formData.diagnosis,
        treatmentPlan: formData.treatmentPlan,
        toothNumber: formData.toothNumber,
        totalAmount,
        amountPaid,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/patients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Patients
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Add New Patient</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
              <CardDescription>Basic demographic information about the patient</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter patient's full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger>
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

          <Card>
            <CardHeader>
              <CardTitle>First Treatment</CardTitle>
              <CardDescription>Details of the initial treatment or consultation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis *</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                  placeholder="Enter diagnosis details"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treatmentPlan">Treatment Plan</Label>
                <Textarea
                  id="treatmentPlan"
                  value={formData.treatmentPlan}
                  onChange={(e) => handleInputChange("treatmentPlan", e.target.value)}
                  placeholder="Describe the treatment plan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toothNumber">Tooth Number</Label>
                <Input
                  id="toothNumber"
                  value={formData.toothNumber}
                  onChange={(e) => handleInputChange("toothNumber", e.target.value)}
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
                  value={formData.tro}
                  onChange={(e) => handleInputChange("tro", e.target.value)}
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
                    value={formData.totalAmount}
                    onChange={(e) => handleInputChange("totalAmount", e.target.value)}
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
                    value={formData.amountPaid}
                    onChange={(e) => handleInputChange("amountPaid", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>${Number.parseFloat(formData.totalAmount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>${Number.parseFloat(formData.amountPaid || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1 mt-1">
                    <span>Balance:</span>
                    <span
                      className={
                        Number.parseFloat(formData.totalAmount || "0") - Number.parseFloat(formData.amountPaid || "0") >
                        0
                          ? "text-destructive"
                          : "text-green-600"
                      }
                    >
                      $
                      {(
                        Number.parseFloat(formData.totalAmount || "0") - Number.parseFloat(formData.amountPaid || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                  {formData.tro && (
                    <div className="flex justify-between mt-2 pt-2 border-t">
                      <span className="text-blue-600">Next Appointment:</span>
                      <span className="text-blue-600 font-medium">{new Date(formData.tro).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" asChild disabled={loading}>
            <Link href="/patients">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding Patient..." : "Add Patient"}
          </Button>
        </div>
      </form>
    </div>
  )
}
