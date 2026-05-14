import React, { useState, useEffect } from "react";
import "./Roles.css";
import { FaShieldAlt, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection, sortByNewestIdFirst } from "../utils/collections";

function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolesShowModal, setRolesShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [isEdit, setIsEdit] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  const [rolesForm, setRolesForm] = useState({
    roleName: "",
    status: "Active"
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);

    try {
      const res = await api.get(API_ENDPOINTS.masters.roles.list);

      const formattedData = sortByNewestIdFirst(
        extractCollection(res.data).map((role) => ({
          roleId: role.id ?? role.roleId ?? role.role_Id,
          roleName: role.name ?? role.roleName ?? "No Name",
          status: role.status ?? role.Status ?? "Active",
          users: role.usersCount ?? role.users ?? 0,
        })),
        (role) => role.roleId
      );

      setRoles(formattedData);
    } catch (error) {
      console.error(error);
      setRoles([]);
      toast.error(error.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleRolesChange = (e) => {
    const { name, value } = e.target;
    const nextForm = {
      ...rolesForm,
      [name]: name === "roleName" ? value.replace(/^\s+/g, "") : value
    };

    setRolesForm(nextForm);
    setErrors((prev) => ({
      ...prev,
      [name]:
        name === "roleName"
          ? nextForm.roleName.trim()
            ? ""
            : "Role Name is required"
          : nextForm.status
            ? ""
            : "Status is required"
    }));
  };

  const validateRoleForm = () => {
    const trimmedRoleName = rolesForm.roleName.trim().replace(/\s+/g, " ");
    const nextErrors = {};

    if (!trimmedRoleName) {
      nextErrors.roleName = "Role Name is required";
    } else if (trimmedRoleName.length < 2) {
      nextErrors.roleName = "Role Name must be at least 2 characters";
    }

    if (!rolesForm.status) {
      nextErrors.status = "Status is required";
    }

    setErrors(nextErrors);
    setRolesForm((prev) => ({
      ...prev,
      roleName: trimmedRoleName
    }));

    return Object.keys(nextErrors).length === 0;
  };

  const handleRolesSubmit = async () => {
    if (!validateRoleForm()) return;

    const payload = {
      name: rolesForm.roleName.trim(),
      status: rolesForm.status
    };

    setSaving(true);

    try {
      if (isEdit) {
        await api.put(
          API_ENDPOINTS.masters.roles.byId(selectedRoleId),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            }
          }
        );

        toast.success("Role updated successfully");
      } else {
        await api.post(API_ENDPOINTS.masters.roles.list, payload, {
          headers: {
            "Content-Type": "application/json",
          }
        });

        toast.success("Role added successfully");
      }

      resetForm();
      fetchRoles();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(API_ENDPOINTS.masters.roles.byId(id));

      toast.success("Role deleted successfully");
      fetchRoles();
    } catch (error) {
      console.error(error);

      const msg = error.response?.data || "";

      if (msg.includes("assigned to users")) {
        toast.error("This role is assigned to users");
      } else {
        toast.error("Unable to delete role");
      }
    }
  };

  const handleEditClick = (role) => {
    setIsEdit(true);
    setSelectedRoleId(role.roleId);

    setRolesForm({
      roleName: role.roleName,
      status: role.status
    });

    setRolesShowModal(true);
  };

  const resetForm = () => {
    setRolesForm({ roleName: "", status: "Active" });
    setErrors({});
    setIsEdit(false);
    setSelectedRoleId(null);
    setRolesShowModal(false);
  };

  if (loading) {
    return <p style={{ padding: "20px" }}>Loading roles...</p>;
  }

  return (
    <div className="roles-page-container">
      <ToastContainer
        position="top-right"
        autoClose={2000}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        style={{ zIndex: 9999 }}
      />
      <div className="roles-header-bar">
        <div>
          <h2>Roles & Permissions</h2>
        </div>

        <button
          className="roles-add-btn"
          onClick={() => {
            setRolesForm({ roleName: "", status: "Active" });
            setErrors({});
            setIsEdit(false);
            setSelectedRoleId(null);
            setRolesShowModal(true);
          }}
        >
          + Add Role
        </button>
      </div>

      <div className="roles-table-wrap">
        <table className="roles-table-main">
          <thead>
            <tr>
              <th>Role</th>
              <th>Users</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {roles.map((r, i) => (
              <tr key={r.roleId || i}>
                <td
                  className="roles-name-cell"
                  onClick={() =>
                    navigate(`/employee-permissions/${r.roleId}/${r.roleName}`)
                  }
                >
                  <div className="roles-icon-box">
                    <FaShieldAlt />
                  </div>
                  {r.roleName}
                </td>

                <td>{r.users}</td>
                <td>{r.status}</td>

                <td className="roles-action-cell">
                  <div className="roles-action-group">
                    <button
                      type="button"
                      className="roles-action-btn edit"
                      aria-label={`Edit ${r.roleName}`}
                      onClick={() => handleEditClick(r)}
                    >
                      <FaEdit />
                    </button>

                    <button
                      type="button"
                      className={`roles-action-btn delete ${
                        r.users > 0 ? "is-disabled" : ""
                      }`}
                      aria-label={`Delete ${r.roleName}`}
                      onClick={() => {
                        if (r.users > 0) {
                          toast.warning("Role already assigned to users");
                          return;
                        }
                        handleDelete(r.roleId);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rolesShowModal && (
        <div className="roles-modal-overlay">
          <div className="roles-modal-container">
            <h3>{isEdit ? "Edit Role" : "Add Role"}</h3>

            <div className="roles-field-group">
              <label htmlFor="role-name-input">Role Name</label>
              <input
                id="role-name-input"
                type="text"
                name="roleName"
                value={rolesForm.roleName}
                onChange={handleRolesChange}
                aria-invalid={Boolean(errors.roleName)}
                className={errors.roleName ? "has-error" : ""}
              />
              {errors.roleName && <p className="roles-error">{errors.roleName}</p>}
            </div>

            <div className="roles-field-group">
              <label htmlFor="role-status-select">Status</label>
              <select
                id="role-status-select"
                name="status"
                value={rolesForm.status}
                onChange={handleRolesChange}
                aria-invalid={Boolean(errors.status)}
                className={errors.status ? "has-error" : ""}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <p className="roles-error">{errors.status}</p>}
            </div>

            <div className="roles-modal-actions">
              <button onClick={resetForm}>Cancel</button>

              <button onClick={handleRolesSubmit} disabled={saving}>
                {saving ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Roles;
