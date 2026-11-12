import { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [msg, setMsg] = useState("Checking server...");

  useEffect(() => {
    api("/readings")
      .then(() => setMsg("Logged in and connected"))
      .catch((err) => setMsg("Server says: " + err.message));
  }, []);

  return <h1>{msg}</h1>;
}