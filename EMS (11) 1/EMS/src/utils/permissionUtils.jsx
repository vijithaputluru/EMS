export const normalize = (name) =>
  (name || "")
    .toLowerCase()
    .replace(/^user\s+/i, "") // remove "User"
    .replace(/\s+/g, " ")
    .trim();

/* ✅ UNIVERSAL NAME MAPPING */
const moduleMap = {
  "task management": "task management",
  tasks: "task management",

  payroll: "payroll",
  payslip: "payslip",

  "leave management": "leave management",
  leave: "leave management",

  attendance: "attendance",

  notifications: "notifications",
};

/* ✅ MAP FUNCTION */
const mapModule = (name) => {
  const normalized = normalize(name);
  return moduleMap[normalized] || normalized;
};

/* ✅ GET PERMISSIONS */
export const getPermissions = () => {
  try {
    return (
      JSON.parse(localStorage.getItem("permissions")) ||
      JSON.parse(sessionStorage.getItem("permissions")) ||
      []
    );
  } catch {
    return [];
  }
};

/* ✅ FINAL PERMISSION CHECK */
export const hasPermission = (moduleName) => {
  const permissions = getPermissions();
  const target = mapModule(moduleName);

  return permissions.some((p) => {
    const name =
      typeof p === "string" ? p : p?.moduleName;

    return (
      p?.canAccess === true &&              // ✅ must be true
      mapModule(name) === target            // ✅ mapped compare
    );
  });
};