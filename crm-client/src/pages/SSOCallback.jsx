import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; 

export default function SSOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (token) {
      try {
        // 1. Save Token
        localStorage.setItem("token", token);

        // 2. Decode Token to get User Info
        const decoded = jwtDecode(token);
        
        // 3. Find the Role specifically for 'crm' from the central assignedApps array
        const crmApp = decoded.assignedApps ? decoded.assignedApps.find(app => app.appName === 'crm') : null;
        const userRole = crmApp ? crmApp.role : 'user';

        // 4. Construct User Object for local state
        const userObj = {
          id: decoded.id || decoded._id,
          username: decoded.username,
          role: userRole, 
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName
        };

        // 5. Save User Object
        localStorage.setItem("user", JSON.stringify(userObj));

        // 6. Redirect based on the CRM Role
        if (userRole === 'admin') navigate("/admin");
        else if (userRole === 'salesperson') navigate("/sales");
        else if (userRole === 'sub-admin') navigate("/sub-admin");
        else navigate("/admin"); // Default fallback

      } catch (error) {
        console.error("Token decoding failed:", error);
        window.location.href = "http://localhost:3000"; // Redirect to central login on error
      }
    } else {
      window.location.href = "http://localhost:3000";
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2>Connecting to Central Auth System...</h2>
    </div>
  );
}