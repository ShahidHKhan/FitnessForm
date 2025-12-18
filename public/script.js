const form = document.getElementById("fitnessForm");
const results = document.getElementById("results");
const errorBox = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // reset UI
  errorBox.classList.add("hidden");
  results.classList.add("hidden");

  const formData = new FormData(form);

  const payload = {
    name: formData.get("name"),
    email: formData.get("email"),
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

    // SUCCESS UX: no metrics shown
    form.reset();
    results.classList.remove("hidden");

  } catch (err) {
    errorBox.textContent = "Server error. Please try again.";
    errorBox.classList.remove("hidden");
  }
});
