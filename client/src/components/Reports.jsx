import { useEffect, useState } from "react";
import { api } from "../api";
import { slotLabel, todayString } from "../constants";

const TYPES = [
  { type: "daily", title: "Daily" },
  { type: "mtd", title: "Month-to-date" },
  { type: "monthly", title: "Previous month" },
];

function formatRange(from, to) {
  return from === to ? from : `${from} to ${to}`;
}

function ReportCard({ title, report }) {
  if (!report) return null;

  return (
    <div className="report-card">
      <h3>{title}</h3>
      <p className="range">{formatRange(report.from, report.to)}</p>

      {report.empty ? (
        <p className="empty">No readings for this period.</p>
      ) : (
        <>
          <div className="stats">
            <div>
              <span>Highest</span>
              <strong>{report.highest}</strong>
            </div>
            <div>
              <span>Lowest</span>
              <strong>{report.lowest}</strong>
            </div>
            <div>
              <span>Average</span>
              <strong>{report.average}</strong>
            </div>
            <div>
              <span>Readings</span>
              <strong>{report.count}</strong>
            </div>
          </div>

          {report.readings && (
            <ul className="report-list">
              {report.readings.map((r) => (
                <li key={r.id}>
                  <span>{slotLabel(r.slot)}</span>
                  <strong>{r.value} mg/dl</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function Reports({ refreshKey }) {
  const [date, setDate] = useState(todayString());
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date) return;
    let cancelled = false;

    async function load() {
      try {
        const results = await Promise.all(
          TYPES.map((t) => api(`/reports?type=${t.type}&date=${date}`))
        );
        if (cancelled) return;
        const next = {};
        TYPES.forEach((t, i) => {
          next[t.type] = results[i];
        });
        setReports(next);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [date, refreshKey]);

  return (
    <div>
      <label>Report date</label>
      <input
        type="date"
        value={date}
        max={todayString()}
        onChange={(e) => setDate(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading reports...</p>}

      {!loading && (
        <div className="reports">
          {TYPES.map((t) => (
            <ReportCard key={t.type} title={t.title} report={reports[t.type]} />
          ))}
        </div>
      )}
    </div>
  );
}