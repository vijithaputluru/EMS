import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    FaCloudUploadAlt,
    FaDownload,
    FaEye,
    FaFileAlt,
    FaFolderOpen,
    FaRedo,
    FaSpinner,
    FaTrash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "./AddEmployee.css";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import { SERVER_URL } from "../../api/config";
import CompactSearchableDropdown from "../../components/CompactSearchableDropdown";
import {
    extractDocumentRecords,
    formatDocumentSize,
    loadStoredDocuments,
    mergeDocumentRecords,
    normalizeDocumentRecord,
    removeStoredDocument,
    saveStoredDocument,
} from "./documentStore";
import { formatDateTime } from "../../utils/date";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const DOCUMENT_TYPE_GROUPS = [
    {
        label: "Education Certificates",
        options: [
            { value: "10th Certificate", label: "10th Certificate" },
            {
                value: "Intermediate / 12th Certificate",
                label: "Intermediate / 12th Certificate",
            },
            { value: "Degree Certificate", label: "Degree Certificate" },
            {
                value: "Post-Graduation Certificate",
                label: "Post-Graduation Certificate",
            },
        ],
    },
    {
        label: "Identity Documents",
        options: [
            { value: "Aadhaar Card", label: "Aadhaar Card" },
            { value: "PAN Card", label: "PAN Card" },
            { value: "Passport", label: "Passport" },
            { value: "Passport-size Photo", label: "Passport-size Photo" },
        ],
    },
    {
        label: "Current Company",
        options: [{ value: "Signed Offer Letter", label: "Signed Offer Letter" }],
    },
    {
        label: "Previous Experience / Internship",
        options: [
            { value: "Previous Offer Letter", label: "Previous - Offer Letter" },
            {
                value: "Previous Appointment Letter",
                label: "Previous - Appointment Letter",
            },
            {
                value: "Previous Relieving Letter",
                label: "Previous - Relieving / Experience Letter",
            },
        ],
    },
    {
        label: "Last 3 Months Payslips",
        options: [
            { value: "Payslip Month 1", label: "Payslip - Month 1" },
            { value: "Payslip Month 2", label: "Payslip - Month 2" },
            { value: "Payslip Month 3", label: "Payslip - Month 3" },
        ],
    },
];

const getEmployeeKey = (employeeId, employeeCode) =>
    String(employeeCode || employeeId || "").trim();

const getFileExtension = (fileName = "") => {
    const parts = String(fileName).split(".");
    return parts.length > 1 ? parts.pop().toUpperCase() : "";
};

const getDocumentServerId = (document) =>
    document?.serverId ||
    document?.id ||
    document?.documentId ||
    document?.employeeDocumentId ||
    null;

const sameDocument = (left, right) => {
    const leftServerId = getDocumentServerId(left);
    const rightServerId = getDocumentServerId(right);

    if (leftServerId && rightServerId) {
        return String(leftServerId) === String(rightServerId);
    }

    return (
        left.cacheKey === right.cacheKey ||
        (
            left.fileName === right.fileName &&
            left.size === right.size &&
            left.documentType === right.documentType
        )
    );
};

const buildLocalDocumentRecord = (file, documentType, employeeKey) =>
    normalizeDocumentRecord(
        {
            cacheKey: `local-${Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`,
            employeeKey,
            documentType: documentType || "Document",
            fileName: file.name,
            fileType: file.type || getFileExtension(file.name),
            size: file.size,
            uploadedAt: new Date().toISOString(),
            blob: file,
            source: "local",
        },
        employeeKey
    );

const getLatestResponseDocument = (responseData) =>
    extractDocumentRecords(responseData).find((document) =>
        Boolean(
            document &&
            (
                document.id ||
                document.documentId ||
                document.employeeDocumentId ||
                document.fileName ||
                document.file_Name ||
                document.fileUrl ||
                document.documentType
            )
        )
    ) || null;

const openBlobInNewTab = (blob) => {
    const url = window.URL.createObjectURL(blob);
    const openedWindow = window.open(url, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
        window.URL.revokeObjectURL(url);
        return;
    }

    window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 2500);
};

const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName || "document";

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
    }, 1000);
};

function Documents({
    onBack,
    onNext,
    viewMode,
    employeeId,
    employeeCode,
}) {
    const employeeKey = useMemo(
        () => getEmployeeKey(employeeId, employeeCode),
        [employeeCode, employeeId]
    );

    const [documents, setDocuments] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedDocumentType, setSelectedDocumentType] = useState("");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [savingNext, setSavingNext] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [apiError, setApiError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedDeleteDocument, setSelectedDeleteDocument] = useState(null);

    const fileInputRef = useRef(null);
    const isMountedRef = useRef(true);

    const documentCount = documents.length;

    useEffect(
        () => () => {
            isMountedRef.current = false;
        },
        []
    );

    useEffect(() => {
        if (!successMsg) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            if (isMountedRef.current) {
                setSuccessMsg("");
            }
        }, 2800);

        return () => window.clearTimeout(timer);
    }, [successMsg]);

    const loadDocuments = useCallback(
        async ({ silent = false } = {}) => {
            if (!employeeKey) {
                if (isMountedRef.current) {
                    setDocuments([]);
                    setLoading(false);
                    setLoadError("");
                }

                return;
            }

            if (!silent && isMountedRef.current) {
                setLoading(true);
            }

            if (isMountedRef.current) {
                setLoadError("");
            }

            let serverError = "";

            try {
                const [serverDocuments, cachedDocuments] = await Promise.all([
                    api
                        .get(API_ENDPOINTS.employeeDocuments.byEmployeeId(employeeKey))
                        .then((response) => extractDocumentRecords(response.data))
                        .catch((error) => {
                            serverError =
                                error?.response?.data?.message || "Failed to load documents";
                            return [];
                        }),
                    loadStoredDocuments(employeeKey).catch(() => []),
                ]);

                const mergedDocuments = mergeDocumentRecords(
                    serverDocuments,
                    cachedDocuments
                );

                if (!isMountedRef.current) {
                    return;
                }

                setDocuments(mergedDocuments);

                if (serverError && mergedDocuments.length === 0) {
                    setLoadError(serverError);
                } else if (serverError && mergedDocuments.length > 0) {
                    setLoadError("Showing cached documents while refreshing.");
                    toast.info("Showing cached documents while refreshing.");
                } else {
                    setLoadError("");
                }
            } catch (error) {
                if (!isMountedRef.current) {
                    return;
                }

                const message =
                    error?.response?.data?.message || "Failed to load documents";

                setLoadError(message);
            } finally {
                if (!silent && isMountedRef.current) {
                    setLoading(false);
                }
            }
        },
        [employeeKey]
    );

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
    setSelectedFile(null);

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }

    return;
}

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const message = "File size should be less than 10MB";
            setApiError(message);
            toast.error(message);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        setSelectedFile(file);
        setApiError("");
    };

    const handleUpload = async () => {
        if (!employeeKey) {
            const message = "Employee ID missing";
            setApiError(message);
            toast.error(message);
            return;
        }

        if (!selectedFile) {
            const message = "Please select a file";
            setApiError(message);
            toast.error(message);
            return;
        }

        try {
            setUploading(true);
            setApiError("");

            const formData = new FormData();
         formData.append("EmployeeId", employeeKey);
formData.append("DocumentType", selectedDocumentType);
formData.append("Files", selectedFile);

            const response = await api.post(
                API_ENDPOINTS.employeeDocuments.upload,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const responseDocument = getLatestResponseDocument(response.data);
            const normalizedResponseDocument = responseDocument
                ? normalizeDocumentRecord(responseDocument, employeeKey)
                : null;
            const fallbackDocument = buildLocalDocumentRecord(
                selectedFile,
                selectedDocumentType,
                employeeKey
            );

            const storedDocument = normalizedResponseDocument
                ? normalizeDocumentRecord(
                    {
                        ...fallbackDocument,
                        ...normalizedResponseDocument,
                        employeeKey,
                        documentType:
                            normalizedResponseDocument.documentType ||
                            selectedDocumentType ||
                            fallbackDocument.documentType,
                        fileName:
                            normalizedResponseDocument.fileName || fallbackDocument.fileName,
                        fileType:
                            normalizedResponseDocument.fileType || fallbackDocument.fileType,
                        size:
                            normalizedResponseDocument.size || fallbackDocument.size,
                        uploadedAt:
                            normalizedResponseDocument.uploadedAt ||
                            fallbackDocument.uploadedAt,
                        blob: selectedFile,
                        source: normalizedResponseDocument.serverId
                            ? "server"
                            : "local",
                    },
                    employeeKey
                )
                : fallbackDocument;

            await saveStoredDocument(employeeKey, storedDocument);

            if (!isMountedRef.current) {
                return;
            }
await loadDocuments({ silent: true });

setSelectedFile(null);
setSelectedDocumentType("");

if (fileInputRef.current) {
    fileInputRef.current.value = "";
}

setSuccessMsg("Document uploaded successfully.");
toast.success("Document uploaded successfully.");
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            const message =
                error?.response?.data?.message || "Upload failed";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setUploading(false);
            }
        }
    };

    const handleDelete = async (documentToDelete) => {
        if (!documentToDelete) {
            return;
        }

        const snapshot = documents;
        const serverId = getDocumentServerId(documentToDelete);

        try {
            setDeletingId(documentToDelete.cacheKey || serverId || "");
            setApiError("");
            setDocuments((currentDocuments) =>
                currentDocuments.filter((document) => !sameDocument(document, documentToDelete))
            );

            await removeStoredDocument(employeeKey, documentToDelete);

            if (serverId) {
                await api.delete(API_ENDPOINTS.employeeDocuments.delete(serverId));
            }

            if (!isMountedRef.current) {
                return;
            }

            setSuccessMsg("Document deleted successfully.");
            toast.success("Document deleted successfully.");
            setShowDeleteModal(false);
            setSelectedDeleteDocument(null);
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            await saveStoredDocument(employeeKey, documentToDelete).catch(() => { });
            setDocuments(snapshot);

            const message =
                error?.response?.data?.message || "Failed to delete document";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setDeletingId("");
            }
        }
    };

    const handleView = (doc) => {
        if (!doc) {
            return;
        }

        if (doc.blob instanceof Blob) {
            openBlobInNewTab(doc.blob);
            return;
        }

        if (doc.fileUrl) {
            window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
            return;
        }

        const serverId = getDocumentServerId(doc);

        if (!serverId) {
            toast.error("Document ID missing");
            return;
        }

        const url = `${SERVER_URL}/api/EmployeeDocuments/view/${serverId}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleDownload = (doc) => {
        if (!doc) {
            return;
        }

        if (doc.blob instanceof Blob) {
            downloadBlob(doc.blob, doc.fileName);
            return;
        }

        if (doc.fileUrl) {
            const anchor = window.document.createElement("a");
            anchor.href = doc.fileUrl;
            anchor.download = doc.fileName || "document";
            window.document.body.appendChild(anchor);
            anchor.click();
            window.document.body.removeChild(anchor);
            return;
        }

        const serverId = getDocumentServerId(doc);

        if (!serverId) {
            toast.error("Document ID missing");
            return;
        }

        const anchor = window.document.createElement("a");
        anchor.href = `${SERVER_URL}/api/EmployeeDocuments/download/${serverId}`;
        window.document.body.appendChild(anchor);
        anchor.click();
        window.document.body.removeChild(anchor);
    };

    const handleRetry = () => {
        loadDocuments();
    };

    const handleSaveAndNext = async () => {
        if (documentCount === 0) {
            const message = "Upload documents to continue.";
            setApiError(message);
            toast.warning(message);
            return;
        }

        try {
            setSavingNext(true);
            setApiError("");
            setLoadError("");

            await Promise.resolve(onNext?.());

            if (!isMountedRef.current) {
                return;
            }

            setSuccessMsg(
                viewMode
                    ? "Moving to the next section."
                    : "Documents saved successfully."
            );
            toast.success(
                viewMode
                    ? "Moving to the next section."
                    : "Documents saved successfully."
            );
        } catch (error) {
            if (!isMountedRef.current) {
                return;
            }

            const message =
                error?.response?.data?.message ||
                "Unable to move to the next section.";

            setApiError(message);
            toast.error(message);
        } finally {
            if (isMountedRef.current) {
                setSavingNext(false);
            }
        }
    };

    const primaryActionLabel = savingNext
        ? viewMode
            ? "Moving..."
            : "Saving & Moving..."
        : viewMode
            ? "Next"
            : "Save & Next";

    return (
        <div className="documents-wrapper">
            <div className="documents-page-header">
                <div>
                    <h5>Employee Documents</h5>
                    <p>Upload employee files, keep them searchable, and continue without losing progress.</p>
                </div>

                <div className="documents-header-count">
                    Uploaded Documents ({documentCount})
                </div>
            </div>

            {successMsg && (
                <div className="success-message documents-inline-message">
                    {successMsg}
                </div>
            )}

            {apiError && (
                <div className="error-message documents-inline-message">
                    {apiError}
                </div>
            )}

            {loadError && documentCount > 0 && (
                <div className="documents-retry-banner">
                    <div className="documents-retry-copy">
                        <strong>Document refresh issue</strong>
                        <span>{loadError}</span>
                    </div>

                    <button
                        type="button"
                        className="documents-retry-btn"
                        onClick={handleRetry}
                    >
                        <FaRedo aria-hidden="true" />
                        Retry
                    </button>
                </div>
            )}

            {!viewMode && (
                <div className="documents-card premium-upload-card">
                    <div className="premium-upload-top">
                        <div>
                            <h4 className="upload-title">Upload Employee Documents</h4>
                            <p className="upload-subtitle">
                                Upload Aadhaar, PAN, certificates, resumes, passports, and more.
                            </p>
                        </div>

                        {/* <div className="upload-badge">
              Uploaded Documents ({documentCount})
            </div> */}
                    </div>

                    <div className="documents-checklist-card">
                        <h4 className="checklist-title">What you need to upload</h4>
                        <p className="checklist-subtitle">
                            Pick a document type, attach the file, and save it in one step.
                        </p>

                        <div className="documents-checklist-grid">
                            <div className="checklist-section">
                                <h5>Education Certificates</h5>
                                <ul>
                                    <li>10th Certificate</li>
                                    <li>Intermediate / 12th Certificate</li>
                                    <li>Degree Certificate</li>
                                    <li>Post-Graduation Certificate</li>
                                </ul>
                            </div>

                            <div className="checklist-section">
                                <h5>Identity Documents</h5>
                                <ul>
                                    <li>Aadhaar Card</li>
                                    <li>PAN Card</li>
                                    <li>Passport</li>
                                    <li>Passport-size Photo</li>
                                </ul>
                            </div>

                            <div className="checklist-section">
                                <h5>Current Company</h5>
                                <ul>
                                    <li>Signed Offer Letter</li>
                                </ul>
                            </div>

                            <div className="checklist-section">
                                <h5>Previous Experience / Internship</h5>
                                <ul>
                                    <li>Previous - Offer Letter</li>
                                    <li>Previous - Appointment Letter</li>
                                    <li>Previous - Relieving / Experience Letter</li>
                                </ul>
                            </div>

                            <div className="checklist-section">
                                <h5>Last 3 Months Payslips</h5>
                                <ul>
                                    <li>Payslip - Month 1</li>
                                    <li>Payslip - Month 2</li>
                                    <li>Payslip - Month 3</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="premium-upload-grid">
                        <div className="premium-input-group">
                            <CompactSearchableDropdown
                                label="Document Type"
                                value={selectedDocumentType}
                                onChange={setSelectedDocumentType}
                                placeholder="Select Document Type"
                                searchPlaceholder="Search document types"
                                groups={DOCUMENT_TYPE_GROUPS}
                                disabled={uploading}
                                menuMaxHeight={180}
                            />
                        </div>

                        <div className="premium-input-group">
                            <label>Choose File</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="premium-input premium-file-input"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="selected-file-preview">
                            <div className="selected-file-left">
                                <span className="document-icon">
                                    <FaFileAlt aria-hidden="true" />

                                    <span
    className="document-remove-icon"
    onClick={() => {
        setSelectedFile(null);
        setSelectedDocumentType("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        };
    }}
    
>
    ×
</span>
                                </span>

                                <div className="selected-file-body">
                                    <div className="selected-file-title">{selectedFile.name}</div>

                                    <div className="selected-file-meta">
                                        <span>{selectedDocumentType || "Document type not selected"}</span>
                                        <span>{getFileExtension(selectedFile.name) || selectedFile.type || "File"}</span>
                                        <span>{formatDocumentSize(selectedFile.size)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="premium-upload-actions">
                        <button
                            type="button"
                            className="premium-upload-btn"
                            onClick={handleUpload}
                            disabled={uploading || !selectedFile}
                        >
                            {uploading ? (
                                <>
                                    <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <FaCloudUploadAlt aria-hidden="true" />
                                    Upload Document
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="documents-card documents-summary-card">
                <div className="documents-summary-header">
                    <h4>Uploaded Documents ({documentCount})</h4>
                    <div className="documents-summary-pill">
                        {documentCount} {documentCount === 1 ? "file" : "files"} saved
                    </div>
                </div>

                {loading && documentCount === 0 ? (
                    <div className="documents-skeleton-list" aria-busy="true">
                        {[1, 2, 3].map((item) => (
                            <div className="documents-skeleton-row" key={item}>
                                <div className="documents-skeleton-icon" />
                                <div className="documents-skeleton-body">
                                    <div className="documents-skeleton-line short" />
                                    <div className="documents-skeleton-line" />
                                </div>
                                <div className="documents-skeleton-actions">
                                    <div className="documents-skeleton-chip" />
                                    <div className="documents-skeleton-chip" />
                                    <div className="documents-skeleton-chip" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : loadError && documentCount === 0 ? (
                    <div className="documents-error-state">
                        <div className="documents-empty-icon error">
                            <FaRedo aria-hidden="true" />
                        </div>

                        <h5>{loadError}</h5>
                        <p>We could not refresh documents from the server. Try again or continue with the cached copy if available.</p>

                        <button
                            type="button"
                            className="documents-retry-btn"
                            onClick={handleRetry}
                        >
                            <FaRedo aria-hidden="true" />
                            Retry
                        </button>
                    </div>
                ) : documentCount === 0 ? (
                    <div className="documents-empty-state">
                        <div className="documents-empty-icon">
                            <FaFolderOpen aria-hidden="true" />
                        </div>

                        <h5>No documents uploaded yet</h5>
                        <p>Upload documents to continue</p>
                    </div>
                ) : (
                    <div className="uploaded-documents-list">
                        {documents.map((document, index) => (
                            <div
                                key={document.cacheKey || getDocumentServerId(document) || index}
                                className="uploaded-document-item"
                            >
                                <div className="uploaded-document-left">
                                    <span
                                        className="document-icon"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <FaFileAlt
                                            aria-hidden="true"
                                            style={{
                                                display: "block",
                                            }}
                                        />
                                    </span>

                                    <div className="uploaded-document-body">
                                        <div className="document-title">
                                            {document.documentType || "Document"}
                                        </div>

                                        <div className="document-filename">
                                            {document.fileName || "Uploaded file"}
                                        </div>

                                        <div className="document-meta-row">
                                            <span className="document-meta-chip">
                                                {document.fileType || "File"}
                                            </span>
                                            <span className="document-meta-chip">
                                                {formatDocumentSize(document.size)}
                                            </span>
                                            <span className="document-meta-chip">
                                                {formatDateTime(document.uploadedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="uploaded-document-actions">
                                    <button
                                        type="button"
                                        className="document-action-btn view-btn"
                                        onClick={() => handleView(document)}
                                    >
                                        <FaEye aria-hidden="true" />
                                        View
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn download-btn"
                                        onClick={() => handleDownload(document)}
                                    >
                                        <FaDownload aria-hidden="true" />
                                        Download
                                    </button>

                                    <button
                                        type="button"
                                        className="document-action-btn delete-btn"
                                        onClick={() => {
                                            setSelectedDeleteDocument(document);
                                            setShowDeleteModal(true);
                                        }}
                                    >
                                        <FaTrash aria-hidden="true" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showDeleteModal && selectedDeleteDocument && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <h3>Confirm Delete</h3>
                        <p>
                            Are you sure you want to delete this document?
                        </p>

                        <div className="delete-modal-actions">
                            <button
                                type="button"
                                className="delete-cancel-btn"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedDeleteDocument(null);
                                }}
                                disabled={Boolean(deletingId)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={() => handleDelete(selectedDeleteDocument)}
                                disabled={Boolean(deletingId)}
                            >
                                {deletingId ? (
                                    <>
                                        <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="documents-footer">
                <div className="progress-info">
                    Uploaded Documents ({documentCount})
                </div>

                <div className="footer-actions">
                    <button type="button" className="secondary-btn" onClick={onBack}>
                        Back
                    </button>

                    <button
                        type="button"
                        className="submit-document-btn"
                        onClick={handleSaveAndNext}
                        disabled={
                            documentCount === 0 ||
                            loading ||
                            uploading ||
                            savingNext
                        }
                    >
                        {savingNext ? (
                            <>
                                <FaSpinner className="documents-button-spinner" aria-hidden="true" />
                                {primaryActionLabel}
                            </>
                        ) : (
                            primaryActionLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Documents;
