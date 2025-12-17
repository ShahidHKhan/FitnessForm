const form = document.getElementById("fitnessForm");
const results = document.getElementById("results");
const errorBox = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("hidden");
  results.classList.add("hidden");

  const formData = new FormData(form);

  const payload = {
    name: formData.get("name"),
    sex: formData.get("sex"),
    height_cm: Number(formData.get("height_cm")),
    weight_lbs: Number(formData.get("weight_lbs")),
    waist_cm: Number(formData.get("waist_cm")),
    neck_cm: Number(formData.get("neck_cm")),
  };

  try {
    const res = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.error || "Submission failed";
      errorBox.classList.remove("hidden");
      return;
    }

    document.getElementById("bmi").textContent = data.data.bmi;
    document.getElementById("category").textContent = data.data.bmi_category;
    document.getElementById("ratio").textContent = data.data.waist_height_ratio;
    document.getElementById("bodyfat").textContent =
      data.data.body_fat_percentage ?? "N/A";

    results.classList.remove("hidden");
  } catch (err) {
    errorBox.textContent = "Server error. Please try again.";
    errorBox.classList.remove("hidden");
  }
});
