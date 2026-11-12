export const SLOTS = [
  { value: "morning", label: "Morning (fasting)" },
  { value: "after_breakfast", label: "After breakfast" },
  { value: "after_lunch", label: "After lunch" },
  { value: "after_dinner", label: "After dinner" },
];

export function slotLabel(value) {
  const found = SLOTS.find((s) => s.value === value);
  return found ? found.label : value;
}

export function todayString() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
}