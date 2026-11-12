import { useState } from "react";
import { SLOTS, todayString } from "../constants";

export default function ReadingForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  clearOnSuccess,
}) {
  const [date, setDate] = useState(initial?.reading_date || todayString());
  const [slot, setSlot] = useState(initial?.slot || "morning");
  const [value, setValue] = useState(initial?.value ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (value === "" || value === null) {
      return "Please enter a glucose value.";
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 40 || num > 600) {
      return "Value must be between 40 and 600 mg/dl.";
    }
    if (!date) {
      return "Please select a date.";
    }
    if (date > todayString()) {
      return "Date cannot be in the future.";
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ reading_date: date, slot, value });
      if (clearOnSuccess) setValue("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row">
        <div>
          <label>Date</label>
          <input
            type="date"
            value={date}
            max={todayString()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label>Time slot</label>
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {SLOTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Value (mg/dl)</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </button>
      {onCancel && (
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}