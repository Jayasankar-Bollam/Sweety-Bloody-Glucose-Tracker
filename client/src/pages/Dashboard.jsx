import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { getUser, logout } from "../auth";
import { slotLabel } from "../constants";
import ReadingForm from "../components/ReadingForm";
import Reports from "../components/Reports";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function loadReadings() {
    try {
      const data = await api("/readings");
      setReadings(data);
      setPageError("");
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReadings();
  }, []);

  async function addReading(data) {
    await api("/readings", { method: "POST", body: data });
    await loadReadings();
  }

  async function saveReading(id, data) {
    await api(`/readings/${id}`, { method: "PUT", body: data });
    setEditingId(null);
    await loadReadings();
  }

  async function deleteReading(id) {
    if (!window.confirm("Delete this reading?")) return;
    try {
      await api(`/readings/${id}`, { method: "DELETE" });
      await loadReadings();
    } catch (err) {
      setPageError(err.message);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const groups = [];
  readings.forEach((r) => {
    const last = groups[groups.length - 1];
    if (last && last.date === r.reading_date) {
      last.items.push(r);
    } else {
      groups.push({ date: r.reading_date, items: [r] });
    }
  });

  return (
    <div className="card wide">
      <div className="header">
        <h1>Hello, {user?.name}</h1>
        <button className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <h2>Add a reading</h2>
      <ReadingForm
        submitLabel="Add reading"
        onSubmit={addReading}
        clearOnSuccess
      />
      
            <h2>Reports</h2>
      <Reports refreshKey={readings} />
      
      <h2>Your readings</h2>
      {pageError && <p className="error">{pageError}</p>}
      {loading && <p>Loading...</p>}

      {!loading && readings.length === 0 && (
        <p className="empty">No readings yet. Add your first one above.</p>
      )}

      {groups.map((group) => (
        <div key={group.date}>
          <h3 className="date-heading">{group.date}</h3>
          {group.items.map((r) =>
            editingId === r.id ? (
              <div key={r.id} className="reading edit-box">
                <ReadingForm
                  initial={r}
                  submitLabel="Save"
                  onSubmit={(data) => saveReading(r.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div key={r.id} className="reading">
                <span>{slotLabel(r.slot)}</span>
                <strong>{r.value} mg/dl</strong>
                <span className="actions">
                  <button className="secondary" onClick={() => setEditingId(r.id)}>
                    Edit
                  </button>
                  <button className="danger" onClick={() => deleteReading(r.id)}>
                    Delete
                  </button>
                </span>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}