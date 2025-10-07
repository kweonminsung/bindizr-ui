import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="mt-4">
      <button onClick={handleLogout} className="btn-primary">
        Logout
      </button>
    </div>
  );
}
