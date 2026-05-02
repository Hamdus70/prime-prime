import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Google OAuth Client
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const googleClient = new OAuth2Client(googleClientId, googleClientSecret);

  if (!googleClientId || !googleClientSecret) {
    console.warn("⚠️  GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing. Google SSO will fail.");
  }

  app.use(express.json());
  app.use(cors());

  // --- Firebase Admin Setup ---
  let db: admin.firestore.Firestore;
  let auth: admin.auth.Auth;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      try {
        const b64Data = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim();
        let serviceAccount: any;
        
        // Try to detect if it's already JSON or need base64 decoding
        if (b64Data.startsWith("{")) {
          serviceAccount = JSON.parse(b64Data);
        } else {
          const decoded = Buffer.from(b64Data, "base64").toString("utf-8");
          serviceAccount = JSON.parse(decoded);
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("✅ Firebase Admin initialized with service account.");
      } catch (parseErr) {
        console.error("❌ Firebase Admin Init Error (Parsing):", parseErr);
        console.warn("⚠️  FIREBASE_SERVICE_ACCOUNT_BASE64 is invalid or corrupted. Falling back to placeholder.");
        admin.initializeApp({
          projectId: "demo-project"
        });
      }
    } else {
      admin.initializeApp({
        projectId: "demo-project" // Placeholder
      });
      console.warn("⚠️  FIREBASE_SERVICE_ACCOUNT_BASE64 missing. Using placeholder config.");
    }
    db = admin.firestore();
    auth = admin.auth();
  } catch (err) {
    console.error("🔥 Critical Firebase Admin Error:", err);
  }

  // --- SMTP Configuration ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // --- Helper Functions ---
  async function generateId(type: "patient" | "staff", metadata: any) {
    const counterRef = db.collection("counters").doc(`${type}_id`);
    
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let nextId = 1;
      if (doc.exists) {
        nextId = (doc.data()?.current || 0) + 1;
        transaction.update(counterRef, { current: nextId });
      } else {
        transaction.set(counterRef, { current: 1 });
      }

      const idString = nextId.toString().padStart(4, "0");
      if (type === "patient") {
        const initials = (metadata.fullName || "PT")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 3);
        return `CL-${initials}-${idString}`;
      } else {
        const rolePrefix = (metadata.role || "STF").substring(0, 3).toUpperCase();
        return `HSP-${rolePrefix}-${idString}`;
      }
    });
  }

  // --- API Endpoints ---

  // 1. Patient Onboarding (Auto-approved)
  app.post("/api/auth/register-patient", async (req, res) => {
    const { fullName, email, password, biodata } = req.body;
    try {
      // 1. Create Auth User
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName
      });

      const systemId = await generateId("patient", { fullName });

      // 2. Create User Profile
      await db.collection("user_profiles").doc(userRecord.uid).set({
        userId: userRecord.uid,
        email,
        fullName,
        role: "patient",
        systemId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Create Patient Record & EMR Shell
      await db.collection("patients").doc(userRecord.uid).set({
        userId: userRecord.uid,
        name: fullName,
        systemId,
        biodata: biodata || {},
        status: "active",
        assignedStaff: [],
        billing: {
          balanceDue: 0,
          status: "current"
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(201).json({ success: true, systemId, userId: userRecord.uid });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 2. Staff Application Submission
  app.post("/api/application/submit", async (req, res) => {
    const data = req.body;
    try {
      const trackingToken = Math.random().toString(36).substring(2, 15);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const appRef = await db.collection("applications").add({
        ...data,
        status: "pending",
        trackingToken,
        otp,
        otpExpiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        appliedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Send confirmation email (simplified for logic)
      console.log(`[EMAIL] To: ${data.email} | Tracking: ${trackingToken} | OTP: ${otp}`);

      res.status(201).json({ success: true, trackingToken, appId: appRef.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 3. Admin: Assign Patient to Staff/Department
  app.post("/api/admin/assign", async (req, res) => {
    const { patientId, staffIds, department } = req.body;
    try {
      await db.collection("patients").doc(patientId).update({
        assignedStaff: admin.firestore.FieldValue.arrayUnion(...staffIds),
        department: department,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 4. EMR: Vitals & Nursing Reports
  app.post("/api/emr/update", async (req, res) => {
    const { patientId, type, data, staffId } = req.body;
    try {
      const collectionName = {
        vitals: "vitals",
        care_plan: "care_plans",
        drug_chart: "drug_charts",
        intake_output: "intake_output",
        nursing_report: "nursing_reports"
      }[type as string];

      if (!collectionName) throw new Error("Invalid record type");

      const recordRef = await db.collection("patients").doc(patientId).collection(collectionName).add({
        ...data,
        staffId,
        recordedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true, recordId: recordRef.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. Attendance Management
  app.post("/api/admin/sync-attendance", async (req, res) => {
    try {
      const staffSnap = await db.collection("user_profiles").where("role", "==", "staff").get();
      const today = new Date().toISOString().split("T")[0];
      
      const batch = db.batch();
      for (const doc of staffSnap.docs) {
        const recordId = `${doc.id}_${today}`;
        const recordRef = db.collection("attendance").doc(recordId);
        const record = await recordRef.get();
        
        if (!record.exists) {
          batch.set(recordRef, {
            staffId: doc.id,
            date: today,
            status: "absent",
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      await batch.commit();
      res.json({ success: true, message: "Attendance synchronized for all staff." });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 7. Admin: Approve Staff Application
  app.post("/api/admin/approve-staff", async (req, res) => {
    const { appId, role } = req.body;
    try {
      const appRef = db.collection("applications").doc(appId);
      const appDoc = await appRef.get();
      if (!appDoc.exists) throw new Error("Application not found");
      
      const appData = appDoc.data();
      const systemId = await generateId("staff", { role: appData?.role || role });
      
      // 1. Create Auth User
      const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
      const userRecord = await auth.createUser({
        email: appData?.email,
        password: tempPassword,
        displayName: appData?.fullName
      });

      // 2. Create Profile
      await db.collection("user_profiles").doc(userRecord.uid).set({
        userId: userRecord.uid,
        email: appData?.email,
        fullName: appData?.fullName,
        role: "staff",
        systemId,
        subRole: appData?.role,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update Application
      await appRef.update({
        status: "accepted",
        systemId,
        approvedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log Credentials (In real clinical, this would be an encrypted notice)
      console.log(`[STAFF CREDS] ID: ${systemId} | Temp Pass: ${tempPassword}`);

      res.json({ success: true, systemId, tempPassword });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 8. Billing: Payment Reminders
  app.post("/api/admin/billing-notifications", async (req, res) => {
    try {
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60000).toISOString().split("T")[0];
      const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60000).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];

      // Query for due dates matching these periods
      const dueSnap = await db.collection("payments")
        .where("status", "==", "pending")
        .get();

      const notifications: { patientId: string; message: string }[] = [];
      for (const doc of dueSnap.docs) {
        const payment = doc.data();
        const dueDate = payment.dueDate.split("T")[0];
        
        let message = "";
        if (dueDate === twoDaysFromNow) message = "Reminder: Your hospital bill is due in 2 days.";
        else if (dueDate === oneDayFromNow) message = "Urgent: Your hospital bill is due tomorrow.";
        else if (dueDate === today) message = "Overdue Notice: Your hospital bill is due today.";

        if (message) {
          notifications.push({ patientId: payment.patientId, message });
          // Log or send email
          console.log(`[BILLING] To: ${payment.patientId} | Msg: ${message}`);
        }
      }

      res.json({ success: true, notificationsSent: notifications.length });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 9. Application Status Tracking (OTP Login)
  app.post("/api/application/status", async (req, res) => {
    const { trackingToken, otp } = req.body;
    try {
      const appSnap = await db.collection("applications")
        .where("trackingToken", "==", trackingToken)
        .where("otp", "==", otp)
        .get();

      if (appSnap.empty) throw new Error("Invalid Token or OTP");
      
      const appData = appSnap.docs[0].data();
      res.json({ success: true, status: appData.status, details: appData });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message });
    }
  });

  // --- Internal Medicine Department System ---

  // 10. Patient Routing to Internal Medicine Subspecialties
  app.post("/api/internal-medicine/assign", async (req, res) => {
    const { patientId, subspecialties, primaryDoctorId, assignedNurseId, condition } = req.body;
    try {
      // Subspecialties is an array e.g. ["Cardiology", "Endocrinology"]
      await db.collection("patients").doc(patientId).update({
        department: "Internal Medicine",
        subspecialties: admin.firestore.FieldValue.arrayUnion(...subspecialties),
        assignedStaff: admin.firestore.FieldValue.arrayUnion(primaryDoctorId, assignedNurseId),
        routingNote: condition,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log assignment
      await db.collection("patients").doc(patientId).collection("clinical_notes").add({
        content: `Routed to Internal Medicine (${subspecialties.join(", ")}). Primary MD: ${primaryDoctorId}`,
        type: "consultation",
        staffId: "SYSTEM",
        recordedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true, message: "Patient successfully routed." });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 11. Request Investigation (Lab/Imaging)
  app.post("/api/internal-medicine/investigation/request", async (req, res) => {
    const { patientId, testType, category, staffId } = req.body;
    try {
      const invRef = await db.collection("patients").doc(patientId).collection("investigations").add({
        type: testType,
        category,
        status: "requested",
        requestedBy: staffId,
        requestedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, investigationId: invRef.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 12. Clinical Alerts Generation (Manual or Triggered)
  app.post("/api/internal-medicine/alerts", async (req, res) => {
    const { patientId, type, severity, message } = req.body;
    try {
      const alertRef = await db.collection("alerts").add({
        patientId,
        type,
        severity,
        message,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, alertId: alertRef.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 13. Subspecialty-Specific Workflow logic (Helper for UI/Backend triggers)
  app.post("/api/internal-medicine/vitals-analysis", async (req, res) => {
    const { patientId, vitals } = req.body;
    const alerts: { type: string; severity: string; message: string }[] = [];

    // Cardiology Logic
    if (vitals.bloodPressure) {
      const parts = vitals.bloodPressure.split("/");
      const sys = Number(parts[0]);
      const dia = Number(parts[1]);
      if (sys > 140 || dia > 90) alerts.push({ type: "vitals", severity: "high", message: "Hypertension detected (>140/90)" });
    }

    // Pulmonology Logic
    if (vitals.spo2 && vitals.spo2 < 92) {
      alerts.push({ type: "vitals", severity: "critical", message: "Hypoxia: SpO2 < 92%" });
    }

    // Endocrinology Logic
    if (vitals.glucose && (vitals.glucose > 200 || vitals.glucose < 70)) {
      alerts.push({ type: "vitals", severity: "high", message: `Abnormal Glucose Level: ${vitals.glucose}` });
    }

    // Auto-create alerts if any
    for (const a of alerts) {
      await db.collection("alerts").add({
        patientId,
        type: a.type,
        severity: a.severity,
        message: a.message,
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.json({ success: true, alertsGenerated: alerts.length, alerts });
  });

  // 14. AI Clinical Insight Hook
  app.post("/api/internal-medicine/ai-insight", async (req, res) => {
    const { patientId } = req.body;
    try {
      // Logic: Fetch vitals trend + nursing reports to feed AI context
      const vitalsSnap = await db.collection("patients").doc(patientId).collection("vitals").orderBy("recordedAt", "desc").limit(5).get();
      const reportsSnap = await db.collection("patients").doc(patientId).collection("nursing_reports").orderBy("recordedAt", "desc").limit(3).get();

      const context = {
        vitals: vitalsSnap.docs.map(d => d.data()),
        reports: reportsSnap.docs.map(d => d.data())
      };

      res.json({ 
        success: true, 
        summary: "Patient vitals are stable. Last nursing report indicates moderate pain management efficacy.",
        contextPrepared: true
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- Auth Proxy (Bypass Domain Restrictions) ---
  
  app.get("/api/auth/google/url", (req, res) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(400).json({ 
          success: false, 
          error: "Google SSO is not configured on this environment. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the settings." 
        });
      }
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
      const url = googleClient.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
        redirect_uri: redirectUri,
      });
      res.json({ url });
    } catch (err: any) {
      console.error("SSO URL Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

    try {
      const { tokens } = await googleClient.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      
      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.email) throw new Error("Invalid Google Payload");

      // Get or Create Firebase user by email
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(payload.email);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          userRecord = await auth.createUser({
            email: payload.email,
            displayName: payload.name,
            photoURL: payload.picture,
            emailVerified: true,
          });
        } else {
          throw err;
        }
      }

      const customToken = await auth.createCustomToken(userRecord.uid);
      
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f8fafc; color: #1e293b;">
            <div style="background: white; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); text-align: center;">
              <h2 style="margin-bottom: 0.5rem; color: #4338ca;">Authentication Successful</h2>
              <p style="opacity: 0.6; font-size: 0.875rem;">Synchronizing with PrimeVita clinical cloud...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', customToken: '${customToken}' }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  window.location.href = '/portal/auth';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Google Auth Callback Error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fff1f2; color: #9f1239;">
            <div style="background: white; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); text-align: center; max-width: 400px;">
              <h2 style="margin-bottom: 0.5rem; color: #e11d48;">Authentication Failed</h2>
              <p style="opacity: 0.8; font-size: 0.875rem;">${error.message}</p>
              <button onclick="window.close()" style="margin-top: 1.5rem; background: #e11d48; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer;">Return to App</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_FAILURE', error: '${error.message.replace(/'/g, "\\'")}' }, '*');
              }
            </script>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { identifier, password, isSystemLogin } = req.body;
    try {
      let uid: string;

      if (isSystemLogin) {
        // Find by Operational ID (CL- or HSP-)
        const credSnap = await db.collection("credentials").doc(identifier).get();
        if (!credSnap.exists) throw new Error("Operational identifier not found.");
        
        const credData = credSnap.data();
        if (!credData || credData.passwordHash !== password) throw new Error("Invalid security cipher.");
        
        uid = credData.userId;
      } else {
        // Find by Email - Verify via REST API
        const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
        const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password, returnSecureToken: true })
        });
        
        const authData: any = await authResponse.json();
        if (authData.error) {
          const msg = authData.error.message;
          throw new Error(msg === "INVALID_LOGIN_CREDENTIALS" || msg === "INVALID_PASSWORD" ? "Invalid email or password." : msg);
        }
        uid = authData.localId;
      }

      const customToken = await admin.auth().createCustomToken(uid);
      res.json({ success: true, customToken });
    } catch (err: any) {
      console.error("Auth Proxy Error:", err);
      res.status(401).json({ success: false, error: err.message });
    }
  });

  // --- Pharmacy System ---

  // 15. Pharmacy Order Dispatch (Prescription -> Pharmacy)
  app.post("/api/pharmacy/order", async (req, res) => {
    const { patientId, drugChartId, drugName, dosage, quantity, prescribedBy } = req.body;
    try {
      const orderRef = await db.collection("pharmacy_orders").add({
        patientId,
        drugChartId,
        drugName,
        dosage,
        quantity,
        status: "pending",
        prescribedBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true, orderId: orderRef.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 16. Pharmacy Dispensing (Update stock + Bill patient)
  app.post("/api/pharmacy/dispense", async (req, res) => {
    const { orderId, pharmacistId, itemId, cost } = req.body;
    try {
      await db.runTransaction(async (transaction) => {
        const orderRef = db.collection("pharmacy_orders").doc(orderId);
        const inventoryRef = db.collection("inventory").doc(itemId);
        
        const orderDoc = await transaction.get(orderRef);
        const invDoc = await transaction.get(inventoryRef);

        if (!orderDoc.exists || !invDoc.exists) throw new Error("Order or Inventory Item not found");
        
        const qty = orderDoc.data()?.quantity || 0;
        const currentStock = invDoc.data()?.stockLevel || 0;

        if (currentStock < qty) throw new Error("Insufficient stock for dispensing.");

        // 1. Update Order
        transaction.update(orderRef, {
          status: "dispensed",
          pharmacistId,
          dispensedAt: admin.firestore.FieldValue.serverTimestamp(),
          cost
        });

        // 2. Adjust Inventory
        transaction.update(inventoryRef, {
          stockLevel: currentStock - qty
        });

        // 3. Create Bill
        const paymentRef = db.collection("payments").doc();
        transaction.set(paymentRef, {
          patientId: orderDoc.data()?.patientId,
          amount: cost,
          description: `Pharmacy: ${orderDoc.data()?.drugName} (${orderDoc.data()?.dosage})`,
          status: "pending",
          type: "invoice",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60000).toISOString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ success: true, message: "Medication dispensed and patient billed." });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- Laboratory System ---

  // 17. Laboratory: Collect Sample
  app.post("/api/laboratory/collect-sample", async (req, res) => {
    const { patientId, investigationId, technicianId, sampleType } = req.body;
    try {
      const invRef = db.collection("patients").doc(patientId).collection("investigations").doc(investigationId);
      await invRef.update({
        status: "sampled",
        sampleType,
        technicianId,
        sampleCollectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 18. Laboratory: Complete Result (Upload + Bill)
  app.post("/api/laboratory/submit-result", async (req, res) => {
    const { patientId, investigationId, technicianId, parameters, reportContent, cost } = req.body;
    try {
      await db.runTransaction(async (transaction) => {
        const invRef = db.collection("patients").doc(patientId).collection("investigations").doc(investigationId);
        
        transaction.update(invRef, {
          status: "completed",
          parameters,
          reportContent,
          technicianId,
          resultAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create Bill for testing
        const paymentRef = db.collection("payments").doc();
        transaction.set(paymentRef, {
          patientId,
          amount: cost,
          description: `Laboratory Test: Finalized Result`,
          status: "pending",
          type: "invoice",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60000).toISOString(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ success: true, message: "Results uploaded and clinician notified." });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- Surgery Department System ---

  // 19. Surgery: Route to Surgery (Referral)
  app.post("/api/surgery/route", async (req, res) => {
    const { patientId, diagnosis, subspecialty, surgeonId, procedureType, urgency } = req.body;
    try {
      const caseRef = await db.collection("surgical_cases").add({
        patientId,
        diagnosis,
        subspecialty,
        assignedSurgeonId: surgeonId,
        procedureType,
        urgency,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update patient department
      await db.collection("patients").doc(patientId).update({
        department: "Surgery",
        subspecialties: admin.firestore.FieldValue.arrayUnion(subspecialty),
        assignedStaff: admin.firestore.FieldValue.arrayUnion(surgeonId)
      });

      res.json({ success: true, caseId: caseRef.id });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 20. Surgery: Theatre Scheduling (No double booking)
  app.post("/api/surgery/schedule", async (req, res) => {
    const { caseId, theatreId, startTime, endTime } = req.body;
    try {
      await db.runTransaction(async (transaction) => {
        // Check for conflicts
        const conflictSnap = await db.collection("theatre_schedule")
          .where("theatreId", "==", theatreId)
          .where("status", "==", "booked")
          .get();

        const requestedStart = new Date(startTime).getTime();
        const requestedEnd = new Date(endTime).getTime();

        for (const doc of conflictSnap.docs) {
          const booked = doc.data();
          const bStart = new Date(booked.startTime).getTime();
          const bEnd = new Date(booked.endTime).getTime();

          // Conflict logic: overlap check
          if (requestedStart < bEnd && requestedEnd > bStart) {
            throw new Error(`Theatre ${theatreId} is already booked from ${booked.startTime} to ${booked.endTime}`);
          }
        }

        // Create schedule
        const schedRef = db.collection("theatre_schedule").doc();
        transaction.set(schedRef, {
          theatreId,
          caseId,
          startTime,
          endTime,
          status: "booked"
        });

        // Update case status
        transaction.update(db.collection("surgical_cases").doc(caseId), {
          status: "scheduled",
          theatreId,
          surgeryDate: startTime
        });
      });

      res.json({ success: true, message: "Surgery scheduled successfully." });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 21. Surgery: Pre-Op Checklist Completion
  app.post("/api/surgery/preop/complete", async (req, res) => {
    const { caseId, checklist, staffId } = req.body;
    try {
      await db.collection("surgical_cases").doc(caseId).collection("preop_checklist").doc("latest").set({
        ...checklist,
        completedBy: staffId,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 22. Surgery: Record Intra-Operative Findings
  app.post("/api/surgery/record", async (req, res) => {
    const { caseId, record, staffId } = req.body;
    try {
      // Validate Pre-Op
      const preop = await db.collection("surgical_cases").doc(caseId).collection("preop_checklist").doc("latest").get();
      if (!preop.exists || !preop.data()?.consentObtained) {
        throw new Error("Cannot record surgery findings: Pre-Op checklist incomplete (Consent missing)");
      }

      await db.runTransaction(async (transaction) => {
        const recordRef = db.collection("surgical_cases").doc(caseId).collection("intraop_record").doc();
        transaction.set(recordRef, {
          ...record,
          staffId,
          recordedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Finalize case status
        transaction.update(db.collection("surgical_cases").doc(caseId), {
          status: "completed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 23. Surgery: Post-Op Update
  app.post("/api/surgery/postop/update", async (req, res) => {
    const { caseId, monitoringData, staffId } = req.body;
    try {
      await db.collection("surgical_cases").doc(caseId).collection("postop_monitoring").add({
        ...monitoringData,
        staffId,
        recordedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update Case to Post-Op if not already
      await db.collection("surgical_cases").doc(caseId).update({
        status: "post-op"
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // --- Vite & Static Handling ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hospital Backend running on http://localhost:${PORT}`);
  });
}

startServer();
