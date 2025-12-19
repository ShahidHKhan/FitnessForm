require("dotenv").config();

const rateLimit = require("express-rate-limit");
const express = require("express");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static("public"));

/* ---------- Rate Limiting ---------- */
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                 // max 10 submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many submissions. Please try again later.",
  },
});


/* ---------- Email Transport (Gmail App Password) ---------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ---------- Routes ---------- */

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Form submission route
app.post("/submit", submitLimiter, async (req, res) => {
  const { name, email, sex, height_cm, weight_lbs, waist_cm, neck_cm } = req.body;

  /* ---------- Validation ---------- */
  if (
    !name ||
    !email ||
    !sex ||
    !height_cm ||
    !weight_lbs ||
    !waist_cm ||
    !neck_cm
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email address",
    });
  }


  if (!["male", "female"].includes(sex.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: "Sex must be 'male' or 'female'",
    });
  }

  if (
    height_cm <= 0 ||
    weight_lbs <= 0 ||
    waist_cm <= 0 ||
    neck_cm <= 0
  ) {
    return res.status(400).json({
      success: false,
      error: "All measurements must be positive numbers",
    });
  }

  /* ---------- Convert lbs → kg ---------- */
  const weight_kg = weight_lbs * 0.453592;

  /* ---------- BMI ---------- */
  const height_m = height_cm / 100;
  const bmi = weight_kg / (height_m * height_m);

  let bmi_category;
  if (bmi < 18.5) bmi_category = "Underweight";
  else if (bmi < 25) bmi_category = "Normal";
  else if (bmi < 30) bmi_category = "Overweight";
  else bmi_category = "Obese";

  /* ---------- Waist-to-Height Ratio ---------- */
  const waist_height_ratio = waist_cm / height_cm;

  /* ---------- Body Fat Percentage (US Navy) ---------- */
  let body_fat_percentage = null;
  if (sex.toLowerCase() === "male") {
    body_fat_percentage =
      86.010 * Math.log10(waist_cm - neck_cm) -
      70.041 * Math.log10(height_cm) +
      36.76;
  }

  /* ---------- Record (still structured in code) ---------- */
  const record = {
    name,
    email,
    sex,
    height_cm,
    weight_lbs,
    weight_kg: Number(weight_kg.toFixed(2)),
    waist_cm,
    neck_cm,
    metrics: {
      bmi: Number(bmi.toFixed(2)),
      bmi_category,
      waist_height_ratio: Number(waist_height_ratio.toFixed(2)),
      body_fat_percentage:
        body_fat_percentage !== null
          ? Number(body_fat_percentage.toFixed(2))
          : null,
    },
    timestamp: new Date().toISOString(),
  };

  /* ---------- File Storage ---------- */
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${safeName}_data.txt`;
  const filePath = path.join(dataDir, filename);

  /* ---------- Build UI-Friendly Report ---------- */
  const reportText = `
FITNESS METRICS REPORT
======================

Name: ${record.name}
Email: ${record.email}
Sex: ${record.sex.charAt(0).toUpperCase() + record.sex.slice(1)}

Measurements
------------
Height: ${record.height_cm} cm
Weight: ${record.weight_lbs} lbs (${record.weight_kg} kg)
Waist: ${record.waist_cm} cm
Neck: ${record.neck_cm} cm

Computed Metrics
----------------
BMI: ${record.metrics.bmi}
BMI Category: ${record.metrics.bmi_category}
Waist-to-Height Ratio: ${record.metrics.waist_height_ratio}
Body Fat Percentage: ${
    record.metrics.body_fat_percentage !== null
      ? record.metrics.body_fat_percentage + "%"
      : "N/A"
  }

Report Generated At
-------------------
${new Date(record.timestamp).toUTCString()}
`.trim();

  /* ---------- Write the formatted report ---------- */
  fs.writeFileSync(filePath, reportText, "utf8");

  /* ---------- Email the File ---------- */
  try {
    await transporter.sendMail({
      from: `"Fitness Metrics Report" <${process.env.EMAIL_USER}>`,
      to: email,                      // user
      bcc: process.env.OWNER_EMAIL,   // owner
      replyTo: email,                 // reply goes to user
      subject: "Your Fitness Metrics Report",
      text: "Your fitness metrics report is attached.",
      attachments: [
        {
          filename: filename,
          path: filePath,
        },
      ],
    });
  } catch (err) {
    console.error("Email failed:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to send email",
    });
  }

  /* ---------- Response ---------- */
  res.json({
    success: true,
    data: record.metrics,
  });
});

/* ---------- Server ---------- */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
