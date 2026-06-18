export async function predictHouseworkTask(input) {
  const response = await fetch("/api/predict-task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || `AI task prediction failed: ${response.status}`);
  }

  return payload;
}
