"use client"

import { initializeFirestoreIndexes } from "./firebase"

export const setupDatabase = async () => {
  try {
    console.log("Setting up database...")
    await initializeFirestoreIndexes()
    console.log("Database setup complete!")
  } catch (error) {
    console.error("Error setting up database:", error)
  }
}
