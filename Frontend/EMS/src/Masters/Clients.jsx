import React, { useEffect, useMemo, useState } from "react";
import "./Clients.css";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaEllipsisV } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { extractCollection } from "../utils/collections";
import { formatDate } from "../utils/date";
import { isValidEmail } from "../utils/validation";

const EMPTY_CLIENT_FORM = {
  client_Name: "",
  description: "",
  location: "",
  phone: "",
  email: "",
  active_Projects: 0,
};

function Clients() {
  const [showModal, setShowModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  const [isUpdate, setIsUpdate] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectCounts, setProjectCounts] = useState({});
  const [errors, setErrors] = useState({});

  const [newClient, setNewClient] = useState(EMPTY_CLIENT_FORM);

  const loadClients = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.masters.clients.list);
      setClients(extractCollection(res.data));
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Failed to load clients.");
    }
  };

  const loadProjectCounts = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.company.projects.list);
      const allProjects = extractCollection(res.data);

      const counts = {};
      allProjects.forEach((project) => {
        if (!counts[project.client]) counts[project.client] = 0;
        counts[project.client] += 1;
      });

      setProjectCounts(counts);
    } catch (err) {
      console.error("Project Count Error:", err);
      toast.error("Failed to load client project counts.");
    }
  };

  useEffect(() => {
    loadClients();
    loadProjectCounts();
  }, []);

  const validateField = (name, draft = newClient) => {
    const value = String(draft[name] ?? "").trim();

    if (name === "client_Name") {
      if (!value) return "Client Name is required";
      if (value.length < 2) return "Client Name must be at least 2 characters";
      return "";
    }

    if (name === "description") {
      if (!value) return "";
      if (value.length < 5) return "Description must be at least 5 characters";
      return "";
    }

    if (name === "location") {
      if (!value) return "Location is required";
      return "";
    }

    if (name === "phone") {
      if (!value) return "Phone is required";
      if (!/^\d{10}$/.test(value)) return "Enter a valid 10-digit phone number";
      return "";
    }

    if (name === "email") {
      if (!value) return "Email is required";
      if (!isValidEmail(value)) return "Enter a valid email";
      return "";
    }

    return "";
  };

  const validateForm = (draft = newClient) => {
    const nextErrors = {
      client_Name: validateField("client_Name", draft),
      description: validateField("description", draft),
      location: validateField("location", draft),
      phone: validateField("phone", draft),
      email: validateField("email", draft),
    };

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, value]) => value)
    );

    setErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  const handleViewClient = async (index) => {
    const client = clients[index];

    setSelectedClient(client);
    setShowDrawer(true);

    try {
      const res = await api.get(API_ENDPOINTS.company.projects.list);
      const allProjects = extractCollection(res.data);
      const filteredProjects = allProjects.filter(
        (project) => project.client === client.client_Name
      );

      setProjects(filteredProjects);
    } catch (error) {
      console.error("Project fetch failed:", error);
      setProjects([]);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "phone") {
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }

    const draft = {
      ...newClient,
      [name]:
        name === "client_Name" || name === "location" || name === "description"
          ? nextValue.replace(/^\s+/g, "")
          : nextValue,
    };

    setNewClient(draft);
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

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setIsUpdate(false);
    setEditIndex(null);
    setErrors({});
    setNewClient(EMPTY_CLIENT_FORM);
  };

  const openCreateModal = () => {
    setShowModal(true);
    setIsUpdate(false);
    setEditIndex(null);
    setErrors({});
    setNewClient(EMPTY_CLIENT_FORM);
  };

  const handleSaveClient = async () => {
    const trimmedClient = {
      ...newClient,
      client_Name: newClient.client_Name.trim().replace(/\s+/g, " "),
      description: newClient.description.trim().replace(/\s+/g, " "),
      location: newClient.location.trim().replace(/\s+/g, " "),
      email: newClient.email.trim(),
      phone: newClient.phone.trim(),
    };

    setNewClient(trimmedClient);

    if (!validateForm(trimmedClient)) return;

    try {
      setSaving(true);

      if (isUpdate) {
        const clientToUpdate = clients[editIndex];

        await api.put(
          API_ENDPOINTS.masters.clients.byId(
            encodeURIComponent(clientToUpdate.client_Name)
          ),
          trimmedClient,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        toast.success("Client updated successfully.");
      } else {
        await api.post(
          API_ENDPOINTS.masters.clients.list,
          {
            client_Name: trimmedClient.client_Name,
            description: trimmedClient.description,
            location: trimmedClient.location,
            phone: trimmedClient.phone,
            email: trimmedClient.email,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        toast.success("Client added successfully.");
      }

      closeModal();
      await loadClients();
      await loadProjectCounts();
    } catch (error) {
      console.error("Save Error:", error);
      toast.error(error.response?.data?.message || "Unable to save client.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index) => {
    const client = clients[index];

    try {
      await api.delete(
        API_ENDPOINTS.masters.clients.byId(
          encodeURIComponent(client.client_Name)
        )
      );

      toast.success("Client deleted successfully.");
      setClients((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
      setMenuOpenIndex(null);
      await loadProjectCounts();
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error("Unable to delete client.");
    }
  };

  const handleEdit = (index) => {
    setNewClient(clients[index]);
    setEditIndex(index);
    setIsUpdate(true);
    setErrors({});
    setShowModal(true);
    setMenuOpenIndex(null);
  };

  const visibleProjectItems = useMemo(
    () => (Array.isArray(projects) ? projects : []),
    [projects]
  );

  return (
    <div className="clients-page">
      <ToastContainer position="top-right" autoClose={2400} />

      <div className="clients-header">
        <div>
          <h2>Clients</h2>
          <p>Manage client relationships</p>
        </div>

        <button className="add-client-btn" onClick={openCreateModal}>
          + Add Client
        </button>
      </div>

      <div className="clients-grid">
        {clients.map((client, index) => (
          <div className="client-card" key={client.id || index}>
            <div className="card-header">
              <div className="avatar">
                {client.client_Name?.substring(0, 2).toUpperCase()}
              </div>

              <div className="menu-wrapper">
                <FaEllipsisV
                  className="menu-icon"
                  onClick={() =>
                    setMenuOpenIndex(menuOpenIndex === index ? null : index)
                  }
                />

                {menuOpenIndex === index && (
                  <div className="menu-dropdown">
                    <p onClick={() => handleEdit(index)}>Edit</p>
                    <p onClick={() => handleDelete(index)}>Delete</p>
                  </div>
                )}
              </div>
            </div>

            <h3 className="client-name" title={client.client_Name}>
              {client.client_Name}
            </h3>
            <p className="client-desc" title={client.description}>
              {client.description}
            </p>

            <div className="client-info">
              <p><FaMapMarkerAlt /> {client.location}</p>
              <p><FaPhoneAlt /> {client.phone}</p>
              <p><FaEnvelope /> {client.email}</p>
            </div>

            <div className="card-divider"></div>

            <div className="card-footer">
              <span>{projectCounts[client.client_Name] || 0} active projects</span>

              <button
                className="view-link"
                onClick={() => handleViewClient(index)}
              >
                View ↗
              </button>
            </div>
          </div>
        ))}
      </div>

      {showDrawer && selectedClient && (
        <div className="client-view-overlay">
          <div className="client-view-modal">
            <div className="view-header">
              <div className="view-left">
                <div className="view-avatar">
                  {selectedClient.client_Name?.substring(0, 2).toUpperCase()}
                </div>

                <div>
                  <h2>{selectedClient.client_Name}</h2>
                  <p>{selectedClient.description}</p>
                </div>
              </div>

              <button
                className="view-close"
                onClick={() => setShowDrawer(false)}
              >
                ✕
              </button>
            </div>

            <div className="view-contact">
              <p className="contact-item">
                <FaMapMarkerAlt className="contact-icon" />
                <span>{selectedClient.location}</span>
              </p>
              <p className="contact-item">
                <FaPhoneAlt className="contact-icon" />
                <span>{selectedClient.phone}</span>
              </p>
              <p className="contact-item">
                <FaEnvelope className="contact-icon" />
                <span>{selectedClient.email}</span>
              </p>
            </div>

            <div className="view-projects">
              <h4>PROJECTS ({visibleProjectItems.length})</h4>

              <div className="project-list">
                {visibleProjectItems.length > 0 ? (
                  visibleProjectItems.map((project, index) => (
                    <div className="project-card" key={index}>
                      <div>
                        <h5>{project.project_Name}</h5>

                        <p>
                          {project.start_Date
                            ? formatDate(project.start_Date)
                            : "-"}
                        </p>
                      </div>

                      <span className="status active">{project.status}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-projects">No Projects Found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="clients-add-modal-overlay-unique">
          <div className="clients-add-modal-box-unique">
            <h3>{isUpdate ? "Update Client" : "Add Client"}</h3>

            <div className="clients-field-group">
              <label htmlFor="client-name-input">Client Name</label>
              <input
                id="client-name-input"
                className={`clients-add-input-unique ${errors.client_Name ? "has-error" : ""}`}
                type="text"
                value={newClient.client_Name}
                onChange={(event) =>
                  handleChange({
                    target: { name: "client_Name", value: event.target.value },
                  })
                }
              />
              {errors.client_Name && <p className="client-form-error">{errors.client_Name}</p>}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-description-input">Description</label>
              <input
                id="client-description-input"
                className={`clients-add-input-unique ${errors.description ? "has-error" : ""}`}
                type="text"
                value={newClient.description}
                onChange={(event) =>
                  handleChange({
                    target: { name: "description", value: event.target.value },
                  })
                }
              />
              {errors.description && <p className="client-form-error">{errors.description}</p>}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-location-input">Location</label>
              <input
                id="client-location-input"
                className={`clients-add-input-unique ${errors.location ? "has-error" : ""}`}
                type="text"
                value={newClient.location}
                onChange={(event) =>
                  handleChange({
                    target: { name: "location", value: event.target.value },
                  })
                }
              />
              {errors.location && <p className="client-form-error">{errors.location}</p>}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-phone-input">Phone</label>
              <input
                id="client-phone-input"
                className={`clients-add-input-unique ${errors.phone ? "has-error" : ""}`}
                type="text"
                inputMode="numeric"
                value={newClient.phone}
                onChange={(event) =>
                  handleChange({
                    target: { name: "phone", value: event.target.value },
                  })
                }
              />
              {errors.phone && <p className="client-form-error">{errors.phone}</p>}
            </div>

            <div className="clients-field-group">
              <label htmlFor="client-email-input">Email</label>
              <input
                id="client-email-input"
                className={`clients-add-input-unique ${errors.email ? "has-error" : ""}`}
                type="email"
                value={newClient.email}
                onChange={(event) =>
                  handleChange({
                    target: { name: "email", value: event.target.value },
                  })
                }
              />
              {errors.email && <p className="client-form-error">{errors.email}</p>}
            </div>

            <div className="clients-add-actions-unique">
              <button
                className="clients-add-cancel-btn-unique"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="clients-add-save-btn-unique"
                onClick={handleSaveClient}
                disabled={saving}
              >
                {saving ? (isUpdate ? "Updating..." : "Saving...") : isUpdate ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
