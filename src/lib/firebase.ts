"use client"

import { useEffect, useState } from "react"
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getAuth, type Auth } from "firebase/auth"
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
  addDoc,
  updateDoc,
} from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDaQkNkqG3dwqU-nWltobC-YyiwQy6s6FQ",
  authDomain: "patientdata-5fe9c.firebaseapp.com",
  projectId: "patientdata-5fe9c",
  storageBucket: "patientdata-5fe9c.firebasestorage.app",
  messagingSenderId: "893013788176",
  appId: "1:893013788176:web:c20c7fef07343dbb9f6c95",
  measurementId: "G-ZC8WEEZW4D",
}

function createFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp()
  return initializeApp(firebaseConfig)
}

export const firebaseApp = createFirebaseApp()
export const db: Firestore = getFirestore(firebaseApp)
export const auth: Auth = getAuth(firebaseApp)

export function useFirebase() {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return {
    ready,
    app: ready ? firebaseApp : null,
    db: ready ? db : null,
    auth: ready ? auth : null,
  }
}

// Types
export interface Patient {
  id: string
  name: string
  phone: string
  dob: string
  gender: string
  firstVisitDate: Date
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
  createdAt: Date
  updatedAt: Date
}

export interface Treatment {
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
  createdAt: Date
  updatedAt: Date
}

// Collections
const PATIENTS_COLLECTION = "patients"
const TREATMENTS_COLLECTION = "treatments"

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  if (timestamp?.toDate) {
    return timestamp.toDate()
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000)
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  return new Date(timestamp)
}

// Debug helper
const logError = (functionName: string, error: any) => {
  console.error(`❌ ERROR in ${functionName}:`, error)
  console.error("Error details:", {
    message: error.message,
    code: error.code,
    stack: error.stack,
  })
}

// ==================== STEP 1: CREATE NEW PATIENT WITH FIRST TREATMENT ====================
export const addNewPatientWithTreatment = async (
  patientData: Omit<
    Patient,
    "id" | "firstVisitDate" | "totalBilled" | "totalPaid" | "outstandingBalance" | "createdAt" | "updatedAt"
  >,
  treatmentData: Omit<
    Treatment,
    "id" | "patientId" | "patientName" | "entryDate" | "balance" | "paymentStatus" | "createdAt" | "updatedAt"
  >,
) => {
  try {
    console.log("🆕 ===== CREATING NEW PATIENT WITH FIRST TREATMENT =====")
    console.log("👤 Patient data:", patientData)
    console.log("🏥 Treatment data:", treatmentData)

    const now = Timestamp.now()

    // Calculate treatment financials
    const balance = treatmentData.totalAmount - treatmentData.amountPaid
    const paymentStatus: Treatment["paymentStatus"] =
      balance <= 0 ? "PAID" : treatmentData.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"

    console.log(`💰 Calculated: Balance=$${balance}, Status=${paymentStatus}`)

    // STEP 1: Create patient document
    const newPatient = {
      ...patientData,
      firstVisitDate: now,
      totalBilled: treatmentData.totalAmount,
      totalPaid: treatmentData.amountPaid,
      outstandingBalance: balance,
      createdAt: now,
      updatedAt: now,
    }

    console.log("👤 Creating patient document...")
    const patientRef = await addDoc(collection(db, PATIENTS_COLLECTION), newPatient)
    const patientId = patientRef.id
    console.log(`✅ Patient created with ID: ${patientId}`)

    // STEP 2: Create treatment document
    const newTreatment = {
      ...treatmentData,
      patientId: patientId, // Link to the patient we just created
      patientName: patientData.name,
      entryDate: now,
      balance,
      paymentStatus,
      tro: treatmentData.tro ? Timestamp.fromDate(treatmentData.tro) : null,
      createdAt: now,
      updatedAt: now,
    }

    console.log("🏥 Creating treatment document...")
    const treatmentRef = await addDoc(collection(db, TREATMENTS_COLLECTION), newTreatment)
    console.log(`✅ Treatment created with ID: ${treatmentRef.id}`)

    console.log("🎉 ===== NEW PATIENT CREATION COMPLETED =====")
    return patientId
  } catch (error) {
    console.error("❌ ===== NEW PATIENT CREATION FAILED =====")
    logError("addNewPatientWithTreatment", error)
    throw error
  }
}

// ==================== STEP 2: ADD TREATMENT TO EXISTING PATIENT ====================
export const addTreatmentToPatient = async (
  patientId: string,
  treatmentData: Omit<
    Treatment,
    "id" | "patientId" | "patientName" | "entryDate" | "balance" | "paymentStatus" | "createdAt" | "updatedAt"
  >,
) => {
  try {
    console.log("➕ ===== ADDING TREATMENT TO EXISTING PATIENT =====")
    console.log(`👤 Target Patient ID: "${patientId}"`)
    console.log("🏥 Treatment data:", treatmentData)

    // Validation
    if (!patientId || patientId.trim() === "") {
      throw new Error("Patient ID is required and cannot be empty")
    }

    const now = Timestamp.now()

    // STEP 1: Verify patient exists and get patient data
    console.log("🔍 STEP 1: Verifying patient exists...")
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId)
    const patientSnap = await getDoc(patientRef)

    if (!patientSnap.exists()) {
      console.error(`❌ Patient with ID "${patientId}" not found`)
      throw new Error(`Patient not found with ID: ${patientId}`)
    }

    const patientData = patientSnap.data()
    console.log(`✅ Patient found: "${patientData.name}"`)

    // STEP 2: Calculate treatment financials
    console.log("🔍 STEP 2: Calculating treatment financials...")
    const balance = treatmentData.totalAmount - treatmentData.amountPaid
    const paymentStatus: Treatment["paymentStatus"] =
      balance <= 0 ? "PAID" : treatmentData.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"

    console.log(`💰 Calculated: Balance=$${balance}, Status=${paymentStatus}`)

    // STEP 3: Create treatment document with EXISTING patient ID
    console.log("🔍 STEP 3: Creating treatment document...")
    const newTreatment = {
      ...treatmentData,
      patientId: patientId, // ⚠️ CRITICAL: Use the EXISTING patient ID
      patientName: patientData.name,
      entryDate: now,
      balance,
      paymentStatus,
      tro: treatmentData.tro ? Timestamp.fromDate(treatmentData.tro) : null,
      createdAt: now,
      updatedAt: now,
    }

    console.log("🏥 Treatment document to create:", {
      patientId: newTreatment.patientId,
      patientName: newTreatment.patientName,
      diagnosis: newTreatment.diagnosis,
      totalAmount: newTreatment.totalAmount,
    })

    const treatmentRef = await addDoc(collection(db, TREATMENTS_COLLECTION), newTreatment)
    console.log(`✅ Treatment created with ID: ${treatmentRef.id}`)

    // STEP 4: Update patient totals (increment existing values)
    console.log("🔍 STEP 4: Updating patient totals...")
    const updateData = {
      totalBilled: increment(treatmentData.totalAmount),
      totalPaid: increment(treatmentData.amountPaid),
      outstandingBalance: increment(balance),
      updatedAt: now,
    }

    console.log("📊 Patient update data:", updateData)
    await updateDoc(patientRef, updateData)
    console.log("✅ Patient totals updated")

    // STEP 5: Verify the treatment was created correctly
    console.log("🔍 STEP 5: Verifying treatment creation...")
    const verifyTreatmentSnap = await getDoc(treatmentRef)
    if (verifyTreatmentSnap.exists()) {
      const verifyData = verifyTreatmentSnap.data()
      console.log("✅ Treatment verification:", {
        treatmentId: verifyTreatmentSnap.id,
        linkedPatientId: verifyData.patientId,
        patientName: verifyData.patientName,
        diagnosis: verifyData.diagnosis,
      })

      // Double-check that patientId matches
      if (verifyData.patientId !== patientId) {
        console.error(`❌ CRITICAL ERROR: Treatment patientId mismatch!`)
        console.error(`Expected: "${patientId}", Got: "${verifyData.patientId}"`)
        throw new Error("Treatment was not linked to the correct patient")
      }
    }

    console.log("🎉 ===== TREATMENT ADDITION COMPLETED SUCCESSFULLY =====")
    return treatmentRef.id
  } catch (error) {
    console.error("❌ ===== TREATMENT ADDITION FAILED =====")
    logError("addTreatmentToPatient", error)
    throw error
  }
}

// ==================== STEP 3: GET PATIENT BY ID ====================
export const getPatientById = async (patientId: string) => {
  try {
    console.log(`👤 Fetching patient with ID: "${patientId}"`)

    if (!patientId || patientId.trim() === "") {
      throw new Error("Patient ID is required and cannot be empty")
    }

    const patientRef = doc(db, PATIENTS_COLLECTION, patientId)
    const patientSnap = await getDoc(patientRef)

    if (!patientSnap.exists()) {
      console.log(`❌ Patient with ID "${patientId}" not found`)
      throw new Error(`Patient not found with ID: ${patientId}`)
    }

    const data = patientSnap.data()
    const patient = {
      id: patientSnap.id,
      ...data,
      firstVisitDate: timestampToDate(data.firstVisitDate),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    } as Patient

    console.log(`✅ Patient found: "${patient.name}"`)
    return patient
  } catch (error) {
    logError("getPatientById", error)
    throw error
  }
}

// ==================== STEP 4: GET PATIENT TREATMENTS ====================
export const getPatientTreatments = async (patientId: string) => {
  try {
    console.log(`🏥 Fetching treatments for patient: "${patientId}"`)

    if (!patientId || patientId.trim() === "") {
      throw new Error("Patient ID is required and cannot be empty")
    }

    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    const q = query(treatmentsRef, where("patientId", "==", patientId), orderBy("entryDate", "desc"))

    console.log(`🔍 Executing query: patientId == "${patientId}"`)
    const querySnapshot = await getDocs(q)
    console.log(`🔍 Query returned ${querySnapshot.size} documents`)

    const treatments: Treatment[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      console.log(`🏥 Found treatment: ${doc.id} - ${data.diagnosis} (patientId: "${data.patientId}")`)

      treatments.push({
        id: doc.id,
        ...data,
        entryDate: timestampToDate(data.entryDate),
        tro: data.tro ? timestampToDate(data.tro) : undefined,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Treatment)
    })

    console.log(`✅ Found ${treatments.length} treatments for patient "${patientId}"`)
    return treatments
  } catch (error) {
    logError("getPatientTreatments", error)
    console.error(`❌ Failed to get treatments for patient: "${patientId}"`)
    return []
  }
}

// ==================== STEP 5: GET ALL TREATMENTS (FOR PATIENT LIST) ====================
export const getAllTreatments = async () => {
  try {
    console.log("📊 Fetching all treatments...")
    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    const q = query(treatmentsRef, orderBy("entryDate", "desc"))
    const querySnapshot = await getDocs(q)

    const treatments: Treatment[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      treatments.push({
        id: doc.id,
        ...data,
        entryDate: timestampToDate(data.entryDate),
        tro: data.tro ? timestampToDate(data.tro) : undefined,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Treatment)
    })

    console.log(`✅ Found ${treatments.length} total treatments`)
    return treatments
  } catch (error) {
    logError("getAllTreatments", error)
    return []
  }
}

// ==================== STEP 6: UPDATE TREATMENT PAYMENT ====================
export const updateTreatmentPayment = async (treatmentId: string, amountPaid: number) => {
  try {
    console.log(`💰 ===== UPDATING TREATMENT PAYMENT =====`)
    console.log(`🏥 Treatment ID: "${treatmentId}"`)
    console.log(`💰 New amount paid: $${amountPaid}`)

    const now = Timestamp.now()

    // Get treatment data
    const treatmentRef = doc(db, TREATMENTS_COLLECTION, treatmentId)
    const treatmentSnap = await getDoc(treatmentRef)

    if (!treatmentSnap.exists()) {
      throw new Error("Treatment not found")
    }

    const treatmentData = treatmentSnap.data()
    const oldAmountPaid = treatmentData.amountPaid
    const paymentDifference = amountPaid - oldAmountPaid

    const newBalance = treatmentData.totalAmount - amountPaid
    const newPaymentStatus: Treatment["paymentStatus"] =
      newBalance <= 0 ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"

    console.log(`💰 Payment change: $${oldAmountPaid} → $${amountPaid} (diff: $${paymentDifference})`)
    console.log(`💰 New balance: $${newBalance}, Status: ${newPaymentStatus}`)

    // Update treatment
    await updateDoc(treatmentRef, {
      amountPaid,
      balance: newBalance,
      paymentStatus: newPaymentStatus,
      updatedAt: now,
    })

    // Update patient totals
    const patientRef = doc(db, PATIENTS_COLLECTION, treatmentData.patientId)
    await updateDoc(patientRef, {
      totalPaid: increment(paymentDifference),
      outstandingBalance: increment(-paymentDifference),
      updatedAt: now,
    })

    console.log("🎉 ===== PAYMENT UPDATE COMPLETED =====")

    // Return updated treatment
    const updatedTreatmentSnap = await getDoc(treatmentRef)
    const updatedData = updatedTreatmentSnap.data()
    return {
      id: updatedTreatmentSnap.id,
      ...updatedData,
      entryDate: timestampToDate(updatedData!.entryDate),
      tro: updatedData!.tro ? timestampToDate(updatedData!.tro) : undefined,
      createdAt: timestampToDate(updatedData!.createdAt),
      updatedAt: timestampToDate(updatedData!.updatedAt),
    } as Treatment
  } catch (error) {
    console.error("❌ ===== PAYMENT UPDATE FAILED =====")
    logError("updateTreatmentPayment", error)
    throw error
  }
}

// ==================== OTHER FUNCTIONS ====================
export const getPatientStats = async () => {
  try {
    const patientsRef = collection(db, PATIENTS_COLLECTION)
    const patientsSnapshot = await getDocs(patientsRef)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let newThisMonth = 0

    patientsSnapshot.forEach((doc) => {
      const data = doc.data()
      const firstVisitDate = timestampToDate(data.firstVisitDate)
      if (firstVisitDate >= startOfMonth) {
        newThisMonth++
      }
    })

    return {
      total: patientsSnapshot.size,
      newThisMonth,
    }
  } catch (error) {
    logError("getPatientStats", error)
    return { total: 0, newThisMonth: 0 }
  }
}

export const getTreatmentStats = async () => {
  try {
    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    const treatmentsSnapshot = await getDocs(treatmentsRef)

    let totalRevenue = 0
    let unpaidAmount = 0

    treatmentsSnapshot.forEach((doc) => {
      const data = doc.data()
      totalRevenue += data.amountPaid || 0
      unpaidAmount += data.balance || 0
    })

    return {
      totalRevenue,
      unpaidAmount,
      totalTreatments: treatmentsSnapshot.size,
    }
  } catch (error) {
    logError("getTreatmentStats", error)
    return { totalRevenue: 0, unpaidAmount: 0, totalTreatments: 0 }
  }
}

export const getRecentTreatments = async (limitCount = 5) => {
  try {
    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    const q = query(treatmentsRef, orderBy("entryDate", "desc"), limit(limitCount))
    const querySnapshot = await getDocs(q)

    const treatments: Treatment[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      treatments.push({
        id: doc.id,
        ...data,
        entryDate: timestampToDate(data.entryDate),
        tro: data.tro ? timestampToDate(data.tro) : undefined,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Treatment)
    })

    return treatments
  } catch (error) {
    logError("getRecentTreatments", error)
    return []
  }
}

export const getTreatmentForReceipt = async (treatmentId: string) => {
  try {
    const treatmentRef = doc(db, TREATMENTS_COLLECTION, treatmentId)
    const treatmentSnap = await getDoc(treatmentRef)

    if (!treatmentSnap.exists()) {
      throw new Error("Treatment not found")
    }

    const treatmentData = treatmentSnap.data()
    const patientRef = doc(db, PATIENTS_COLLECTION, treatmentData.patientId)
    const patientSnap = await getDoc(patientRef)

    if (!patientSnap.exists()) {
      throw new Error("Patient not found")
    }

    const patientData = patientSnap.data()

    return {
      treatment: {
        id: treatmentSnap.id,
        ...treatmentData,
        entryDate: timestampToDate(treatmentData.entryDate),
        tro: treatmentData.tro ? timestampToDate(treatmentData.tro) : undefined,
        createdAt: timestampToDate(treatmentData.createdAt),
        updatedAt: timestampToDate(treatmentData.updatedAt),
      } as Treatment,
      patient: {
        id: patientSnap.id,
        ...patientData,
        firstVisitDate: timestampToDate(patientData.firstVisitDate),
        createdAt: timestampToDate(patientData.createdAt),
        updatedAt: timestampToDate(patientData.updatedAt),
      } as Patient,
    }
  } catch (error) {
    logError("getTreatmentForReceipt", error)
    throw error
  }
}

export const getTROAppointments = async (startDate: Date, endDate: Date) => {
  try {
    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    const q = query(
      treatmentsRef,
      where("tro", ">=", Timestamp.fromDate(startDate)),
      where("tro", "<=", Timestamp.fromDate(endDate)),
      orderBy("tro", "asc"),
    )
    const querySnapshot = await getDocs(q)

    const appointments: Treatment[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      appointments.push({
        id: doc.id,
        ...data,
        entryDate: timestampToDate(data.entryDate),
        tro: timestampToDate(data.tro),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Treatment)
    })

    return appointments
  } catch (error) {
    logError("getTROAppointments", error)
    return []
  }
}

export const getCompletePatientData = async (patientId: string) => {
  try {
    const [patient, treatments] = await Promise.all([getPatientById(patientId), getPatientTreatments(patientId)])

    return {
      patient,
      treatments,
    }
  } catch (error) {
    logError("getCompletePatientData", error)
    throw error
  }
}

export const exportToExcel = async (data: Treatment[], filename: string) => {
  try {
    const headers = [
      "Patient Name",
      "Date",
      "Diagnosis",
      "Treatment Plan",
      "Tooth Number",
      "Total Amount",
      "Amount Paid",
      "Balance",
      "Status",
      "Next Appointment (TRO)",
    ]

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          `"${row.patientName}"`,
          row.entryDate.toLocaleDateString(),
          `"${row.diagnosis}"`,
          `"${row.treatmentPlan}"`,
          row.toothNumber,
          row.totalAmount.toFixed(2),
          row.amountPaid.toFixed(2),
          row.balance.toFixed(2),
          row.paymentStatus,
          row.tro ? row.tro.toLocaleDateString() : "N/A",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    logError("exportToExcel", error)
    throw error
  }
}

export const addSampleData = async () => {
  try {
    console.log("📝 Adding sample data...")

    const samplePatients = [
      {
        name: "John Doe",
        phone: "123-456-7890",
        dob: "1990-05-15",
        gender: "Male",
      },
      {
        name: "Jane Smith",
        phone: "098-765-4321",
        dob: "1985-08-22",
        gender: "Female",
      },
    ]

    const sampleTreatments = [
      {
        diagnosis: "Routine Cleaning",
        treatmentPlan: "Professional cleaning and fluoride treatment",
        toothNumber: "All",
        totalAmount: 150,
        amountPaid: 150,
        tro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        diagnosis: "Cavity Filling",
        treatmentPlan: "Composite filling for tooth #14",
        toothNumber: "14",
        totalAmount: 200,
        amountPaid: 100,
      },
    ]

    for (let i = 0; i < samplePatients.length; i++) {
      await addNewPatientWithTreatment(samplePatients[i], sampleTreatments[i])
    }

    console.log("✅ Sample data added successfully!")
    return true
  } catch (error) {
    logError("addSampleData", error)
    throw error
  }
}

export const initializeFirestoreIndexes = async () => {
  try {
    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    await getDocs(query(treatmentsRef, where("patientId", "==", "dummy"), orderBy("entryDate", "desc")))
    await getDocs(query(treatmentsRef, where("tro", ">=", Timestamp.now()), orderBy("tro", "asc")))
  } catch (error) {
    console.log("ℹ️ Indexes will be created automatically when queries are run")
  }
}

// ==================== GET ALL PATIENTS (NOT TREATMENTS) ====================
export const getAllPatients = async () => {
  try {
    console.log("👥 Fetching all patients...")
    const patientsRef = collection(db, PATIENTS_COLLECTION)
    const q = query(patientsRef, orderBy("firstVisitDate", "desc"))
    const querySnapshot = await getDocs(q)

    const patients: Patient[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      patients.push({
        id: doc.id,
        ...data,
        firstVisitDate: timestampToDate(data.firstVisitDate),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Patient)
    })

    console.log(`✅ Found ${patients.length} patients`)
    return patients
  } catch (error) {
    logError("getAllPatients", error)
    return []
  }
}

// ==================== SEARCH PATIENTS ====================
export const searchPatients = async (searchQuery: string) => {
  try {
    console.log(`🔍 Searching patients with query: "${searchQuery}"`)
    const patientsRef = collection(db, PATIENTS_COLLECTION)
    const querySnapshot = await getDocs(patientsRef)

    const patients: Patient[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const patient = {
        id: doc.id,
        ...data,
        firstVisitDate: timestampToDate(data.firstVisitDate),
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
      } as Patient

      // Search in name and phone
      if (patient.name.toLowerCase().includes(searchQuery.toLowerCase()) || patient.phone.includes(searchQuery)) {
        patients.push(patient)
      }
    })

    console.log(`✅ Found ${patients.length} patients matching "${searchQuery}"`)
    return patients
  } catch (error) {
    logError("searchPatients", error)
    return []
  }
}

// ==================== GET PATIENTS BY PAYMENT STATUS ====================
export const getPatientsByPaymentStatus = async (status: "PAID" | "UNPAID" | "PARTIALLY_PAID") => {
  try {
    console.log(`💰 Fetching patients with payment status: ${status}`)
    const patients = await getAllPatients()

    const filteredPatients = patients.filter((patient) => {
      if (status === "PAID") return patient.outstandingBalance <= 0
      if (status === "UNPAID") return patient.outstandingBalance > 0 && patient.totalPaid === 0
      if (status === "PARTIALLY_PAID") return patient.outstandingBalance > 0 && patient.totalPaid > 0
      return true
    })

    console.log(`✅ Found ${filteredPatients.length} patients with status ${status}`)
    return filteredPatients
  } catch (error) {
    logError("getPatientsByPaymentStatus", error)
    return []
  }
}

// ==================== GET PATIENTS WITH UPCOMING APPOINTMENTS ====================
export const getPatientsWithUpcomingAppointments = async () => {
  try {
    console.log("📅 Fetching patients with upcoming appointments...")
    const treatmentsRef = collection(db, TREATMENTS_COLLECTION)
    const now = new Date()
    const q = query(treatmentsRef, where("tro", ">", Timestamp.fromDate(now)))
    const querySnapshot = await getDocs(q)

    const patientIds = new Set<string>()
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      patientIds.add(data.patientId)
    })

    const patients: Patient[] = []
    for (const patientId of patientIds) {
      try {
        const patient = await getPatientById(patientId)
        patients.push(patient)
      } catch (error) {
        console.warn(`Could not fetch patient ${patientId}`)
      }
    }

    console.log(`✅ Found ${patients.length} patients with upcoming appointments`)
    return patients
  } catch (error) {
    logError("getPatientsWithUpcomingAppointments", error)
    return []
  }
}
