import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Projects.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS } from "../api/endpoints";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppDatePicker from "../components/AppDatePicker";
import { extractCollection, sortByDateDesc } from "../utils/collections";
import { formatDate, getTodayInputValue, toIsoDateString } from "../utils/date";

const PROJECT_STATUSES = [
  "Yet to Start",
  "In Progress",
  "Completed",
  "On Hold",
];

const EMPTY_PROJECT_FORM = {
  name: "",
  id: "",
  originalId: "",
  client: "",
  startDate: "",
  endDate: "",
  team: "",
  status: "",
};

const normalizeProjects = (response) =>
  sortByDateDesc(
    extractCollection(response).map((project) => ({
      name: project.project_Name ?? project.name ?? "",
      id: project.project_Id ?? project.id ?? "",
      client: project.client ?? "",
      startDate: project.start_Date ? String(project.start_Date).split("T")[0] : "",
      endDate: project.end_Date ? String(project.end_Date).split("T")[0] : "",
      team: String(project.team_Members ?? project.team ?? ""),
      status: project.status ?? "",
    })),
    (project) => project.startDate
  );

const normalizeClients = (response) =>
  extractCollection(response).map((client) => ({
    id: client.id ?? client.client_Id ?? client.client_Name,
    name: client.client_Name ?? client.name ?? "",
  }));

const sanitizeProjectName = (value) =>
  String(value)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/g, "");

const sanitizeProjectId = (value) =>
  String(value).toUpperCase().replace(/[^A-Z0-9-]/g, "");

const sanitizeTeamSize = (value) =>
  String(value).replace(/\D/g, "").slice(0, 4);

const formatDisplayDate = (value) => {
  return formatDate(value);
};

const getStatusClassName = (status) => {
  const normalized = String(status).toLowerCase();

  if (normalized.includes("progress")) return "progress";
  if (normalized.includes("completed")) return "completed";
  if (normalized.includes("hold")) return "hold";
  return "planned";
};

function Projects() {
  const [clients, setClients] = useState([]);
  const [projectsShowModal, setProjectsShowModal] = useState(false);
  const [projectsEditMode, setProjectsEditMode] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isClosingDeletePopup, setIsClosingDeletePopup] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [projectsList, setProjectsList] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [projectsForm, setProjectsForm] = useState(EMPTY_PROJECT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const projectNameInputRef = useRef(null);

  const todayString = useMemo(() => {
    return getTodayInputValue();
  }, []);

  const getMinimumStartDate = (draftForm = projectsForm) => {
    if (!projectsEditMode) return todayString;

    if (draftForm.startDate && draftForm.startDate < todayString) {
      return draftForm.startDate;
    }

    return todayString;
  };

  const effectiveStartDateMin = useMemo(() => {
    return getMinimumStartDate(projectsForm);
  }, [projectsEditMode, projectsForm, todayString]);

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await api.get(API_ENDPOINTS.company.projects.list);
      setProjectsList(normalizeProjects(response));
    } catch (error) {
      console.error("Project fetch error:", error);
      toast.error("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.masters.clients.list);
      setClients(normalizeClients(response));
    } catch (error) {
      console.error("Client fetch error:", error);
      toast.error("Failed to load clients.");
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  useEffect(() => {
    if (!projectsShowModal && !showDeletePopup) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [projectsShowModal, showDeletePopup]);

  useEffect(() => {
    if (!projectsShowModal && !showDeletePopup) return undefined;

    let timer;

    if (projectsShowModal) {
      timer = window.setTimeout(() => {
        projectNameInputRef.current?.focus();
      }, 80);
    }

    const handleEscape = (event) => {
      if (event.key !== "Escape" || isSubmitting) return;

      if (showDeletePopup) {
        closeDeletePopup();
        return;
      }

      if (projectsShowModal) {
        closeProjectModal();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSubmitting, projectsShowModal, showDeletePopup]);

  const resetForm = () => {
    setProjectsForm(EMPTY_PROJECT_FORM);
    setFormErrors({});
    setApiError("");
  };

  const openCreateProjectModal = () => {
    resetForm();
    setProjectsEditMode(false);
    setIsClosingModal(false);
    setProjectsShowModal(true);
  };

  const closeProjectModal = (forceClose = false) => {
    if (isSubmitting && !forceClose) return;

    setIsClosingModal(true);
    window.setTimeout(() => {
      setProjectsShowModal(false);
      setProjectsEditMode(false);
      setIsClosingModal(false);
      resetForm();
    }, 180);
  };

  const closeDeletePopup = () => {
    setIsClosingDeletePopup(true);
    window.setTimeout(() => {
      setShowDeletePopup(false);
      setProjectToDelete(null);
      setIsClosingDeletePopup(false);
    }, 180);
  };

  const validateField = (fieldName, draftForm = projectsForm) => {
    const value = String(draftForm[fieldName] ?? "");
    const trimmedValue = value.trim();

    switch (fieldName) {
      case "name": {
        if (!trimmedValue) return "Project Name is required";
        if (trimmedValue.length < 3) return "Project Name must be at least 3 characters";
        if (trimmedValue.length > 100) return "Project Name cannot exceed 100 characters";
        if (!/^[A-Za-z0-9 _-]+$/.test(trimmedValue)) {
          return "Use only letters, numbers, spaces, - or _";
        }
        return "";
      }

      case "id": {
        if (!trimmedValue) return "Project ID is required";
        if (!/^[A-Z]{2,10}-?\d{1,10}$/.test(trimmedValue)) {
          return "Use a format like PRJ001";
        }

        const idExists = projectsList.some(
          (project) =>
            String(project.id).toLowerCase() === trimmedValue.toLowerCase() &&
            String(project.id).toLowerCase() !== String(draftForm.originalId).toLowerCase()
        );

        if (idExists) return "Project ID already exists";
        return "";
      }

      case "client":
        return trimmedValue ? "" : "Client is required";

      case "startDate":
        if (!trimmedValue) return "Start Date is required";
        if (trimmedValue < getMinimumStartDate(draftForm)) {
          return "Start Date cannot be in the past";
        }
        return "";

      case "endDate":
        if (!trimmedValue) return "End Date is required";
        if (draftForm.startDate && trimmedValue < draftForm.startDate) {
          return "End Date cannot be before Start Date";
        }
        return "";

      case "team": {
        if (!trimmedValue) return "Team Size is required";
        const teamSize = Number(trimmedValue);
        if (!Number.isInteger(teamSize) || teamSize < 1) {
          return "Team Size must be at least 1";
        }
        if (teamSize > 9999) {
          return "Team Size cannot exceed 9999";
        }
        return "";
      }

      case "status":
        return trimmedValue ? "" : "Status is required";

      default:
        return "";
    }
  };

  const validateProjectForm = (draftForm = projectsForm) => {
    const nextErrors = {
      name: validateField("name", draftForm),
      id: validateField("id", draftForm),
      client: validateField("client", draftForm),
      startDate: validateField("startDate", draftForm),
      endDate: validateField("endDate", draftForm),
      team: validateField("team", draftForm),
      status: validateField("status", draftForm),
    };

    const cleanedErrors = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );

    setFormErrors(cleanedErrors);
    return Object.keys(cleanedErrors).length === 0;
  };

  const updateFieldValue = (name, rawValue) => {
    let nextValue = rawValue;

    if (name === "name") nextValue = sanitizeProjectName(rawValue);
    if (name === "id") nextValue = sanitizeProjectId(rawValue);
    if (name === "team") nextValue = sanitizeTeamSize(rawValue);

    const draftForm = {
      ...projectsForm,
      [name]: nextValue,
    };

    if (name === "name") {
      draftForm.name = draftForm.name.replace(/\s{2,}/g, " ");
    }

    setProjectsForm(draftForm);
    setApiError("");

    setFormErrors((prev) => {
      const nextErrors = {
        ...prev,
        [name]: validateField(name, draftForm),
      };

      if (name === "startDate" || name === "endDate") {
        nextErrors.startDate = validateField("startDate", draftForm);
        nextErrors.endDate = validateField("endDate", draftForm);
      }

      return Object.fromEntries(
        Object.entries(nextErrors).filter(([, message]) => message)
      );
    });
  };

  const handleProjectsChange = (event) => {
    const { name, value } = event.target;
    updateFieldValue(name, value);
  };

  const handleProjectsBlur = (event) => {
    const { name, value } = event.target;
    const normalizedValue = name === "name" ? value.trim().replace(/\s+/g, " ") : value.trim();

    updateFieldValue(name, normalizedValue);
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();

    const trimmedForm = {
      ...projectsForm,
      name: projectsForm.name.trim().replace(/\s+/g, " "),
      id: projectsForm.id.trim().toUpperCase(),
      client: projectsForm.client.trim(),
      team: projectsForm.team.trim(),
      status: projectsForm.status.trim(),
    };

    setProjectsForm(trimmedForm);

    if (!validateProjectForm(trimmedForm)) return;

    const selectedClient = clients.find(
      (client) => String(client.name) === String(trimmedForm.client)
    );

    const payload = {
      project_Name: trimmedForm.name,
      project_Id: trimmedForm.id,
      client: clients.find(
        (item) => String(item.id) === String(trimmedForm.client)
      )?.name || "",

      clientId: Number(trimmedForm.client),
      start_Date: toIsoDateString(trimmedForm.startDate),
      end_Date: toIsoDateString(trimmedForm.endDate),
      team_Members: String(trimmedForm.team),
      status: trimmedForm.status,
    };

    console.log("FINAL PROJECT PAYLOAD 👉", payload);

    try {
      setIsSubmitting(true);
      setApiError("");

      if (projectsEditMode) {
        await api.put(
          API_ENDPOINTS.company.projects.byId(trimmedForm.originalId || trimmedForm.id),
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        await api.post(API_ENDPOINTS.company.projects.list, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      toast.success(projectsEditMode ? "Project updated successfully." : "Project saved successfully.");
      await fetchProjects();
      closeProjectModal(true);
    } catch (error) {
      console.error("Project save failed:", error);

      const backendMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        error.message ||
        "Something went wrong while saving the project.";
      const normalizedMessage = String(backendMessage).toLowerCase();

      if (normalizedMessage.includes("duplicate") || normalizedMessage.includes("already exists")) {
        setFormErrors((prev) => ({
          ...prev,
          id: "Project ID already exists",
        }));
      }

      setApiError(String(backendMessage));
      toast.error("Unable to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProjectsEdit = (project) => {
    setProjectsForm({
      name: project.name || "",
      id: project.id || "",
      originalId: project.id || "",
      client: project.client || "",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      team: project.team || "",
      status: project.status || "",
    });
    setFormErrors({});
    setApiError("");
    setProjectsEditMode(true);
    setIsClosingModal(false);
    setProjectsShowModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.company.projects.byId(projectToDelete.id));
      toast.success("Project deleted successfully.");
      await fetchProjects();
      closeDeletePopup();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Unable to delete project.");
    }
  };

  const statusOptions = useMemo(
    () =>
      PROJECT_STATUSES.map((status) => ({
        value: status,
        label: status,
      })),
    []
  );

  return (
    <div className="projects-page">
      <ToastContainer position="top-right" autoClose={2600} />

      <div className="projects-header">
        <div>
          <h2>Projects</h2>
          <p>{projectsList.length} projects tracked across the company</p>
        </div>

        <button className="projects-add-btn" onClick={openCreateProjectModal}>
          + New Project
        </button>
      </div>

      <div className="projects-table-wrapper">
        <table className="projects-table">
          <colgroup>
            <col style={{ width: "200px" }} />
            <col style={{ width: "190px" }} />
            <col style={{ width: "135px" }} />
            <col style={{ width: "135px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "160px" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Start</th>
              <th>End</th>
              <th>Team</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {projectsLoading ? (
              <tr>
                <td colSpan="7" className="projects-empty-state">
                  Loading projects...
                </td>
              </tr>
            ) : projectsList.length === 0 ? (
              <tr>
                <td colSpan="7" className="projects-empty-state">
                  No projects available.
                </td>
              </tr>
            ) : (
              projectsList.map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className="projects-name">
                      <strong title={project.name}>{project.name || "-"}</strong>
                      <span title={project.id}>{project.id || "-"}</span>
                    </div>
                  </td>

                  <td>
                    <span className="projects-cell-truncate" title={project.client}>
                      {project.client || "-"}
                    </span>
                  </td>
                  <td>{formatDisplayDate(project.startDate)}</td>
                  <td>{formatDisplayDate(project.endDate)}</td>
                  <td>{project.team || "-"}</td>
                  <td>
                    <span
                      className={`projects-status ${getStatusClassName(project.status)}`}
                    >
                      {project.status || "-"}
                    </span>
                  </td>

                  <td>
                    <div className="projects-action-cell">
                      <button
                        className="projects-table-edit-btn"
                        onClick={() => handleProjectsEdit(project)}
                      >
                        Edit
                      </button>

                      <button
                        className="projects-delete-btn"
                        onClick={() => {
                          setProjectToDelete(project);
                          setIsClosingDeletePopup(false);
                          setShowDeletePopup(true);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {projectsShowModal && (
        <div
          className={`projects-modal-overlay ${isClosingModal ? "closing" : ""}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeProjectModal();
            }
          }}
        >
          <div
            className={`projects-modal ${isClosingModal ? "closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            aria-describedby="project-modal-description"
          >
            <div className="projects-modal-header">
              <div>
                <h3 id="project-modal-title">
                  {projectsEditMode ? "Update Project" : "Add Project"}
                </h3>
                <p id="project-modal-description">
                  Capture the project details with clean validation and consistent dates.
                </p>
              </div>

              <button
                type="button"
                className="projects-modal-close"
                aria-label="Close project form"
                onClick={closeProjectModal}
                disabled={isSubmitting}
              >
                x
              </button>
            </div>

            <form className="projects-form" onSubmit={handleSaveProject} noValidate>
              {apiError && (
                <div className="projects-form-alert" role="alert">
                  {apiError}
                </div>
              )}

              <div className="projects-form-grid">
                <div className="projects-field">
                  <label htmlFor="project-name-input">
                    Project Name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={projectNameInputRef}
                    id="project-name-input"
                    name="name"
                    type="text"
                    value={projectsForm.name}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.name)}
                    aria-describedby={formErrors.name ? "project-name-error" : undefined}
                    className={formErrors.name ? "has-error" : ""}
                    maxLength={100}
                    autoComplete="off"
                  />
                  {formErrors.name && (
                    <p id="project-name-error" className="projects-field-error">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-id-input">
                    Project ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="project-id-input"
                    name="id"
                    type="text"
                    value={projectsForm.id}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.id)}
                    aria-describedby={formErrors.id ? "project-id-error" : "project-id-helper"}
                    className={formErrors.id ? "has-error" : ""}
                    autoComplete="off"
                    disabled={isSubmitting || projectsEditMode}
                  />
                  <p id="project-id-helper" className="projects-field-helper">
                    Use a format like PRJ001
                  </p>
                  {formErrors.id && (
                    <p id="project-id-error" className="projects-field-error">
                      {formErrors.id}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-client-select">
                    Client <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="project-client-select"
                    name="client"
                    value={projectsForm.client}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.client)}
                    aria-describedby={formErrors.client ? "project-client-error" : undefined}
                    className={formErrors.client ? "has-error" : ""}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.client && (
                    <p id="project-client-error" className="projects-field-error">
                      {formErrors.client}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-team-input">
                    Team Size <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="project-team-input"
                    name="team"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={projectsForm.team}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    onKeyDown={(event) => {
                      if (["e", "E", "+", "-", "."].includes(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    aria-invalid={Boolean(formErrors.team)}
                    aria-describedby={formErrors.team ? "project-team-error" : undefined}
                    className={formErrors.team ? "has-error" : ""}
                    disabled={isSubmitting}
                  />
                  {formErrors.team && (
                    <p id="project-team-error" className="projects-field-error">
                      {formErrors.team}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-start-date">
                    Start Date <span aria-hidden="true">*</span>
                  </label>
                  <AppDatePicker
                    id="project-start-date"
                    name="startDate"
                    value={projectsForm.startDate}
                    minDate={effectiveStartDateMin}
                    onChange={handleProjectsChange}
                    aria-invalid={Boolean(formErrors.startDate)}
                    aria-describedby={
                      formErrors.startDate ? "project-start-date-error" : "project-start-date-helper"
                    }
                    className={formErrors.startDate ? "has-error" : ""}
                    disabled={isSubmitting}
                  />
                  <p id="project-start-date-helper" className="projects-field-helper">
                    {projectsForm.startDate
                      ? formatDisplayDate(projectsForm.startDate)
                      : "Format: 05 Apr 2026"}
                  </p>
                  {formErrors.startDate && (
                    <p id="project-start-date-error" className="projects-field-error">
                      {formErrors.startDate}
                    </p>
                  )}
                </div>

                <div className="projects-field">
                  <label htmlFor="project-end-date">
                    End Date <span aria-hidden="true">*</span>
                  </label>
                  <AppDatePicker
                    id="project-end-date"
                    name="endDate"
                    value={projectsForm.endDate}
                    minDate={projectsForm.startDate || effectiveStartDateMin}
                    onChange={handleProjectsChange}
                    aria-invalid={Boolean(formErrors.endDate)}
                    aria-describedby={
                      formErrors.endDate ? "project-end-date-error" : "project-end-date-helper"
                    }
                    className={formErrors.endDate ? "has-error" : ""}
                    disabled={isSubmitting}
                  />
                  <p id="project-end-date-helper" className="projects-field-helper">
                    {projectsForm.endDate
                      ? formatDisplayDate(projectsForm.endDate)
                      : "Format: 05 Apr 2026"}
                  </p>
                  {formErrors.endDate && (
                    <p id="project-end-date-error" className="projects-field-error">
                      {formErrors.endDate}
                    </p>
                  )}
                </div>

                <div className="projects-field projects-field-full">
                  <label htmlFor="project-status-select">
                    Status <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="project-status-select"
                    name="status"
                    value={projectsForm.status}
                    onChange={handleProjectsChange}
                    onBlur={handleProjectsBlur}
                    aria-invalid={Boolean(formErrors.status)}
                    aria-describedby={formErrors.status ? "project-status-error" : undefined}
                    className={formErrors.status ? "has-error" : ""}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.status && (
                    <p id="project-status-error" className="projects-field-error">
                      {formErrors.status}
                    </p>
                  )}
                </div>
              </div>

              <div className="projects-modal-btns">
                <button
                  type="button"
                  className="projects-secondary-btn"
                  onClick={closeProjectModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="projects-save-btn" disabled={isSubmitting}>
                  {isSubmitting && <span className="projects-btn-spinner" aria-hidden="true" />}
                  {isSubmitting
                    ? projectsEditMode
                      ? "Updating..."
                      : "Saving..."
                    : projectsEditMode
                      ? "Update"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeletePopup && (
        <div
          className={`projects-modal-overlay ${isClosingDeletePopup ? "closing" : ""}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeletePopup();
            }
          }}
        >
          <div
            className={`projects-modal projects-modal-small ${isClosingDeletePopup ? "closing" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-delete-title"
          >
            <div className="projects-delete-content">
              <h3 id="project-delete-title" className="projects-delete-title">
                Confirm Delete
              </h3>

              <p className="projects-delete-copy">
                Are you sure you want to delete this project?
              </p>

              <div className="projects-delete-actions">
                <button className="projects-secondary-btn" onClick={closeDeletePopup}>
                  Cancel
                </button>
                <button className="projects-delete-btn" onClick={confirmDeleteProject}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
