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
  runTransaction,
} from "firebase/firestore"


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
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
  age: number
  gender: string
  firstVisitDate: Date
  totalBilled: number
  totalPaid: number
  outstandingBalance: number
  createdAt: Date
  updatedAt: Date
}

export interface PaymentRecord {
  amount: number
  date: Date
  note?: string
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
  paymentHistory: PaymentRecord[]
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
  patientData: Omit<Patient, "id" | "firstVisitDate" | "totalBilled" | "totalPaid" | "outstandingBalance" | "createdAt" | "updatedAt">,
  treatmentData: Omit<Treatment, "id" | "patientId" | "patientName" | "balance" | "paymentStatus" | "createdAt" | "updatedAt">,
) => {
  try {
    console.log(" ===== CREATING NEW PATIENT WITH FIRST TREATMENT =====")
    console.log(" Patient data:", patientData)
    console.log(" Treatment data:", treatmentData)

    const now = Timestamp.now()
    const entryTimestamp = Timestamp.fromDate(treatmentData.entryDate)

    // Calculate treatment financials
    const balance = treatmentData.totalAmount - treatmentData.amountPaid
    const paymentStatus: Treatment["paymentStatus"] =
      balance <= 0 ? "PAID" : treatmentData.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"

    console.log(` Calculated: Balance=₹${balance}, Status=${paymentStatus}`)

    // STEP 1: Create patient document
    const newPatient = {
      ...patientData,
      firstVisitDate: entryTimestamp,
      totalBilled: treatmentData.totalAmount,
      totalPaid: treatmentData.amountPaid,
      outstandingBalance: balance,
      createdAt: now,
      updatedAt: now,
    }

    console.log(" Creating patient document...")
    const patientRef = await addDoc(collection(db, PATIENTS_COLLECTION), newPatient)
    const patientId = patientRef.id
    console.log(` Patient created with ID: ${patientId}`)

    // STEP 2: Create treatment document
    const newTreatment = {
      ...treatmentData,
      patientId: patientId,
      patientName: patientData.name,
      entryDate: entryTimestamp,
      balance,
      paymentStatus,
      tro: treatmentData.tro ? Timestamp.fromDate(treatmentData.tro) : null,
      createdAt: now,
      updatedAt: now,
    }

    console.log(" Creating treatment document...")
    const treatmentRef = await addDoc(collection(db, TREATMENTS_COLLECTION), newTreatment)
    console.log(` Treatment created with ID: ${treatmentRef.id}`)

    console.log(" ===== NEW PATIENT CREATION COMPLETED =====")
    return patientId
  } catch (error) {
    console.error(" ===== NEW PATIENT CREATION FAILED =====")
    logError("addNewPatientWithTreatment", error)
    throw error
  }
}

// ==================== STEP 2: ADD TREATMENT TO EXISTING PATIENT ====================
export const addTreatmentToPatient = async (
  patientId: string,
  treatmentData: Omit<
    Treatment,
    "id" | "patientId" | "patientName" | "balance" | "paymentStatus" | "createdAt" | "updatedAt"
  >, // <-- MODIFIED: Removed "entryDate" from Omit
) => {
  try {
    console.log("➕ ===== ADDING TREATMENT TO EXISTING PATIENT =====")
    console.log(`👤 Target Patient ID: "${patientId}"`)
    console.log("🏥 Treatment data:", treatmentData)

    if (!patientId || patientId.trim() === "") {
      throw new Error("Patient ID is required and cannot be empty")
    }

    // STEP 1: Verify patient exists
    console.log("🔍 STEP 1: Verifying patient exists...")
    const patientRef = doc(db, PATIENTS_COLLECTION, patientId)
    const patientSnap = await getDoc(patientRef)
    if (!patientSnap.exists()) {
      throw new Error(`Patient not found with ID: ${patientId}`)
    }
    const patientData = patientSnap.data()
    console.log(`✅ Patient found: "${patientData.name}"`)

    // STEP 2: Calculate treatment financials
    const now = Timestamp.now()
    const entryTimestamp = Timestamp.fromDate(treatmentData.entryDate)
    const balance = treatmentData.totalAmount - treatmentData.amountPaid
    const paymentStatus: Treatment["paymentStatus"] =
      balance <= 0 ? "PAID" : treatmentData.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"

    // STEP 3: Create treatment document
    const newTreatment = {
      ...treatmentData,
      patientId: patientId,
      patientName: patientData.name,
      entryDate: entryTimestamp, // <-- MODIFIED: Use the selected entry date
      balance,
      paymentStatus,
      tro: treatmentData.tro ? Timestamp.fromDate(treatmentData.tro) : null,
      createdAt: now,
      updatedAt: now,
    }
    const treatmentRef = await addDoc(collection(db, TREATMENTS_COLLECTION), newTreatment)
    console.log(`✅ Treatment created with ID: ${treatmentRef.id}`)

    // STEP 4: Update patient totals
    await updateDoc(patientRef, {
      totalBilled: increment(treatmentData.totalAmount),
      totalPaid: increment(treatmentData.amountPaid),
      outstandingBalance: increment(balance),
      updatedAt: now,
    })
    console.log("✅ Patient totals updated")

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
export const updateTreatmentPayment = async (treatmentId: string, newPaymentAmount: number, note?: string) => {
  try {
    console.log(`💰 ===== UPDATING TREATMENT PAYMENT =====`)
    console.log(`🏥 Treatment ID: "${treatmentId}"`)
    console.log(`💰 New payment amount: $${newPaymentAmount}`)

    const now = Timestamp.now()

    // Get treatment data
    const treatmentRef = doc(db, TREATMENTS_COLLECTION, treatmentId)
    const treatmentSnap = await getDoc(treatmentRef)

    if (!treatmentSnap.exists()) {
      throw new Error("Treatment not found")
    }

    const treatmentData = treatmentSnap.data()
    const oldAmountPaid = treatmentData.amountPaid || 0
    const newTotalPaid = oldAmountPaid + newPaymentAmount

    // Create new payment record
    const newPayment: PaymentRecord = {
      amount: newPaymentAmount,
      date: new Date(),
      note: note
    }

    // Get existing payment history or initialize empty array
    const existingHistory = treatmentData.paymentHistory || []

    const newBalance = treatmentData.totalAmount - newTotalPaid
    const newPaymentStatus: Treatment["paymentStatus"] =
      newBalance <= 0 ? "PAID" : newTotalPaid > 0 ? "PARTIALLY_PAID" : "UNPAID"

    console.log(`💰 Payment change: $${oldAmountPaid} → $${newTotalPaid} (new payment: $${newPaymentAmount})`)
    console.log(`💰 New balance: $${newBalance}, Status: ${newPaymentStatus}`)

    // Update treatment with new payment history
    await updateDoc(treatmentRef, {
      amountPaid: newTotalPaid,
      balance: newBalance,
      paymentStatus: newPaymentStatus,
      paymentHistory: [...existingHistory, newPayment],
      updatedAt: now,
    })

    // Update patient totals
    const patientRef = doc(db, PATIENTS_COLLECTION, treatmentData.patientId)
    await updateDoc(patientRef, {
      totalPaid: increment(newPaymentAmount),
      outstandingBalance: increment(-newPaymentAmount),
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

// New function to export the complete patient and treatment history
export const exportToExcel = async () => {
  try {
    // 1. Fetch all patients and all treatments in parallel
    const [allPatients, allTreatments] = await Promise.all([
      getAllPatients(),
      getAllTreatments(),
    ]);

    // 2. Create a quick-lookup map for patients by their ID for efficiency
    const patientsMap = new Map(allPatients.map((p) => [p.id, p]));

    // 3. Combine patient and treatment data
    const combinedData = allTreatments.map((treatment) => {
      const patient = patientsMap.get(treatment.patientId);
      return {
        // Patient Fields
        patientId: patient?.id || "N/A",
        patientName: patient?.name || treatment.patientName,
        patientPhone: patient?.phone || "N/A",
        patientAge: patient?.age || "N/A",
        patientGender: patient?.gender || "N/A",
        firstVisitDate: patient?.firstVisitDate.toLocaleDateString() || "N/A",

        // Treatment Fields
        treatmentId: treatment.id,
        entryDate: treatment.entryDate.toLocaleDateString(),
        diagnosis: treatment.diagnosis,
        treatmentPlan: treatment.treatmentPlan,
        toothNumber: treatment.toothNumber,
        totalAmount: treatment.totalAmount,
        amountPaid: treatment.amountPaid,
        balance: treatment.balance,
        paymentStatus: treatment.paymentStatus,
        tro: treatment.tro ? treatment.tro.toLocaleDateString() : "N/A",
      };
    });

    // 4. Define the new, more comprehensive headers
    const headers = [
      "Patient ID",
      "Patient Name",
      "Phone",
      "Age",
      "Gender",
      "First Visit",
      "Treatment ID",
      "Treatment Date",
      "Diagnosis",
      "Treatment Plan",
      "Tooth #",
      "Total Amount",
      "Amount Paid",
      "Balance",
      "Status",
      "Next Appointment (TRO)",
    ];

    // 5. Generate the CSV content from the combined data
    const csvContent = [
      headers.join(","),
      ...combinedData.map(
        (row) =>
          [
            row.patientId,
            `"${row.patientName}"`,
            row.patientPhone,
            row.patientAge,
            row.patientGender,
            row.firstVisitDate,
            row.treatmentId,
            row.entryDate,
            `"${row.diagnosis.replace(/"/g, '""')}"`, // Handle quotes within diagnosis
            `"${row.treatmentPlan.replace(/"/g, '""')}"`, // Handle quotes within plan
            row.toothNumber || "",
            row.totalAmount.toFixed(2),
            row.amountPaid.toFixed(2),
            row.balance.toFixed(2),
            row.paymentStatus,
            row.tro,
          ].join(","),
      ),
    ].join("\n");

    // 6. Create and trigger the download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "complete_patient_history.csv"; // Set a fixed filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    logError("exportCompleteHistoryToExcel", error);
    throw error;
  }
};

export const addSampleData = async () => {
  try {
    console.log("📝 Adding sample data...")

    const samplePatients = [
      {
        name: "John Doe",
        phone: "123-456-7890",
        age: 30,
        gender: "Male",
      },
      {
        name: "Jane Smith",
        phone: "098-765-4321",
        age: 28,  
        gender: "Female",
      },
    ]

    const sampleTreatments: Omit<Treatment, "id" | "createdAt" | "updatedAt" | "patientId" | "patientName" | "balance" | "paymentStatus">[] = [
      {
        diagnosis: "Routine Cleaning",
        treatmentPlan: "Professional cleaning and fluoride treatment",
        toothNumber: "All",
        totalAmount: 150,
        amountPaid: 150,
        tro: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        entryDate: new Date(),
        paymentHistory: [
          {
            amount: 150,
            date: new Date(),
            note: "Initial payment"
          }
        ],
      },
      {
        diagnosis: "Cavity Filling",
        treatmentPlan: "Composite filling for tooth #14",
        toothNumber: "14",
        totalAmount: 200,
        amountPaid: 100,
        entryDate: new Date(),
        paymentHistory: [
          {
            amount: 100,
            date: new Date(),
            note: "Initial payment"
          }
        ],
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

import {
  //... other imports
  writeBatch,
} from "firebase/firestore"

// ... other functions

/**
 * Deletes a patient and all of their associated treatment documents in a single atomic operation.
 * @param patientId The ID of the patient to delete.
 * @returns A promise that resolves to true on success.
 */

// Add direct patient payment
export const addPatientPayment = async (patientId: string, amount: number, note?: string) => {
  try {
    console.log("💰 ===== ADDING DIRECT PATIENT PAYMENT =====")
    console.log(`👤 Patient ID: "${patientId}"`)
    console.log(`💵 Payment amount: ₹${amount}`)

    if (!patientId || patientId.trim() === "") {
      throw new Error("Patient ID is required")
    }

    if (amount <= 0) {
      throw new Error("Payment amount must be positive")
    }

    const now = Timestamp.now()

    // Get all unpaid/partially paid treatments for this patient
    const treatmentsQuery = query(
      collection(db, TREATMENTS_COLLECTION),
      where("patientId", "==", patientId),
      where("paymentStatus", "in", ["UNPAID", "PARTIALLY_PAID"]),
      orderBy("entryDate", "asc")
    )

    // Get all treatments that need payment (outside transaction)
    const treatmentsSnap = await getDocs(treatmentsQuery);

    await runTransaction(db, async (transaction) => {
      // Get patient data first
      const patientRef = doc(db, PATIENTS_COLLECTION, patientId)
      const patientDoc = await transaction.get(patientRef)
      
      if (!patientDoc.exists()) {
        throw new Error("Patient not found")
      }
      
      const patient = patientDoc.data()
      
      if (amount > patient.outstandingBalance) {
        throw new Error("Payment amount cannot exceed outstanding balance")
      }

      let remainingAmount = amount
      
      // Update each treatment until the payment amount is exhausted
      interface TreatmentDocData {
        amountPaid: number
        balance: number
        totalAmount: number
        paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID"
        paymentHistory?: PaymentRecord[]
      }

      interface PaymentRecord {
        amount: number
        date: Date
        note?: string
      }

      treatmentsSnap.docs.forEach((treatmentDoc) => {
        if (remainingAmount <= 0) return

        const treatment = treatmentDoc.data() as TreatmentDocData
        const treatmentRef = treatmentDoc.ref

        if (treatment.balance > 0) {
          const paymentForTreatment: number = Math.min(treatment.balance, remainingAmount)
          const newAmountPaid: number = treatment.amountPaid + paymentForTreatment
          const newBalance: number = treatment.totalAmount - newAmountPaid
          const newPaymentStatus: "PAID" | "PARTIALLY_PAID" = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID"

          // Add payment record to treatment
          const paymentRecord: PaymentRecord = {
            amount: paymentForTreatment,
            date: now.toDate(),
            note: note || "Direct patient payment"
          }

          transaction.update(treatmentRef, {
            amountPaid: newAmountPaid,
            balance: newBalance,
            paymentStatus: newPaymentStatus,
            paymentHistory: [...(treatment.paymentHistory || []), paymentRecord],
            updatedAt: now
          })

          remainingAmount -= paymentForTreatment
        }
      })

      // Add payment record to patient
      const paymentRecord = {
        amount,
        date: now,
        note: note || "Direct payment"
      }

      // Update patient totals
      transaction.update(patientRef, {
        totalPaid: increment(amount),
        outstandingBalance: increment(-amount),
        paymentHistory: [...(patient.paymentHistory || []), paymentRecord],
        updatedAt: now
      })
    })

    console.log("✅ ===== DIRECT PAYMENT ADDITION COMPLETED =====")
  } catch (error) {
    console.error("❌ ===== DIRECT PAYMENT ADDITION FAILED =====")
    logError("addPatientPayment", error)
    throw error
  }
}

export const deleteSingleTreatment = async (treatmentId: string) => {
  try {
    console.log(`🗑️ ===== DELETING SINGLE TREATMENT =====`);
    console.log(`🏥 Treatment ID to delete: "${treatmentId}"`);

    const treatmentRef = doc(db, "treatments", treatmentId);
    const treatmentSnap = await getDoc(treatmentRef);

    if (!treatmentSnap.exists()) {
      throw new Error("Treatment not found. It may have already been deleted.");
    }

    const treatmentData = treatmentSnap.data();
    const patientId = treatmentData.patientId;

    if (!patientId) {
      throw new Error("Treatment is not linked to a patient.");
    }

    // Use a batched write for an atomic update.
    const batch = writeBatch(db);

    // Step 1: Update the patient's financial totals by decrementing the values.
    const patientRef = doc(db, "patients", patientId);
    batch.update(patientRef, {
      totalBilled: increment(-treatmentData.totalAmount),
      totalPaid: increment(-treatmentData.amountPaid),
      outstandingBalance: increment(-treatmentData.balance),
      updatedAt: Timestamp.now(),
    });
    console.log(`📊 Decrementing patient totals for patient ID: ${patientId}`);

    // Step 2: Delete the actual treatment document.
    batch.delete(treatmentRef);
    console.log(`🔥 Deleting treatment document: ${treatmentId}`);

    // Step 3: Commit the batch.
    await batch.commit();
    console.log("✅ Patient financials updated and treatment deleted successfully.");
    console.log("🎉 ===== SINGLE TREATMENT DELETION COMPLETED =====");

    return true;
  } catch (error) {
    console.error("❌ ===== SINGLE TREATMENT DELETION FAILED =====");
    logError("deleteSingleTreatment", error);
    throw error;
  }
};
export const deletePatientAndTreatments = async (patientId: string) => {
  try {
    console.log(`🗑️ ===== DELETING PATIENT AND ALL TREATMENTS =====`);
    console.log(`👤 Patient ID to delete: "${patientId}"`);

    // Use a batched write to perform multiple operations atomically.
    const batch = writeBatch(db);

    // Step 1: Find all treatment documents for the given patient.
    const treatmentsRef = collection(db, "treatments");
    const q = query(treatmentsRef, where("patientId", "==", patientId));
    const treatmentsSnapshot = await getDocs(q);

    if (!treatmentsSnapshot.empty) {
      console.log(`🔥 Deleting ${treatmentsSnapshot.size} associated treatments...`);
      treatmentsSnapshot.forEach((doc) => {
        batch.delete(doc.ref); // Add each treatment deletion to the batch.
      });
    } else {
      console.log("ℹ️ No associated treatments found for this patient.");
    }

    // Step 2: Add the patient document deletion to the batch.
    const patientRef = doc(db, "patients", patientId);
    batch.delete(patientRef);
    console.log(`🔥 Deleting patient document: ${patientId}`);

    // Step 3: Commit all the delete operations in the batch at once.
    await batch.commit();
    console.log("✅ Batched delete committed successfully.");
    console.log("🎉 ===== PATIENT DELETION COMPLETED =====");

    return true;
  } catch (error) {
    console.error("❌ ===== PATIENT DELETION FAILED =====");
    logError("deletePatientAndTreatments", error);
    throw error;
  }
};


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
