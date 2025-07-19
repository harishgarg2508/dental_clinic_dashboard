"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Users, DollarSign, TrendingUp, FileText, AlertCircle, Database, Plus } from "lucide-react"
import { getPatientStats, getTreatmentStats, getRecentTreatments, addSampleData } from "@/lib/firebase"
import { toast } from "sonner"

// Interface definitions remain the same
interface DashboardStats {
  totalPatients: number
  newPatientsThisMonth: number
  totalRevenue: number
  unpaidAmount: number
  totalTreatments: number
}

interface RecentTreatment {
  id: string
  patientName: string
  diagnosis: string
  totalAmount: number
  paymentStatus: string
  entryDate: Date
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    newPatientsThisMonth: 0,
    totalRevenue: 0,
    unpaidAmount: 0,
    totalTreatments: 0,
  })
  const [recentTreatments, setRecentTreatments] = useState<RecentTreatment[]>([])
  const [loading, setLoading] = useState(true)
  const [sampleDataLoading, setSampleDataLoading] = useState(false)

  // Data loading logic remains the same
  const loadDashboardData = async () => {
    try {
      const [patientStats, treatmentStats, recent] = await Promise.all([
        getPatientStats(),
        getTreatmentStats(),
        getRecentTreatments(5),
      ])
      setStats({
        totalPatients: patientStats.total,
        newPatientsThisMonth: patientStats.newThisMonth,
        totalRevenue: treatmentStats.totalRevenue,
        unpaidAmount: treatmentStats.unpaidAmount,
        totalTreatments: treatmentStats.totalTreatments,
      })
      setRecentTreatments(recent)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast.error("Error loading dashboard data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleAddSampleData = async () => {
    setSampleDataLoading(true)
    try {
      await addSampleData()
      toast.success("Sample data added successfully!")
      await loadDashboardData()
    } catch (error) {
      console.error("Error adding sample data:", error)
      toast.error("Error adding sample data.")
    } finally {
      setSampleDataLoading(false)
    }
  }

  // Loading Skeleton with a light theme
  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="h-9 w-48 bg-slate-200 animate-pulse rounded-md mb-8"></div>
          {/* Stats Card Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 w-24 bg-slate-200 animate-pulse rounded"></div>
                  <div className="h-6 w-6 bg-slate-200 animate-pulse rounded-full"></div>
                </div>
                <div className="h-10 w-20 bg-slate-200 animate-pulse rounded mb-2"></div>
                <div className="h-3 w-32 bg-slate-200 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Main component render with light theme
  return (
    <main className="bg-slate-50 text-slate-800 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <div className="flex items-center space-x-3">
            {stats.totalPatients === 0 && (
              <button
                onClick={handleAddSampleData}
                disabled={sampleDataLoading}
                className="flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-100 transition-colors duration-300 disabled:bg-slate-200 disabled:cursor-not-allowed"
              >
                <Database className="mr-2 h-4 w-4" />
                {sampleDataLoading ? "Adding..." : "Add Sample Data"}
              </button>
            )}
            <Link
              href="/patients/add"
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Patient
            </Link>
          </div>
        </div>

        {/* Welcome / No Data Message */}
        {stats.totalPatients === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-blue-800">Your Dashboard is Ready!</h3>
                <p className="text-sm text-blue-700 mt-1 max-w-prose">
                  It looks like you don't have any data yet. You can click{" "}
                  <strong className="font-semibold text-blue-900">"Add Sample Data"</strong> to populate your dashboard,
                  or begin by creating your first patient with{" "}
                  <strong className="font-semibold text-blue-900">"Add New Patient"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card: Total Patients */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">Total Patients</h3>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-2">
              <p className="text-4xl font-bold text-slate-900">{stats.totalPatients}</p>
              <p className="text-sm text-green-600 font-medium mt-1">+{stats.newPatientsThisMonth} new this month</p>
            </div>
          </div>

          {/* Card: Total Revenue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">Total Revenue</h3>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-2">
              <p className="text-4xl font-bold text-slate-900">₹{stats.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-slate-500 mt-1">{stats.totalTreatments} treatments completed</p>
            </div>
          </div>

          {/* Card: Unpaid Amount */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-lg shadow-red-200/50 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-red-600">Unpaid Amount</h3>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="mt-2">
              <p className="text-4xl font-bold text-red-600">₹{stats.unpaidAmount.toFixed(2)}</p>
              <p className="text-sm text-red-500 mt-1">Outstanding balances</p>
            </div>
          </div>

          {/* Card: This Month */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50 transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-500">This Month's Growth</h3>
              <TrendingUp className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-2">
              <p className="text-4xl font-bold text-slate-900">{stats.newPatientsThisMonth}</p>
              <p className="text-sm text-slate-500 mt-1">New patients registered</p>
            </div>
          </div>
        </div>

        {/* Main Content Area: Recent Treatments & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Section: Recent Treatments */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-6">
            <h3 className="text-xl font-bold text-slate-900">Recent Treatments</h3>
            <p className="text-sm text-slate-500 mt-1">Latest patient treatments and their payment status.</p>
            <div className="mt-6 space-y-2">
              {recentTreatments.length > 0 ? (
                recentTreatments.map((treatment) => (
                  <div key={treatment.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800">{treatment.patientName}</p>
                      <p className="text-sm text-slate-500">{treatment.diagnosis}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="font-mono text-slate-700 font-semibold">₹{treatment.totalAmount.toFixed(2)}</p>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          treatment.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {treatment.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-500">No recent treatments found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Quick Actions */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-6">
            <h3 className="text-xl font-bold text-slate-900">Quick Actions</h3>
            <p className="text-sm text-slate-500 mt-1">Common tasks and shortcuts.</p>
            <div className="mt-6 flex flex-col space-y-3">
              <Link
                href="/patients/add"
                className="w-full flex items-center p-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors duration-200 shadow-sm"
              >
                <FileText className="mr-3 h-5 w-5" />
                Add New Patient Record
              </Link>
              <Link
                href="/patients"
                className="w-full flex items-center p-3 rounded-lg text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors duration-200"
              >
                <Users className="mr-3 h-5 w-5" />
                View All Patients
              </Link>
              <Link
                href="/patients?filter=unpaid"
                className="w-full flex items-center p-3 rounded-lg text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors duration-200"
              >
                <AlertCircle className="mr-3 h-5 w-5 text-red-500" />
                View Unpaid Bills
              </Link>
              <Link
                href="/reports"
                className="w-full flex items-center p-3 rounded-lg text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-colors duration-200"
              >
                <CalendarDays className="mr-3 h-5 w-5" />
                Generate Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}