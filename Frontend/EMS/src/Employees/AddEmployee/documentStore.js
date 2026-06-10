import { parseDate } from "../../utils/date";

const DB_NAME = "ems_add_employee_documents";
const DB_VERSION = 1;
const STORE_NAME = "documents";

const isIndexedDbAvailable = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const toSafeString = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || fallback;
};

const createFallbackKey = (employeeKey, document) => {
  const seed = [
    employeeKey,
    toSafeString(document.fileName || document.file_Name),
    toSafeString(document.documentType),
    toSafeString(document.fileType),
    String(document.size || document.fileSize || 0),
    String(document.uploadedAt || document.createdAt || Date.now()),
  ].join("|");

  return `doc_${btoa(unescape(encodeURIComponent(seed))).replace(/=+$/g, "")}`;
};

const getTimestamp = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.getTime() : Number.NaN;
};

const openDatabase = () => {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "cacheKey",
        });

        store.createIndex("employeeKey", "employeeKey", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const extractDocumentRecords = (responseData) => {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.documents)) {
    return responseData.documents;
  }

  if (Array.isArray(responseData?.data?.documents)) {
    return responseData.data.documents;
  }

  if (responseData?.document) {
    return [responseData.document];
  }

  if (responseData?.data?.document) {
    return [responseData.data.document];
  }

  if (responseData && typeof responseData === "object") {
    return [responseData];
  }

  return [];
};

export const formatDocumentSize = (size) => {
  const numericSize = Number(size);

  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    return "-";
  }

  if (numericSize < 1024) {
    return `${numericSize} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = numericSize / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

export const normalizeDocumentRecord = (
  document = {},
  employeeKey = ""
) => {
  const serverId =
    document.serverId ??
    document.id ??
    document.documentId ??
    document.employeeDocumentId ??
    null;

  const fileName = toSafeString(
    document.file_Name ||
      document.fileName ||
      document.name ||
      document.originalFileName ||
      document.originalName
  );

  const documentType = toSafeString(
    document.documentType ||
      document.documentTypeName ||
      document.document_type ||
      document.category ||
      document.type
  );

  const fileType = toSafeString(
    document.fileType ||
      document.mimeType ||
      document.contentType ||
      document.fileMimeType ||
      (fileName.includes(".") ? fileName.split(".").pop() : "")
  );

  const size = Number(
    document.size ??
      document.fileSize ??
      document.file_Size ??
      document.file_size ??
      0
  ) || 0;

  const uploadedAt =
    document.uploadedAt ||
    document.createdAt ||
    document.uploadDate ||
    document.created_At ||
    document.updatedAt ||
    "";

  const blob = document.blob instanceof Blob ? document.blob : null;
  const fileUrl =
    document.fileUrl ||
    document.url ||
    document.fileURL ||
    document.downloadUrl ||
    "";

  const cacheKey =
    toSafeString(
      document.cacheKey ||
        document.localId ||
        serverId ||
        document.documentId ||
        document.employeeDocumentId
    ) ||
    createFallbackKey(employeeKey, {
      fileName,
      documentType,
      fileType,
      size,
      uploadedAt,
    });

  return {
    cacheKey,
    employeeKey: toSafeString(
      document.employeeKey || employeeKey
    ),
    serverId: serverId ? String(serverId) : null,
    documentType,
    fileName,
    fileType,
    size,
    uploadedAt,
    uploadedAtTimestamp: getTimestamp(uploadedAt),
    fileUrl,
    blob,
    source: document.source || (blob ? "local" : "server"),
  };
};

export const mergeDocumentRecords = (
  serverDocuments = [],
  cachedDocuments = []
) => {
  const merged = new Map();

  const addDocument = (document, sourcePriority = 0) => {
    const normalized = normalizeDocumentRecord(document);
    const signature = [
  normalized.fileName.toLowerCase(),
  normalized.documentType.toLowerCase(),
  String(normalized.size || 0),
].join("|");

    const current = merged.get(signature);

    if (!current) {
      merged.set(signature, {
        ...normalized,
        sourcePriority,
      });
      return;
    }

    merged.set(signature, {
      ...current,
      ...normalized,
      blob: normalized.blob || current.blob,
      fileUrl: normalized.fileUrl || current.fileUrl,
      source:
        sourcePriority >= current.sourcePriority
          ? normalized.source
          : current.source,
      sourcePriority: Math.max(current.sourcePriority, sourcePriority),
    });
  };

  serverDocuments.forEach((document) => addDocument(document, 2));
  cachedDocuments.forEach((document) => addDocument(document, 1));

  return Array.from(merged.values())
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.uploadedAtTimestamp)
        ? left.uploadedAtTimestamp
        : 0;
      const rightTime = Number.isFinite(right.uploadedAtTimestamp)
        ? right.uploadedAtTimestamp
        : 0;

      return rightTime - leftTime;
    })
    .map(({ sourcePriority, ...document }) => document);
};

const readAllStoredDocuments = async (db, employeeKey) => {
  if (!db || !employeeKey) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("employeeKey");
    const request = index.getAll(employeeKey);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => reject(request.error);
  });
};

const writeStoredDocument = async (db, document) => {
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(document);

    request.onsuccess = () => resolve(document);
    request.onerror = () => reject(request.error);
  });
};

const removeStoredDocumentByKey = async (db, cacheKey) => {
  if (!db || !cacheKey) {
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(cacheKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const loadStoredDocuments = async (employeeKey) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey) {
    return [];
  }

  const db = await openDatabase();

  if (!db) {
    return [];
  }

  const storedDocuments = await readAllStoredDocuments(
    db,
    normalizedEmployeeKey
  );

  return storedDocuments.map((document) =>
    normalizeDocumentRecord(document, normalizedEmployeeKey)
  );
};

export const saveStoredDocument = async (employeeKey, document) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey) {
    return null;
  }

  const db = await openDatabase();

  if (!db) {
    return null;
  }

  const normalizedDocument = normalizeDocumentRecord(
    {
      ...document,
      employeeKey: normalizedEmployeeKey,
    },
    normalizedEmployeeKey
  );

  await writeStoredDocument(db, normalizedDocument);
  return normalizedDocument;
};

export const saveStoredDocuments = async (employeeKey, documents = []) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey || !Array.isArray(documents)) {
    return [];
  }

  const db = await openDatabase();

  if (!db) {
    return [];
  }

  const normalizedDocuments = documents.map((document) =>
    normalizeDocumentRecord(
      {
        ...document,
        employeeKey: normalizedEmployeeKey,
      },
      normalizedEmployeeKey
    )
  );

  await Promise.all(
    normalizedDocuments.map((document) => writeStoredDocument(db, document))
  );

  return normalizedDocuments;
};

export const removeStoredDocument = async (
  employeeKey,
  targetDocument
) => {
  const normalizedEmployeeKey = toSafeString(employeeKey);

  if (!normalizedEmployeeKey) {
    return null;
  }

  const db = await openDatabase();

  if (!db) {
    return null;
  }

  const storedDocuments = await readAllStoredDocuments(
    db,
    normalizedEmployeeKey
  );

  const normalizedTarget = normalizeDocumentRecord(
    targetDocument,
    normalizedEmployeeKey
  );

  const match = storedDocuments.find((document) => {
    if (
      normalizedTarget.serverId &&
      String(document.serverId || "") === normalizedTarget.serverId
    ) {
      return true;
    }

    return (
      document.cacheKey === normalizedTarget.cacheKey ||
      (
        normalizedTarget.fileName &&
        document.fileName === normalizedTarget.fileName &&
        document.size === normalizedTarget.size
      )
    );
  });

  if (!match) {
    return null;
  }

  await removeStoredDocumentByKey(db, match.cacheKey);
  return normalizeDocumentRecord(match, normalizedEmployeeKey);
};
