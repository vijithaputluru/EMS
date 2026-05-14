import React, { useEffect, useMemo, useState } from "react";
import "./Assets.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api/axiosInstance";
import { API_ENDPOINTS, buildServerUrl } from "../api/endpoints";
import { extractCollection, sortByNewestIdFirst } from "../utils/collections";
import { formatEmployeeCode } from "../utils/formatters";

const EMPTY_ASSET = {
  name: "",
  serial: "",
  assigned: "",
  status: "Assigned",
  images: [],
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const normalizeImagePaths = (value) => {
  let rawImages = [];

  if (Array.isArray(value)) {
    rawImages = value;
  } else if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
      try {
        const parsedValue = JSON.parse(trimmedValue);
        rawImages = Array.isArray(parsedValue) ? parsedValue : [trimmedValue];
      } catch {
        rawImages = trimmedValue.split(",");
      }
    } else {
      rawImages = trimmedValue.split(",");
    }
  }

  return rawImages
    .map((image) =>
      String(image || "")
        .replace(/\\/g, "/")
        .trim()
    )
    .filter((image) => {
      if (!image) return false;

      const normalized = image.toLowerCase();
      return !["0", "1", "null", "undefined", "false"].includes(normalized);
    });
};

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const assetsPerPage = 50;

  const [previewImages, setPreviewImages] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const [newAsset, setNewAsset] = useState(EMPTY_ASSET);
  const [errors, setErrors] = useState({});

  const fetchAssets = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.masters.assets.list);
      const formatted = sortByNewestIdFirst(
        extractCollection(res.data).map((item) => ({
          assetId:
            item.assetId ??
            item.AssetId ??
            item.assetID ??
            item.id ??
            item.Id ??
            null,
          assetName: item.assetName ?? item.AssetName ?? "",
          serialNo: item.serialNo ?? item.SerialNo ?? "",
          assignedTo: formatEmployeeCode(
            item.employeeCode ??
              item.EmployeeCode ??
              item.employeeId ??
              item.EmployeeId ??
              item.assignedTo ??
              item.AssignedTo ??
              ""
          ),
          status: item.status ?? item.Status ?? "",
          images: normalizeImagePaths(
            item.imagePaths ??
              item.ImagePaths ??
              item.imagePath ??
              item.ImagePath ??
              item.images ??
              item.Images
          ),
        })),
        (item) => item.assetId
      );

      setAssets(formatted);
    } catch (err) {
      console.error("Error fetching assets:", err);
      toast.error("Failed to load assets.");
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const validateField = (name, draft = newAsset) => {
    const value = String(draft[name] ?? "").trim();

    if (name === "name") {
      if (!value) return "Asset Name is required";
      if (value.length < 2) return "Asset Name must be at least 2 characters";
      return "";
    }

    if (name === "serial") {
      if (!value) return "Serial Number is required";
      if (value.length < 5) return "Serial Number must be at least 5 characters";

      const duplicate = assets.find(
        (asset) =>
          asset.serialNo?.toLowerCase() === value.toLowerCase() &&
          asset.assetId !== editId
      );

      if (duplicate) return "Serial Number already exists";
      return "";
    }

    if (name === "assigned") {
      if (draft.status === "Assigned" && !value) {
        return "Employee Code is required when status is Assigned";
      }
      return "";
    }

    if (name === "status") {
      return value ? "" : "Status is required";
    }

    return "";
  };

  const validateForm = (draft = newAsset) => {
    const nextErrors = {
      name: validateField("name", draft),
      serial: validateField("serial", draft),
      assigned: validateField("assigned", draft),
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
      ...newAsset,
      [name]:
        name === "assigned"
          ? formatEmployeeCode(value)
          : value.replace(/^\s+/g, ""),
    };

    if (name === "status" && value !== "Assigned") {
      draft.assigned = "";
    }

    setNewAsset(draft);
    setErrors((prev) => {
      const nextErrors = {
        ...prev,
        [name]: validateField(name, draft),
      };

      if (name === "status") {
        nextErrors.assigned = validateField("assigned", draft);
      }

      return Object.fromEntries(
        Object.entries(nextErrors).filter(([, error]) => error)
      );
    });
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));

    if (invalidFile) {
      toast.error("Upload valid image files only: PNG, JPG, WEBP, GIF or SVG.");
      event.target.value = "";
      return;
    }

    previewImages.forEach((image) => {
      if (String(image).startsWith("blob:")) {
        URL.revokeObjectURL(image);
      }
    });

    setNewAsset((prev) => ({
      ...prev,
      images: files,
    }));

    const previews = files.map((file) => URL.createObjectURL(file));
    setPreviewImages(previews);
  };

  const handleSubmit = async () => {
    const trimmedAsset = {
      ...newAsset,
      name: newAsset.name.trim().replace(/\s+/g, " "),
      serial: newAsset.serial.trim(),
      assigned: newAsset.assigned.trim(),
      status: newAsset.status.trim(),
    };

    setNewAsset(trimmedAsset);

    if (!validateForm(trimmedAsset)) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("AssetName", trimmedAsset.name);
      formData.append("SerialNo", trimmedAsset.serial);
      formData.append("AssignedTo", trimmedAsset.assigned);
      formData.append("Status", trimmedAsset.status);

      trimmedAsset.images.filter(Boolean).forEach((image) => {
        formData.append("Images", image);
      });

      if (editId) {
        await api.put(API_ENDPOINTS.masters.assets.byId(editId), formData);
      } else {
        await api.post(API_ENDPOINTS.masters.assets.list, formData);
      }

      toast.success(editId ? "Asset updated successfully." : "Asset saved successfully.");
      closeForm();
      await fetchAssets();
    } catch (error) {
      console.error("Error saving asset:", error);
      toast.error("Unable to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset) => {
    setEditId(asset.assetId);
    setErrors({});
    setNewAsset({
      name: asset.assetName,
      serial: asset.serialNo,
      assigned: asset.assignedTo,
      status: asset.status,
      images: [],
    });

    setPreviewImages(asset.images || []);
    setShowForm(true);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;

    try {
      await api.delete(API_ENDPOINTS.masters.assets.byId(assetToDelete.assetId));
      toast.success("Asset deleted successfully.");
      setShowDeletePopup(false);
      setAssetToDelete(null);
      await fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Unable to delete asset.");
    }
  };

  const closeForm = () => {
    if (saving) return;

    previewImages.forEach((image) => {
      if (String(image).startsWith("blob:")) {
        URL.revokeObjectURL(image);
      }
    });

    setShowForm(false);
    setEditId(null);
    setErrors({});
    setPreviewImages([]);
    setNewAsset(EMPTY_ASSET);
  };

  const indexOfLast = currentPage * assetsPerPage;
  const indexOfFirst = indexOfLast - assetsPerPage;
  const currentAssets = assets.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(assets.length / assetsPerPage);

  const imagePreviewItems = useMemo(() => previewImages, [previewImages]);

  useEffect(() => {
    return () => {
      previewImages.forEach((image) => {
        if (String(image).startsWith("blob:")) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [previewImages]);

  return (
    <div className="assets-page">
      <ToastContainer position="top-right" autoClose={2400} />

      <div className="assets-header">
        <div>
          <h2>Asset Management</h2>
          <p>Track and manage company assets</p>
        </div>

        <button
          className="add-btn"
          onClick={() => {
            setEditId(null);
            setErrors({});
            setShowForm(true);
          }}
        >
          + Add Asset
        </button>
      </div>

      <div className="app-table-scroll">
      <table className="assets-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Asset</th>
            <th>Serial No</th>
            <th>Employee Code</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {currentAssets.length > 0 ? (
            currentAssets.map((asset) => (
              <tr key={asset.assetId ?? asset.serialNo}>
                <td>
                  {asset.images && asset.images.length > 0 ? (
                    <button
                      className="view-images-btn"
                      onClick={() => {
                        setSelectedImages(asset.images);
                        setShowImageModal(true);
                      }}
                    >
                      View Images ({asset.images.length})
                    </button>
                  ) : (
                    <span style={{ color: "#999" }}>No Image</span>
                  )}
                </td>

                <td>{asset.assetName}</td>
                <td>{asset.serialNo}</td>
                <td>{asset.assignedTo}</td>

                <td>
                  <span
                    className={
                      asset.status === "Assigned"
                        ? "badge assigned"
                        : asset.status === "Available"
                          ? "badge available"
                          : "badge repair"
                    }
                  >
                    {asset.status}
                  </span>
                </td>

                <td className="action-cell">
                  <div className="action-buttons">
                    <button className="edit-btn" onClick={() => handleEdit(asset)}>
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => {
                        setAssetToDelete(asset);
                        setShowDeletePopup(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="app-table-empty-cell">
                No assets found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <div className="assets-pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Prev
        </button>

        {[...Array(totalPages)].map((_, index) => (
          <button
            key={index}
            className={currentPage === index + 1 ? "active-page" : ""}
            onClick={() => setCurrentPage(index + 1)}
          >
            {index + 1}
          </button>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editId ? "Edit Asset" : "Add Asset"}</h3>

            <div className="asset-field-group">
              <label htmlFor="asset-name-input">Asset Name</label>
              <input
                id="asset-name-input"
                type="text"
                name="name"
                value={newAsset.name}
                onChange={handleChange}
                className={errors.name ? "has-error" : ""}
              />
              {errors.name && <p className="asset-error">{errors.name}</p>}
            </div>

            <div className="asset-field-group">
              <label htmlFor="asset-serial-input">Serial Number</label>
              <input
                id="asset-serial-input"
                type="text"
                name="serial"
                value={newAsset.serial}
                onChange={handleChange}
                className={errors.serial ? "has-error" : ""}
              />
              {errors.serial && <p className="asset-error">{errors.serial}</p>}
            </div>

            <div className="asset-field-group">
              <label htmlFor="asset-assigned-input">Employee Code</label>
              <input
                id="asset-assigned-input"
                type="text"
                name="assigned"
                value={newAsset.assigned}
                onChange={handleChange}
                className={errors.assigned ? "has-error" : ""}
                disabled={newAsset.status !== "Assigned"}
              />
              {errors.assigned && <p className="asset-error">{errors.assigned}</p>}
            </div>

            <div className="asset-field-group">
              <label htmlFor="asset-status-select">Status</label>
              <select
                id="asset-status-select"
                name="status"
                value={newAsset.status}
                onChange={handleChange}
              >
                <option value="Assigned">Assigned</option>
                <option value="Available">Available</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>

            <div className="asset-field-group">
              <label htmlFor="asset-image-input">Images</label>
              <input
                id="asset-image-input"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
                multiple
                onChange={handleImageChange}
              />
            </div>

            <div className="image-preview">
              {imagePreviewItems.map((image, index) =>
                image ? (
                  <img
                    key={index}
                    src={typeof image === "string" ? buildServerUrl(image) : image}
                    alt="preview"
                    style={{ width: "60px", marginRight: "6px" }}
                  />
                ) : null
              )}
            </div>

            <div className="asset-modal-actions">
              <button
                type="button"
                className="asset-delete-cancel-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="asset-update-btn"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (editId ? "Updating..." : "Saving...") : editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePopup && (
        <div className="asset-delete-overlay">
          <div className="asset-delete-modal">
            <h3>Confirm Delete</h3>

            <p style={{ margin: "15px 0" }}>
              Are you sure you want to delete this asset?
            </p>

            <div className="asset-delete-actions">
              <button
                onClick={() => setShowDeletePopup(false)}
                className="asset-delete-cancel-btn"
              >
                Cancel
              </button>

              <button className="asset-delete-btn" onClick={confirmDeleteAsset}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="image-modal-overlay">
          <div className="image-modal">
            <h3>Asset Images</h3>

            <div className="image-grid">
              {selectedImages.map((image, index) => (
                <a
                  key={index}
                  href={buildServerUrl(image)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={buildServerUrl(image)}
                    alt="asset"
                    style={{ cursor: "pointer" }}
                  />
                </a>
              ))}
            </div>

            <button
              className="close-image-btn"
              onClick={() => setShowImageModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
