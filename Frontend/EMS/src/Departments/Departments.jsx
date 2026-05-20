import React, { useEffect, useMemo, useState } from "react";
import { FaUsers } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Departments.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";

const EMPTY_DEPARTMENT_FORM = {
  name: "",
  head: "",
  building: "",
  status: "",
};

const normalizeDepartmentName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [headSearch, setHeadSearch] = useState("");

  const [newDept, setNewDept] = useState(EMPTY_DEPARTMENT_FORM);

  const fetchDepartments = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.departments.list);
      const cleaned = extractCollection(res.data).map((dept) => ({
        ...dept,
        membersCount: Math.max(0, Number(dept.membersCount || 0)),
      }));
      setDepartments(cleaned);
    } catch (err) {
      console.error("Error fetching departments:", err);
      toast.error("Failed to load departments.");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.employees.list);
      const empData = extractCollection(res.data);
      setEmployees(empData);
    } catch (err) {
      console.error("Employee fetch error:", err);
      toast.error("Failed to load employees.");
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    const closeMenu = (event) => {
      if (!event.target.closest(".dept-menu-wrapper")) {
        setActiveMenu(null);
      }
    };

    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const normalizedEmployees = useMemo(
    () =>
      employees.map((emp) => ({
        id: emp.employee_Id || emp.employee_id || emp.id,
        label:
          emp.name ||
          `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
          "Employee",
        department: emp.department || emp.dept || "",
      })),
    [employees]
  );

  const employeeOptions = useMemo(
    () =>
      normalizedEmployees.map((emp) => ({
        id: emp.id,
        label: emp.label,
      })),
    [normalizedEmployees]
  );

  const selectedDepartmentMembers = useMemo(() => {
    const activeDepartment = normalizeDepartmentName(selectedDept?.departmentName);

    if (!activeDepartment) {
      return [];
    }

    return normalizedEmployees.filter(
      (employee) =>
        normalizeDepartmentName(employee.department) === activeDepartment
    );
  }, [selectedDept, normalizedEmployees]);

  const validateField = (name, draft = newDept) => {
    const value = String(draft[name] ?? "").trim();

    if (name === "name") {
      if (!value) return "Department Name is required";

      if (value.length > 25) {
        return "Department Name cannot exceed 25 characters";
      }

      if (!/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(value)) {
        return "Department Name must contain only alphabets and hyphen";
      }

      if ((value.match(/-/g) || []).length > 1) {
        return "Only 1 hyphen (-) is allowed";
      }

      return "";
    }

    if (name === "head") {
      return value ? "" : "Department Head is required";
    }

    if (name === "building") {
      if (!value) return "Building is required";

      if (value.length > 25) {
        return "Building cannot exceed 25 characters";
      }

      if (!/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(value)) {
        return "Building must contain only alphabets and hyphen";
      }

      if ((value.match(/-/g) || []).length > 1) {
        return "Only 1 hyphens (-) are allowed";
      }

      return "";
    }

    if (name === "status") {
      return value ? "" : "Status is required";
    }

    return "";
  };

  const validateForm = (draft = newDept) => {
    const nextErrors = {
      name: validateField("name", draft),
      head: validateField("head", draft),
      building: validateField("building", draft),
      status: validateField("status", draft),
    };

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, value]) => value)
    );

    setErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    const draft = {
      ...newDept,
      [name]:
        name === "name" || name === "building"
          ? value.replace(/^\s+/g, "")
          : value,
    };

    setNewDept(draft);
    setErrors((prev) => {
      const nextErrors = {
        ...prev,
        [name]: validateField(name, draft),
      };

      return Object.fromEntries(
        Object.entries(nextErrors).filter(([, error]) => error)
      );
    });
  };

  const openCreateModal = () => {
    setEditId(null);
    setErrors({});
    setNewDept(EMPTY_DEPARTMENT_FORM);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditId(null);
    setErrors({});
    setNewDept(EMPTY_DEPARTMENT_FORM);
  };

  const handleSubmit = async () => {
    const trimmed = {
      ...newDept,
      name: newDept.name.trim().replace(/\s+/g, " "),
      head: newDept.head.trim(),
      building: newDept.building.trim().replace(/\s+/g, " "),
      status: newDept.status.trim(),
    };
    const trimmedDepartmentMembers = normalizedEmployees.filter(
      (employee) =>
        normalizeDepartmentName(employee.department) ===
        normalizeDepartmentName(trimmed.name)
    );

    setNewDept(trimmed);

    if (!validateForm(trimmed)) return;

    const payload = {
      departmentName: trimmed.name,
      departmentHead: trimmed.head,
      membersCount: trimmedDepartmentMembers.length,
      building: trimmed.building,
      status: trimmed.status,
      department_Id: editId ? undefined : crypto.randomUUID(),
    };

    try {
      setSaving(true);

      if (editId) {
        await api.put(API_ENDPOINTS.departments.byId(editId), { ...payload, id: editId });
      } else {
        await api.post(API_ENDPOINTS.departments.list, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      toast.success(editId ? "Department updated successfully." : "Department added successfully.");
      closeModal();
      await fetchDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error(error.response?.data?.message || "Unable to save department.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept) => {
    setEditId(dept.id);
    setErrors({});
    setNewDept({
      name: dept.departmentName || "",
      head: dept.departmentHead || "",
      building: dept.building || "",
      status: dept.status || "",
    });
    setShowModal(true);
    setActiveMenu(null);
  };

  const handleDeleteClick = (dept) => {
    setDeptToDelete(dept);
    setShowDeleteModal(true);
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (!deptToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.departments.byId(deptToDelete.id));
      toast.success("Department deleted successfully.");
      setShowDeleteModal(false);
      setDeptToDelete(null);
      await fetchDepartments();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Unable to delete department.");
    }
  };

  return (
    <div className="dept-page">
      <ToastContainer position="top-right" autoClose={2400} />

      <div className="dept-header">
        <div>
          <h2>Departments</h2>
          <p>Manage company departments</p>
        </div>

        <button className="add-btn" onClick={openCreateModal}>
          + Add Department
        </button>
      </div>

      <div className="dept-grid">
        {departments.map((dept) => {
          const deptEmployees = normalizedEmployees.filter(
            (emp) =>
              normalizeDepartmentName(emp.department) ===
              normalizeDepartmentName(dept.departmentName)
          );

          return (
            <div
              className="dept-card"
              key={dept.id}
              onClick={() => setSelectedDept(dept)}
            >
              <div className="dept-menu-wrapper">
                <button
                  className="dept-menu-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMenu(activeMenu === dept.id ? null : dept.id);
                  }}
                >
                  ⋮
                </button>

                {activeMenu === dept.id && (
                  <div
                    className="dept-popup-menu"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button onClick={() => handleEdit(dept)}>Edit</button>
                    <button
                      className="delete"
                      onClick={() => handleDeleteClick(dept)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="dept-top">
                <div className="dept-icon">
                  <FaUsers />
                </div>

                <span
                  className={
                    dept.status === "Active"
                      ? "dept-status active"
                      : "dept-status inactive"
                  }
                >
                  {dept.status}
                </span>
              </div>

              <h3 title={dept.departmentName}>{dept.departmentName}</h3>
              <p className="dept-head" title={dept.departmentHead}>
                Head: {dept.departmentHead}
              </p>

              <div className="dept-footer">
                <span>👤 {deptEmployees.length} members</span>
                <span title={dept.building}>📍 {dept.building}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="dept-modal-overlay" onClick={closeModal}>
          <div className="dept-modal-box" onClick={(event) => event.stopPropagation()}>
            <h3>{editId ? "Edit Department" : "Add Department"}</h3>

            <div className="dept-field-group">
              <label htmlFor="dept-name-input">Department Name</label>
              <input
                id="dept-name-input"
                name="name"
                value={newDept.name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
                className={errors.name ? "field-error" : ""}
              />
              {errors.name && <p className="dept-error">{errors.name}</p>}
            </div>

            <div className="dept-field-group">
              <label htmlFor="dept-head-select">Department Head</label>

              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                className="dept-head-search"
                value={headSearch}
                onChange={(e) => setHeadSearch(e.target.value)}
              />

              {newDept.head && (
                <div
                  style={{
                    marginTop: "10px",
                    marginBottom: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#ECFEFF",
                    border: "1px solid #22D3EE",
                    color: "#0F172A",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Selected Head: {newDept.head}
                </div>
              )}

              <div
                className={`dept-head-dropdown ${errors.head ? "field-error" : ""
                  }`}
              >
                {employeeOptions
                  .filter((employee) => {
                    const search = headSearch.toLowerCase();

                    return (
                      employee.label.toLowerCase().includes(search) ||
                      String(employee.id || "")
                        .toLowerCase()
                        .includes(search)
                    );
                  })
                  .map((employee) => {
                    const isSelected = newDept.head === employee.label;

                    return (
                      <div
                        key={employee.id}
                        onClick={() => {
                          setNewDept((prev) => ({
                            ...prev,
                            head: employee.label,
                          }));

                          setErrors((prev) => ({
                            ...prev,
                            head: "",
                          }));
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          marginBottom: "6px",
                          background: isSelected
                            ? "#2563EB"
                            : "#FFFFFF",
                          color: isSelected
                            ? "#FFFFFF"
                            : "#0F172A",
                          border: isSelected
                            ? "1px solid #2563EB"
                            : "1px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                        >
                          {employee.label}
                        </div>

                        <div
                          style={{
                            fontSize: "12px",
                            opacity: 0.8,
                            marginTop: "2px",
                          }}
                        >
                          Employee ID: {employee.id || "N/A"}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {errors.head && (
                <p className="dept-error">{errors.head}</p>
              )}
            </div>

            <div className="dept-field-group">
              <label htmlFor="dept-building-input">Building</label>
              <input
                id="dept-building-input"
                name="building"
                value={newDept.building}
                onChange={handleChange}
                aria-invalid={Boolean(errors.building)}
                className={errors.building ? "field-error" : ""}
              />
              {errors.building && <p className="dept-error">{errors.building}</p>}
            </div>

            <div className="dept-field-group">
              <label htmlFor="dept-status-select">Status</label>
              <select
                id="dept-status-select"
                name="status"
                value={newDept.status}
                onChange={handleChange}
                aria-invalid={Boolean(errors.status)}
                className={errors.status ? "field-error" : ""}
              >
                <option value="">Select Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <p className="dept-error">{errors.status}</p>}
            </div>

            <div className="dept-modal-btns">
              <button onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="dept-save-btn" onClick={handleSubmit} disabled={saving}>
                {saving ? (editId ? "Updating..." : "Saving...") : editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="delete-overlay">
          <div className="delete-modal">
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>{deptToDelete?.departmentName || "this department"}</strong>?
            </p>

            <div className="delete-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-delete-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDept && (
        <div className="dept-members-overlay" onClick={() => setSelectedDept(null)}>
          <div
            className="dept-members-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dept-members-modal-header">
              <div>
                <h3>{selectedDept.departmentName}</h3>
                <p>{selectedDepartmentMembers.length} assigned members</p>
              </div>

              <button
                type="button"
                className="dept-members-close"
                onClick={() => setSelectedDept(null)}
                aria-label="Close department members"
              >
                x
              </button>
            </div>

            <div className="dept-members-list">
              {selectedDepartmentMembers.length > 0 ? (
                selectedDepartmentMembers.map((member) => (
                  <div className="dept-member-row" key={member.id || member.label}>
                    <span className="dept-member-avatar">
                      {member.label.substring(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{member.label}</strong>
                      <p>{member.id || "No employee code"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="dept-members-empty-state">
                  No employees are assigned to this department yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Departments;
