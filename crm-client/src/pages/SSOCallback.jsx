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

        // 2. Decode Token
        const decoded = jwtDecode(token);
        console.log("Decoded Token Payload:", decoded); // <-- Check your console!
        
        // 3. FIX: Safely parse assignedApps 
        let apps = [];
        if (decoded.assignedApps) {
          apps = typeof decoded.assignedApps === 'string' 
            ? JSON.parse(decoded.assignedApps) 
            : decoded.assignedApps;
        }

        // 4. Find the CRM role
        const crmApp = apps.find(app => app.appName === 'crm');
        const userRole = crmApp ? crmApp.role : 'user';

        // 5. Construct User Object
        const userObj = {
          id: decoded.id || decoded._id,
          username: decoded.username,
          role: userRole, 
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName
        };

        localStorage.setItem("user", JSON.stringify(userObj));

        // 6. Redirect to the appropriate dashboard
        if (userRole === 'admin') navigate("/admin");
        else if (userRole === 'salesperson') navigate("/sales");
        else if (userRole === 'sub-admin') navigate("/sub-admin");
        else navigate("/admin"); // Default

      } catch (error) {
        console.error("❌ Token decoding failed:", error);
        // Temporarily commented out so you can read the error in the console
        // window.location.href = "http://localhost:3000"; 
      }
    } else {
      console.error("❌ No token found in URL");
      // window.location.href = "http://localhost:3000";
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h2>Connecting to Central Auth System...</h2>
      <p>If you are stuck here, open Developer Tools (F12) and check the Console tab for errors.</p>
    </div>
  );
}