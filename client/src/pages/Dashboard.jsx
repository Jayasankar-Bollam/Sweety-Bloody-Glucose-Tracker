import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="card">
      <h1>Hello, {user?.name}</h1>
      <p>Readings will go here.</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  );
}