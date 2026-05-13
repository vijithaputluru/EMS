import { useEffect, useRef, useState } from "react";
import api from "../api/axiosInstance";
import {
  SALARY_BREAKUP_FIELDS,
  SALARY_MIN,
  buildSalaryBreakupPayload,
  calculateSalaryBreakup,
  clampAnnualCtc,
  createManualSalaryFieldMap,
  extractSalaryBreakup,
  extractManualOverrideFields,
  parseCurrencyInput,
  validateSalaryBreakup,
} from "../utils/salaryStructure";

function useSalaryStructure({
  initialCtc = SALARY_MIN,
  initialSource = null,
  calculateEndpoint = "",
  requestHeaders = null,
  allowServerCalculation = true,
}) {
  const initialManualFields = initialSource
    ? extractManualOverrideFields(initialSource)
    : createManualSalaryFieldMap();
  const normalizedInitialCtc = clampAnnualCtc(initialCtc);
  const initialBreakup = initialSource
    ? extractSalaryBreakup(initialSource, normalizedInitialCtc, initialManualFields)
    : calculateSalaryBreakup(normalizedInitialCtc);

  const [ctcValue, setCtcValue] = useState(normalizedInitialCtc);
  const [salaryBreakup, setSalaryBreakup] = useState(initialBreakup);
  const [manualSalaryFields, setManualSalaryFields] = useState(initialManualFields);
  const [salaryErrors, setSalaryErrors] = useState(
    validateSalaryBreakup(normalizedInitialCtc, initialBreakup)
  );
  const [isSyncingSalary, setIsSyncingSalary] = useState(false);

  const requestIdRef = useRef(0);
  const allowRemoteCalculationRef = useRef(true);
  const salaryBreakupRef = useRef(salaryBreakup);
  const manualSalaryFieldsRef = useRef(manualSalaryFields);
  const requestHeadersRef = useRef(requestHeaders);

  useEffect(() => {
    salaryBreakupRef.current = salaryBreakup;
  }, [salaryBreakup]);

  useEffect(() => {
    manualSalaryFieldsRef.current = manualSalaryFields;
  }, [manualSalaryFields]);

  useEffect(() => {
    requestHeadersRef.current = requestHeaders;
  }, [requestHeaders]);

  const syncValidation = (nextCtcValue, nextBreakup) => {
    const nextErrors = validateSalaryBreakup(nextCtcValue, nextBreakup);
    setSalaryErrors(nextErrors);
    return nextErrors;
  };

  const applySalaryState = (
    nextCtcValue,
    nextBreakup,
    nextManualSalaryFields
  ) => {
    const normalizedCtcValue = clampAnnualCtc(nextCtcValue);
    const normalizedBreakup = calculateSalaryBreakup(
      normalizedCtcValue,
      nextBreakup,
      nextManualSalaryFields
    );

    setCtcValue(normalizedCtcValue);
    setSalaryBreakup(normalizedBreakup);
    setManualSalaryFields(nextManualSalaryFields);
    syncValidation(normalizedCtcValue, normalizedBreakup);
  };

  const handleCtcChange = (value) => {
    const nextCtcValue = clampAnnualCtc(value);

    applySalaryState(nextCtcValue, salaryBreakup, manualSalaryFields);
  };

  const handleBreakupFieldChange = (fieldName, rawValue) => {
    const nextValue = parseCurrencyInput(rawValue);
    const nextManualSalaryFields = {
      ...manualSalaryFields,
      [fieldName]: true,
    };
    const nextBreakup = {
      ...salaryBreakup,
      [fieldName]: nextValue,
    };

    applySalaryState(ctcValue, nextBreakup, nextManualSalaryFields);
  };

  const resetSalaryStructure = ({
    ctcAnnual = ctcValue,
    source = null,
    manualFields = null,
  } = {}) => {
    const nextManualFields =
      manualFields ||
      (source ? extractManualOverrideFields(source) : createManualSalaryFieldMap());
    const normalizedCtcValue = clampAnnualCtc(ctcAnnual);
    const nextBreakup = source
      ? extractSalaryBreakup(source, normalizedCtcValue, nextManualFields)
      : calculateSalaryBreakup(normalizedCtcValue, {}, nextManualFields);

    allowRemoteCalculationRef.current = true;
    applySalaryState(normalizedCtcValue, nextBreakup, nextManualFields);
  };

  const clearManualOverrides = () => {
    applySalaryState(ctcValue, salaryBreakup, createManualSalaryFieldMap());
  };

  const manualSignature = SALARY_BREAKUP_FIELDS.map(({ name }) =>
    manualSalaryFields[name] ? `${name}:${salaryBreakup[name]}` : `${name}:auto`
  ).join("|");

  useEffect(() => {
    if (!allowServerCalculation || !calculateEndpoint || !allowRemoteCalculationRef.current) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;

      setIsSyncingSalary(true);

      try {
        const headerValue =
          typeof requestHeadersRef.current === "function"
            ? requestHeadersRef.current()
            : requestHeadersRef.current;

        const response = await api.post(
          calculateEndpoint,
          buildSalaryBreakupPayload(
            ctcValue,
            salaryBreakupRef.current,
            manualSalaryFieldsRef.current
          ),
          headerValue ? { headers: headerValue } : undefined
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        const backendBreakup = extractSalaryBreakup(
          response.data,
          ctcValue,
          manualSalaryFieldsRef.current
        );

        setSalaryBreakup(backendBreakup);
        syncValidation(ctcValue, backendBreakup);
      } catch (error) {
        const status = error.response?.status;

        if (status === 404 || status === 405 || status === 501) {
          allowRemoteCalculationRef.current = false;
        } else if (status && status !== 401) {
          console.error("Salary structure calculation error:", error);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsSyncingSalary(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    allowServerCalculation,
    calculateEndpoint,
    ctcValue,
    manualSignature,
  ]);

  const isSalaryValid = Object.keys(salaryErrors).length === 0;

  return {
    ctcValue,
    salaryBreakup,
    manualSalaryFields,
    salaryErrors,
    isSalaryValid,
    isSyncingSalary,
    handleCtcChange,
    handleBreakupFieldChange,
    resetSalaryStructure,
    clearManualOverrides,
    setManualSalaryFields,
  };
}

export default useSalaryStructure;
