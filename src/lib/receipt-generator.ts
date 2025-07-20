interface ReceiptData {
  patient: {
    id: string;
    name: string;
    phone: string;
    dob: string;
    gender: string;
  };
  treatment: {
    id: string;
    entryDate: Date;
    diagnosis: string;
    treatmentPlan: string;
    toothNumber: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    paymentStatus: string;
    tro?: Date; // Next appointment date
  };
  clinic: {
    name: string;
    Doctor_name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export const generateReceiptPDF = async (data: ReceiptData) => {
  // Create a new window for the receipt
  const receiptWindow = window.open("", "_blank", "width=800,height=600");

  if (!receiptWindow) {
    throw new Error("Unable to open receipt window. Please allow popups.");
  }

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Treatment Receipt - ${data.patient.name}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .clinic-name {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .clinic-info {
          color: #666;
          font-size: 14px;
        }
        .receipt-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 30px 0;
          color: #1f2937;
        }
        .section {
          margin-bottom: 25px;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #374151;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 5px 0;
        }
        .info-label {
          font-weight: 600;
          color: #4b5563;
        }
        .info-value {
          color: #1f2937;
        }
        .financial-summary {
          background-color: #f9fafb;
          border: 2px solid #e5e7eb;
        }
        .total-row {
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #374151;
          padding-top: 10px;
          margin-top: 10px;
        }
        .paid-amount {
          color: #059669;
        }
        .balance-amount {
          color: #dc2626;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-paid {
          background-color: #d1fae5;
          color: #065f46;
        }
        .status-unpaid {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .status-partial {
          background-color: #fef3c7;
          color: #92400e;
        }
        .appointment-section {
          background-color: #eff6ff;
          border: 2px solid #3b82f6;
        }
        .appointment-highlight {
          color: #1d4ed8;
          font-weight: bold;
          font-size: 16px;
        }
          .footer {
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: #333;
  padding: 20px;
  border-top: 1px solid #ccc;
  margin-top: 30px;
}

.footer p {
  margin: 6px 0;
}

.footer p:last-child {
  font-style: italic;
  color: #555;
  margin-top: 20px;
}

        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        .print-date {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-date">
        Receipt Generated: ${new Date().toLocaleString()}
      </div>
      
      <div class="header">
        <div class="clinic-name">${data.clinic.name}</div>
        <div class="clinic-info">
          ${data.clinic.address}<br>
          Phone: ${data.clinic.phone} | Email: ${data.clinic.email}
        </div>
      </div>

      <div class="receipt-title">TREATMENT RECEIPT</div>

      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="info-row">
          <span class="info-label">Patient Name:</span>
          <span class="info-value">${data.patient.name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone Number:</span>
          <span class="info-value">${data.patient.phone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date of Birth:</span>
          <span class="info-value">${data.patient.dob || "Not provided"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Gender:</span>
          <span class="info-value">${
            data.patient.gender || "Not specified"
          }</span>
        </div>
        <div class="info-row">
          <span class="info-label">Patient ID:</span>
          <span class="info-value">${data.patient.id}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Treatment Details</div>
        <div class="info-row">
          <span class="info-label">Treatment Date:</span>
          <span class="info-value">${data.treatment.entryDate.toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Diagnosis:</span>
          <span class="info-value">${data.treatment.diagnosis}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Treatment Plan:</span>
          <span class="info-value">${data.treatment.treatmentPlan}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tooth Number:</span>
          <span class="info-value">${data.treatment.toothNumber || "N/A"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Treatment ID:</span>
          <span class="info-value">${data.treatment.id}</span>
        </div>
      </div>

      ${
        data.treatment.tro
          ? `
      <div class="section appointment-section">
        <div class="section-title">Next Appointment</div>
        <div class="info-row">
          <span class="info-label">Next Visit Date (TRO):</span>
          <span class="info-value appointment-highlight">${data.treatment.tro.toLocaleDateString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Appointment Time:</span>
          <span class="info-value">Please contact clinic to confirm time</span>
        </div>
      </div>
      `
          : ""
      }

      <div class="section financial-summary">
        <div class="section-title">Financial Summary</div>
        <div class="info-row">
          <span class="info-label">Total Treatment Cost:</span>
          <span class="info-value">₹${data.treatment.totalAmount.toFixed(
            2
          )}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Amount Paid:</span>
          <span class="info-value paid-amount">₹${data.treatment.amountPaid.toFixed(
            2
          )}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Outstanding Balance:</span>
          <span class="info-value balance-amount">₹${data.treatment.balance.toFixed(
            2
          )}</span>
        </div>
        <div class="info-row total-row">
          <span class="info-label">Payment Status:</span>
          <span class="info-value">
            <span class="status-badge ${
              data.treatment.paymentStatus === "PAID"
                ? "status-paid"
                : data.treatment.paymentStatus === "UNPAID"
                ? "status-unpaid"
                : "status-partial"
            }">
              ${data.treatment.paymentStatus}
            </span>
          </span>
        </div>
      </div>

     <div class="footer" style="font-family: Arial, sans-serif; font-size: 14px; color: #333; padding: 20px; border-top: 1px solid #ccc; margin-top: 30px;">
  <p><strong>Thank you for choosing our dental clinic!</strong></p>

  ${
    data.treatment.tro
      ? `<p><strong>Please remember your next appointment on ${data.treatment.tro.toLocaleDateString()}</strong></p>`
      : ""
  }

  <p>
    For any queries regarding this receipt, please contact us at 
    <strong>${data.clinic.phone}</strong>
  </p>

  <p>
    Treated by: <strong>${data.clinic.Doctor_name}</strong>
  </p>

  <p>
    Address: <strong>${data.clinic.address}</strong>
  </p>

  <p>
    Email: <strong>${data.clinic.email}</strong>
  </p>

  <p style="margin-top: 20px; font-style: italic; color: #555;">
    This is a computer-generated receipt and does not require a signature.
  </p>
</div>


      <script>
        // Auto-print when page loads
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
        
        // Close window after printing
        window.onafterprint = function() {
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;

  receiptWindow.document.write(receiptHTML);
  receiptWindow.document.close();
};

// Generate comprehensive patient PDF with all treatment history
export const generatePatientCompletePDF = async (
  patientData: any,
  treatmentsData: any[]
) => {
  const pdfWindow = window.open("", "_blank", "width=800,height=600");

  if (!pdfWindow) {
    throw new Error("Unable to open PDF window. Please allow popups.");
  }

  const pdfHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Complete Patient Record - ${patientData.name}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .clinic-name {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .document-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin: 30px 0;
          color: #1f2937;
        }
        .section {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #374151;
          margin-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .info-label {
          font-weight: 600;
          color: #4b5563;
        }
        .info-value {
          color: #1f2937;
        }
        .treatment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .treatment-table th,
        .treatment-table td {
          border: 1px solid #e5e7eb;
          padding: 12px 8px;
          text-align: left;
          font-size: 12px;
        }
        .treatment-table th {
          background-color: #f9fafb;
          font-weight: bold;
          color: #374151;
        }
        .treatment-table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .financial-summary {
          background-color: #f0f9ff;
          border: 2px solid #3b82f6;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          text-align: center;
        }
        .summary-item {
          padding: 15px;
          border-radius: 8px;
          background-color: white;
        }
        .summary-amount {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .paid { color: #059669; }
        .unpaid { color: #dc2626; }
        .total { color: #1f2937; }
        .print-date {
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .treatment-table { font-size: 10px; }
          .treatment-table th, .treatment-table td { padding: 8px 4px; }
        }
      </style>
    </head>
    <body>
      <div class="print-date">
        Complete Patient Record Generated: ${new Date().toLocaleString()}
      </div>
      
      <div class="header">
        <div class="clinic-name">Sunrise Dental Clinic</div>
        <div>Complete Patient Medical Record</div>
      </div>

      <div class="document-title">PATIENT COMPLETE RECORD</div>

      <div class="section">
        <div class="section-title">Patient Information</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Patient Name:</span>
            <span class="info-value">${patientData.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Patient ID:</span>
            <span class="info-value">${patientData.id}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone Number:</span>
            <span class="info-value">${patientData.phone}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date of Birth:</span>
            <span class="info-value">${patientData.dob || "Not provided"}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Gender:</span>
            <span class="info-value">${
              patientData.gender || "Not specified"
            }</span>
          </div>
          <div class="info-item">
            <span class="info-label">First Visit:</span>
            <span class="info-value">${patientData.firstVisitDate.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div class="section financial-summary">
        <div class="section-title">Financial Summary</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-amount total">₹${patientData.totalBilled.toFixed(
              2
            )}</div>
            <div>Total Billed</div>
          </div>
          <div class="summary-item">
            <div class="summary-amount paid">₹${patientData.totalPaid.toFixed(
              2
            )}</div>
            <div>Total Paid</div>
          </div>
          <div class="summary-item">
            <div class="summary-amount unpaid">₹${patientData.outstandingBalance.toFixed(
              2
            )}</div>
            <div>Outstanding Balance</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Complete Treatment History (${
          treatmentsData.length
        } treatments)</div>
        <table class="treatment-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Diagnosis</th>
              <th>Treatment Plan</th>
              <th>Tooth #</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Next Appt (TRO)</th>
            </tr>
          </thead>
          <tbody>
            ${treatmentsData
              .map(
                (treatment) => `
              <tr>
                <td>${treatment.entryDate.toLocaleDateString()}</td>
                <td>${treatment.diagnosis}</td>
                <td>${treatment.treatmentPlan}</td>
                <td>${treatment.toothNumber || "N/A"}</td>
                <td>₹${treatment.totalAmount.toFixed(2)}</td>
                <td class="paid">₹${treatment.amountPaid.toFixed(2)}</td>
                <td class="${
                  treatment.balance > 0 ? "unpaid" : "paid"
                }">₹${treatment.balance.toFixed(2)}</td>
                <td>${treatment.paymentStatus}</td>
                <td>${
                  treatment.tro ? treatment.tro.toLocaleDateString() : "N/A"
                }</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p><strong>This is a complete patient medical record backup</strong></p>
        <p>Generated on ${new Date().toLocaleDateString()} for backup and reference purposes</p>
        <p>Sunrise Dental Clinic - Phone: +91 75085 74656, +91 89682 88817</p>
        <p>Doctor: Dr. Suraj Sharma, Dr. Karuna Sharma</p>
        <p>Address: Gali No 7, Near Shishu Niketan School, Nayagaon, Chandigarh, Punjab, 160103</p>
        <p>Email: sunrisedental817@gmail.com</p>
        <p>This is a computer-generated document and does not require a signature.</p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
        
        window.onafterprint = function() {
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;

  pdfWindow.document.write(pdfHTML);
  pdfWindow.document.close();
};
// This interface defines the shape of the data required for the receipt.
interface ReceiptData {
  patient: {
    id: string;
    name: string;
    phone: string;
    dob: string;
    gender: string;
  };
  treatment: {
    id: string;
    entryDate: Date;
    diagnosis: string;
    treatmentPlan: string;
    toothNumber: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    paymentStatus: string;
    tro?: Date; // Next appointment date
  };
  doctorId?: string;
}

// Default clinic information - this can be easily configured.
export const defaultClinicInfo = {
  name: "Sunrise Dental Clinic",
  Doctor_name: "Dr. Suraj Sharma, Dr. Karuna Sharma",
  address:
    "Gali No 7, Near Shishu Niketan School, Nayagaon, Chandigarh, Punjab, 160103",
  phone: "‪+91 75085 74656 ‬+91 89682 88817",
  email: "sunrisedental817@gmail.com",
};

/**
 * Generates a beautifully formatted WhatsApp receipt and opens the WhatsApp share link.
 * @param data - The receipt data containing patient and treatment information.
 * @returns A promise that resolves to true on success, or throws an error on failure.
 */
export const sendReceiptToWhatsApp = async (
  data: ReceiptData
): Promise<boolean> => {
  try {
    // 1. Clean and format the patient's phone number for the WhatsApp URL.
    let phoneNumber = data.patient.phone.replace(/[^\d+]/g, "");

    // If the number doesn't start with a '+', assume it's an Indian number and add +91.
    if (!phoneNumber.startsWith("+")) {
      // Remove any leading 0 if present before adding country code
      if (phoneNumber.startsWith("0")) {
        phoneNumber = phoneNumber.substring(1);
      }
      phoneNumber = "+91" + phoneNumber;
    }

    // 2. Prepare the data for the message body.
    const clinic = defaultClinicInfo;
    const patientName = data.patient.name;
    const treatmentDate = data.treatment.entryDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const diagnosis = data.treatment.diagnosis;
    const treatmentPlan = data.treatment.treatmentPlan;
    const toothNumber = data.treatment.toothNumber;
    const totalAmount = data.treatment.totalAmount.toFixed(2);
    const amountPaid = data.treatment.amountPaid.toFixed(2);
    const balance = data.treatment.balance.toFixed(2);
    const paymentStatus = data.treatment.paymentStatus;
    const nextAppointment = data.treatment.tro
      ? data.treatment.tro.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "None scheduled";

    // 3. Construct the detailed and formatted WhatsApp message with emojis.
    const message = `🦷 *${clinic.name}*
_${clinic.address}_

👤 *Patient:* ${patientName}
📅 *Treatment Date:* ${treatmentDate}
🔍 *Diagnosis:* ${diagnosis}
📋 *Treatment Plan:* ${treatmentPlan}
🦷 *Tooth No:* ${toothNumber}

💰 *Payment Details:*
• Total: ₹${totalAmount}
• Paid: ₹${amountPaid}
• Balance: ₹${balance}
• Status: *${paymentStatus}*

🗓️ *Next Appointment:* ${nextAppointment}
👨‍⚕️ *Treated By:* ${clinic.Doctor_name}
📞 *Contact:* ${clinic.phone}
📧 *Email:* ${clinic.email}

🙏 Thank you for trusting us with your smile!
_${clinic.name}_`;

    // 4. Encode the message to be safely used in a URL.
    const encodedMessage = encodeURIComponent(message);

    // 5. Create the WhatsApp URL and open it in a new tab.
    // The .replace("+", "") is added to ensure compatibility with some systems.
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(
      "+",
      ""
    )}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");

    return true;
  } catch (error) {
    console.error("Error sending to WhatsApp:", error);
    // Propagate the error to be handled by the calling function.
    throw new Error("Failed to send receipt to WhatsApp");
  }
};
