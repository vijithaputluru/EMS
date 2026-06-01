// Optimization: keep performance timings available without flooding production logs by default.
export const isPerformanceLoggingEnabled = () =>
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_PERF_LOGS === "true";

export const startPerformanceTimer = (label) => {
  if (!isPerformanceLoggingEnabled() || typeof console === "undefined") {
    return;
  }

  console.time(label);
};

export const endPerformanceTimer = (label) => {
  if (!isPerformanceLoggingEnabled() || typeof console === "undefined") {
    return;
  }

  console.timeEnd(label);
};

export const logPerformanceError = (...args) => {
  if (!isPerformanceLoggingEnabled() || typeof console === "undefined") {
    return;
  }

  console.error(...args);
};

export const logPerformanceWarning = (...args) => {
  if (!isPerformanceLoggingEnabled() || typeof console === "undefined") {
    return;
  }

  console.warn(...args);
};
