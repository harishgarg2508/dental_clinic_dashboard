"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Plus, Search, Eye, Calendar, Phone, User, DollarSign, Trash2 } from "lucide-react" // <-- Added Trash2
import { generateCompleteHistoryPDF } from "@/lib/complete-history-pdf-generator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
 getAllPatients,
 searchPatients,
 getPatientsWithUpcomingAppointments,
 exportToExcel,
 getAllTreatments,
  deletePatientAndTreatments, // <-- Added the delete function
} from "@/lib/firebase"
import { format, differenceInYears } from "date-fns"
import { toast } from "sonner"
import Link from "next/link"
interface Patient {
  id: string
  name: string
  phone: string
  age: number | string
  gender: string
  firstVisitDate: Date
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
}

export default function PatientsPage() {
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [appointmentFilter, setAppointmentFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  
// --- ADD THESE NEW STATE VARIABLES ---
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<{ id: string; name: string } | null>(null);

  /**
   * This function now opens the confirmation dialog.
   * The actual deletion logic is moved to a new function called by the dialog.
   */
  const handleDeletePatient = (patientId: string, patientName: string) => {
    setPatientToDelete({ id: patientId, name: patientName });
    setIsDeleteDialogOpen(true);
  };

  /**
   * This function contains the original deletion logic and is called by the dialog's confirm button.
   */
  const confirmDeleteAndCloseDialog = async () => {
    if (!patientToDelete) return;

    try {
      await deletePatientAndTreatments(patientToDelete.id);
      
      // Update the UI instantly by filtering out the deleted patient.
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      
      toast.success(`Patient ${patientToDelete.name} and all records have been deleted.`);
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Failed to delete patient. Please try again.");
    } finally {
      // Always close the dialog and clear the state
      setIsDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };
  const loadPatients = async () => {
    try {
      console.log("👥 Loading all patients...")
      const data = await getAllPatients()
      setPatients(data)
      setFilteredPatients(data)
      console.log(`✅ Loaded ${data.length} patients`)
    } catch (error) {
      console.error("❌ Error loading patients:", error)
      toast.error("Failed to load patients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    const applyFilters = async () => {
      console.log("Applying filters...")

      let filtered = patients

      // Search filter
      if (searchQuery.trim()) {
        filtered = await searchPatients(searchQuery)
      }

      // Payment status filter
      if (paymentFilter !== "all") {
        if (paymentFilter === "paid") {
          filtered = filtered.filter((p) => p.outstandingBalance <= 0)
        } else if (paymentFilter === "unpaid") {
          filtered = filtered.filter((p) => p.outstandingBalance > 0 && p.totalPaid === 0)
        } else if (paymentFilter === "partial") {
          filtered = filtered.filter((p) => p.outstandingBalance > 0 && p.totalPaid > 0)
        }
      }

      // Age filter
      if (ageFilter !== "all") {
        filtered = filtered.filter((patient) => {
          if (!patient.age) return false
          const age = Number(patient.age) // Convert age to number for comparison

          switch (ageFilter) {
            case "child":
              return age < 18
            case "adult":
              return age >= 18 && age < 65
            case "senior":
              return age >= 65
            default:
              return true
          }
        })
      }

      // Appointment filter
      if (appointmentFilter === "upcoming") {
        const patientsWithAppointments = await getPatientsWithUpcomingAppointments()
        const appointmentPatientIds = new Set(patientsWithAppointments.map((p) => p.id))
        filtered = filtered.filter((p) => appointmentPatientIds.has(p.id))
      }

      console.log(`Filtered to ${filtered.length} patients`)
      setFilteredPatients(filtered)
    }

    applyFilters()
  }, [patients, searchQuery, paymentFilter, appointmentFilter, ageFilter])

  const handleExportToExcel = async () => {
    try {
      // Convert patients to treatment-like format for export
      const treatments = await getAllTreatments()
      const patientTreatments = treatments.filter((t) => filteredPatients.some((p) => p.id === t.patientId))
      await exportToExcel()
      toast.success("Patient data exported successfully!")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

 

  const getPaymentStatus = (patient: Patient) => {
    if (patient.outstandingBalance <= 0) return "PAID"
    if (patient.totalPaid === 0) return "UNPAID"
    return "PARTIALLY_PAID"
  }

  // Corrected: Returns specific, high-contrast Tailwind classes for badges
  const getPaymentStatusClasses = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800"
      case "UNPAID":
        return "bg-red-100 text-red-800"
      case "PARTIALLY_PAID":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">Patients</h2>
          </div>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 w-32 bg-slate-200 animate-pulse rounded" />
                    <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
                    <div className="h-4 w-20 bg-slate-200 animate-pulse rounded" />
                    <div className="h-4 w-16 bg-slate-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">Patients</h2>
            <p className="text-slate-600 mt-2">Manage your patient records and view their treatment history</p>
          </div>
          <div className="flex items-center space-x-2">
             <Button 
              onClick={generateCompleteHistoryPDF} 
              variant="outline" 
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={handleExportToExcel} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/patients/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Patients</CardTitle>
              <User className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{patients.length}</div>
              <p className="text-xs text-slate-500">{filteredPatients.length} shown after filters</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Paid Up Patients</CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {patients.filter((p) => p.outstandingBalance <= 0).length}
              </div>
              <p className="text-xs text-slate-500">No outstanding balance</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Outstanding Patients</CardTitle>
              <DollarSign className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {patients.filter((p) => p.outstandingBalance > 0).length}
              </div>
              <p className="text-xs text-slate-500">Have pending payments</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">This Month</CardTitle>
              <Calendar className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {
                  patients.filter((p) => {
                    const now = new Date()
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                    return p.firstVisitDate >= startOfMonth
                  }).length
                }
              </div>
              <p className="text-xs text-slate-500">New patients</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-800">Patient Directory</CardTitle>
            <CardDescription className="text-slate-600">
              Browse and manage all patient records. Click on a patient to view their complete treatment history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-100 rounded-lg">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                {/* Corrected: Added explicit text and placeholder colors for high contrast */}
                <Input
                  placeholder="Search by name or phone number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Corrected: Added explicit text color for high contrast */}
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[180px] border-slate-300 bg-white text-slate-900">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Fully Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                </SelectContent>
              </Select>

              {/* Corrected: Added explicit text color for high contrast */}
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-[150px] border-slate-300 bg-white text-slate-900">
                  <SelectValue placeholder="Age Group" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="child">Children (&lt;18)</SelectItem>
                  <SelectItem value="adult">Adults (18-64)</SelectItem>
                  <SelectItem value="senior">Seniors (65+)</SelectItem>
                </SelectContent>
              </Select>

              {/* Corrected: Added explicit text color for high contrast */}
              <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
                <SelectTrigger className="w-[180px] border-slate-300 bg-white text-slate-900">
                  <SelectValue placeholder="Appointments" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="all">All Patients</SelectItem>
                  <SelectItem value="upcoming">Has Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Patients Table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 hover:bg-slate-100">
                    <TableHead className="font-semibold text-slate-700">Patient Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                    <TableHead className="font-semibold text-slate-700">Age</TableHead>
                    <TableHead className="font-semibold text-slate-700">Gender</TableHead>
                    <TableHead className="font-semibold text-slate-700">First Visit</TableHead>
                    <TableHead className="font-semibold text-slate-700">Total Billed</TableHead>
                    <TableHead className="font-semibold text-slate-700">Total Paid</TableHead>
                    <TableHead className="font-semibold text-slate-700">Outstanding</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-slate-50 border-slate-200">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-800">{patient.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">{patient.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {patient.age ? `${patient.age} years` : "N/A"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {patient.gender || "N/A"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(patient.firstVisitDate, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      ₹{patient.totalBilled.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      ₹{patient.totalPaid.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={
                        patient.outstandingBalance > 0
                          ? "text-red-600 font-semibold"
                          : "text-green-600 font-semibold"
                      }
                    >
                      ₹{patient.outstandingBalance.toFixed(2)}
                    </TableCell>
                    
                    {/* --- CORRECTED STATUS CELL --- */}
                    <TableCell>
                      <Badge
                        className={getPaymentStatusClasses(
                          getPaymentStatus(patient)
                        )}
                      >
                        {getPaymentStatus(patient).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    
                    {/* --- CORRECTED ACTIONS CELL --- */}
                    <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <Link href={`/patients/${patient.id}`}>
                              <Eye className="mr-1 h-3 w-3" />
                              View Details {/* <-- This is now actual text */}
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                            onClick={() => handleDeletePatient(patient.id, patient.name)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            {/* Delete */}
                          </Button>
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
                {filteredPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-4">
                        <User className="h-16 w-16 text-slate-300" />
                        <p className="text-slate-500 text-lg">
                          {searchQuery || paymentFilter !== "all" || ageFilter !== "all" || appointmentFilter !== "all"
                            ? "No patients found matching your criteria"
                            : "No patients found"}
                        </p>
                        {patients.length === 0 && (
                          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Link href="/patients/add">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Your First Patient
                            </Link>
                          </Button>
                        )}
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
      {/* --- ADD THIS ENTIRE DIALOG COMPONENT --- */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              Are you absolutely sure you want to delete the patient{" "}
              <strong className="text-slate-800">{patientToDelete?.name}</strong>?
              <br /><br />
              This action is irreversible and will permanently delete all associated treatment records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmDeleteAndCloseDialog} // This button calls your delete function
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Yes, Delete Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --- END OF DIALOG COMPONENT --- */}
    </div>
  )
}