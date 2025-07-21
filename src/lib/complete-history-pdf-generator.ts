import { getAllPatients, getAllTreatments, Patient, Treatment } from "@/lib/firebase";

/**
 * Fetches all patient and treatment data and generates a comprehensive,
 * well-designed PDF document for printing or saving.
 */
export const generateCompleteHistoryPDF = async () => {
  try {
    // Step 1: Fetch all necessary data from Firebase in parallel for efficiency.
    console.log("🚀 Starting complete history PDF generation...");
    const [allPatients, allTreatments] = await Promise.all([
      getAllPatients(),
      getAllTreatments(),
    ]);
    console.log(`✅ Fetched ${allPatients.length} patients and ${allTreatments.length} treatments.`);

    // Step 2: Group treatments by their patientId into a Map for quick and easy lookup.
    // This avoids repeatedly searching the treatments array for each patient.
    const treatmentsByPatient = new Map<string, Treatment[]>();
    for (const treatment of allTreatments) {
      if (!treatmentsByPatient.has(treatment.patientId)) {
        treatmentsByPatient.set(treatment.patientId, []);
      }
      // The non-null assertion (!) is safe here because we just created the array if it didn't exist.
      treatmentsByPatient.get(treatment.patientId)!.push(treatment);
    }

    // Step 3: Open a new browser window where the PDF content will be rendered.
    const pdfWindow = window.open("", "_blank", "width=1000,height=800");
    if (!pdfWindow) {
      throw new Error("Unable to open PDF window. Please check your browser's popup blocker settings.");
    }

    // Step 4: Construct the complete HTML document as a template string.
    // This includes all the styling (CSS) and the data structure.
    const pdfHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Patient and Treatment History</title>
        <style>
          /* General body and page styling */
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 25px;
            color: #333;
            background-color: #f4f4f4;
          }
          .page-container {
            max-width: 1000px;
            margin: auto;
            background-color: white;
            padding: 40px;
            box-shadow: 0 0 15px rgba(0,0,0,0.1);
            border-radius: 8px;
          }
          /* Header for the entire document */
          .main-header {
            text-align: center;
            border-bottom: 4px solid #0056b3;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }
          .clinic-name {
            font-size: 36px;
            font-weight: bold;
            color: #0056b3;
          }
          .document-title {
            font-size: 22px;
            color: #555;
            margin-top: 10px;
          }
          /* Styling for each individual patient's record block */
          .patient-record {
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 40px;
            overflow: hidden; /* Ensures border-radius is respected by child elements */
            page-break-before: always; /* CRITICAL: Ensures each patient record starts on a new page */
          }
          .patient-header {
            background-color: #f0f7ff;
            padding: 20px;
            border-bottom: 1px solid #ddd;
          }
          .patient-name {
            font-size: 24px;
            font-weight: bold;
            color: #004a99;
            margin: 0;
          }
          .patient-id {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          .patient-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px;
          }
          .info-item { font-size: 14px; }
          .info-label { font-weight: 600; color: #555; }
          .treatments-section { padding: 20px; }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            border-bottom: 2px solid #eee;
            padding-bottom: 8px;
          }
          /* Styling for the treatment history table */
          .treatment-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .treatment-table th, .treatment-table td {
            border: 1px solid #e0e0e0;
            padding: 10px;
            text-align: left;
          }
          .treatment-table th { background-color: #f8f8f8; font-weight: 600; }
          .unpaid-balance { color: #d9534f; font-weight: bold; }
          .paid-balance { color: #5cb85c; font-weight: bold; }
          .no-treatments { text-align: center; padding: 30px; color: #777; font-style: italic; }
          /* Footer for the entire document */
          .print-footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #888;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          /* Print-specific styles to hide background and shadows */
          @media print {
            body { padding: 15px; background-color: white; }
            .page-container { box-shadow: none; border-radius: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <header class="main-header">
            <div class="clinic-name">Sunrise Dental Clinic and Implant Centre</div>
            <div class="document-title">Complete Patient and Treatment History</div>
            <p style="font-size: 12px; color: #777; margin-top: 10px;">Generated on: ${new Date().toLocaleString()}</p>
          </header>

          <!-- Loop through each patient and generate their record block -->
          ${allPatients.map(patient => `
            <section class="patient-record">
              <header class="patient-header">
                <h2 class="patient-name">${patient.name}</h2>
                <p class="patient-id">Patient ID: ${patient.id}</p>
              </header>
              <div class="patient-info-grid">
                <div class="info-item"><span class="info-label">Phone:</span> ${patient.phone || 'N/A'}</div>
                <div class="info-item"><span class="info-label">Age:</span> ${patient.age ? `${patient.age} years` : 'N/A'}</div>
                <div class="info-item"><span class="info-label">Gender:</span> ${patient.gender || 'N/A'}</div>
                <div class="info-item"><span class="info-label">First Visit:</span> ${patient.firstVisitDate.toLocaleDateString()}</div>
              </div>
              <div class="treatments-section">
                <div class="section-title">Treatment History (${treatmentsByPatient.get(patient.id)?.length || 0})</div>
                ${(treatmentsByPatient.get(patient.id) && treatmentsByPatient.get(patient.id)!.length > 0) ? `
                  <table class="treatment-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Diagnosis</th>
                        <th>Tooth #</th>
                        <th>Total (₹)</th>
                        <th>Paid (₹)</th>
                        <th>Balance (₹)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${treatmentsByPatient.get(patient.id)!.map(tx => `
                        <tr>
                          <td>${tx.entryDate.toLocaleDateString()}</td>
                          <td>${tx.diagnosis}</td>
                          <td>${tx.toothNumber || 'N/A'}</td>
                          <td>${tx.totalAmount.toFixed(2)}</td>
                          <td>${tx.amountPaid.toFixed(2)}</td>
                          <td class="${tx.balance > 0 ? 'unpaid-balance' : 'paid-balance'}">${tx.balance.toFixed(2)}</td>
                          <td>${tx.paymentStatus}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : `
                  <div class="no-treatments">No treatment records found for this patient.</div>
                `}
              </div>
            </section>
          `).join('')}
          <!-- End of patient loop -->

          <footer class="print-footer">
            This is a computer-generated document for record-keeping purposes.
          </footer>
        </div>
        <script>
          // Automatically trigger the print dialog after the content has loaded.
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
          // Close the popup window after printing is done or cancelled.
          window.onafterprint = function() {
            setTimeout(function() { window.close(); }, 1000);
          }
        </script>
      </body>
      </html>
    `;

    // Step 5: Write the generated HTML to the new window and close the document stream.
    pdfWindow.document.write(pdfHTML);
    pdfWindow.document.close();
    console.log("✅ PDF content generated and sent to print dialog.");

  } catch (error) {
    console.error("❌ Failed to generate complete history PDF:", error);
    alert("Failed to generate PDF. Please check the console for errors and ensure your popup blocker is disabled for this site.");
  }
};
