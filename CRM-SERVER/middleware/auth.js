// // middleware/Auth.js
// const jwt = require("jsonwebtoken");

// const auth = (req, res, next) => {
//   const authHeader = req.header("Authorization");

//   if (!authHeader) {
//     return res.status(401).json({ message: "No token, authorization denied" });
//   }

//   // Check for 'Bearer ' prefix and extract the token
//   const token = authHeader.startsWith("Bearer ")
//     ? authHeader.slice(7, authHeader.length)
//     : null;

//   if (!token) {
//     return res.status(401).json({ message: "Token format is invalid" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // Attach user information to the request object
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token is not valid" });
//   }
// };

// module.exports = auth; // Corrected export


const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Check for 'Bearer ' prefix and extract the token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7, authHeader.length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token format is invalid" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // --- FIX: CENTRAL AUTH ROLE MAPPING ---
    let userRole = decoded.role || "user"; 
    if (decoded.assignedApps) {
      try {
        const apps = typeof decoded.assignedApps === "string" 
          ? JSON.parse(decoded.assignedApps) 
          : decoded.assignedApps;
        const crmApp = apps.find(app => app.appName === "crm");
        if (crmApp) userRole = crmApp.role;
      } catch (err) {
        console.error("Failed to parse assignedApps in middleware");
      }
    }

    // Attach user information WITH the corrected role
    req.user = { ...decoded, role: userRole }; 
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = auth;