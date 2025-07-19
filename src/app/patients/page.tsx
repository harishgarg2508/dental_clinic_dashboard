"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Plus, Search, Eye, Calendar, Phone, User, DollarSign } from "lucide-react"
import Link from "next/link"
import {
  getAllPatients,
  searchPatients,
  getPatientsWithUpcomingAppointments,
  exportToExcel,
  getAllTreatments,
} from "@/lib/firebase"
import { format, differenceInYears } from "date-fns"
import { toast } from "sonner"

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

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [appointmentFilter, setAppointmentFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")

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
      console.log("🔍 Applying filters...")
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
          if (!patient.dob) return false
          const age = differenceInYears(new Date(), new Date(patient.dob))

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

      console.log(`🔍 Filtered to ${filtered.length} patients`)
      setFilteredPatients(filtered)
    }

    applyFilters()
  }, [patients, searchQuery, paymentFilter, appointmentFilter, ageFilter])

  const handleExportToExcel = async () => {
    try {
      // Convert patients to treatment-like format for export
      const treatments = await getAllTreatments()
      const patientTreatments = treatments.filter((t) => filteredPatients.some((p) => p.id === t.patientId))
      await exportToExcel(patientTreatments, "patients-export")
      toast.success("Patient data exported successfully!")
    } catch (error) {
      console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  const calculateAge = (dob: string) => {
    if (!dob) return "N/A"
    return differenceInYears(new Date(), new Date(dob))
  }

  const getPaymentStatus = (patient: Patient) => {
    if (patient.outstandingBalance <= 0) return "PAID"
    if (patient.totalPaid === 0) return "UNPAID"
    return "PARTIALLY_PAID"
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "default"
      case "UNPAID":
        return "destructive"
      case "PARTIALLY_PAID":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Patients</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Patients</h2>
          <p className="text-muted-foreground">Manage your patient records and view their treatment history</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleExportToExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button asChild>
            <Link href="/patients/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Patient
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-xs text-muted-foreground">{filteredPatients.length} shown after filters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Up Patients</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {patients.filter((p) => p.outstandingBalance <= 0).length}
            </div>
            <p className="text-xs text-muted-foreground">No outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Patients</CardTitle>
            <DollarSign className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {patients.filter((p) => p.outstandingBalance > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Have pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                patients.filter((p) => {
                  const now = new Date()
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                  return p.firstVisitDate >= startOfMonth
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">New patients</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient Directory</CardTitle>
          <CardDescription>
            Browse and manage all patient records. Click on a patient to view their complete treatment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Fully Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Age Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="child">Children (&lt;18)</SelectItem>
                <SelectItem value="adult">Adults (18-64)</SelectItem>
                <SelectItem value="senior">Seniors (65+)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Appointments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="upcoming">Has Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Patients Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>First Visit</TableHead>
                  <TableHead>Total Billed</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{patient.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{calculateAge(patient.dob)} years</TableCell>
                    <TableCell>{patient.gender || "N/A"}</TableCell>
                    <TableCell>{format(patient.firstVisitDate, "MMM dd, yyyy")}</TableCell>
                    <TableCell>${patient.totalBilled.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">${patient.totalPaid.toFixed(2)}</TableCell>
                    <TableCell className={patient.outstandingBalance > 0 ? "text-destructive" : "text-green-600"}>
                      ${patient.outstandingBalance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusColor(getPaymentStatus(patient))}>
                        {getPaymentStatus(patient)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/patients/${patient.id}`}>
                          <Eye className="mr-1 h-3 w-3" />
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <User className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchQuery || paymentFilter !== "all" || ageFilter !== "all" || appointmentFilter !== "all"
                            ? "No patients found matching your criteria"
                            : "No patients found"}
                        </p>
                        {patients.length === 0 && (
                          <Button asChild>
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
  )
}
