const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

/* ---------- Middleware ---------- */
app.use(express.json());
app.use(express.static("public"));

/* ---------- Routes ---------- */

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Form submission route
app.post("/submit", (req, res) => {
  const { name, sex, height_cm, weight_lbs, waist_cm, neck_cm } = req.body;

  /* ---------- Validation ---------- */
  if (!name || !sex || !height_cm || !weight_lbs || !waist_cm || !neck_cm) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
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

  /* ---------- Record to Store ---------- */
  const record = {
    name,
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

  // Ensure data directory exists
  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Sanitize name for filename
  const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");

  // Create filename
  const filename = `${safeName}_data.txt`;
  const filePath = path.join(dataDir, filename);

  // Write formatted JSON to .txt file
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf8");

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
