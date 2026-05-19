import React, { useMemo, useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import AuthField from "./AuthField";
import { getPasswordRuleState, getPasswordStrength, splitFullName } from "./authUtils";
import {
  normalizeWhitespace,
  sanitizeEmailInput,
  sanitizeLettersAndSpaces,
  validateEmailAddress,
  validateEmployeeName,
} from "../../utils/validation";

export default function RegisterLeft() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const passwordRules = useMemo(
    () => getPasswordRuleState(formData.password),
    [formData.password]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "fullName") {
      nextValue = sanitizeLettersAndSpaces(value, 50);
    } else if (name === "email") {
      nextValue = sanitizeEmailInput(value, 40);
    } else if (name === "password" || name === "confirmPassword") {
      nextValue = value.replace(/\s+/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      ...(name === "password" ? { confirmPassword: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const fullName = normalizeWhitespace(formData.fullName);
    const email = sanitizeEmailInput(formData.email, 40);
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    const validationErrors = {};

    const fullNameError = validateEmployeeName(fullName, {
      label: "Full Name",
      min: 3,
      max: 50,
    });
    if (fullNameError) {
      validationErrors.fullName = fullNameError;
    }

    const emailError = validateEmailAddress(email, {
      label: "Email Address",
      max: 40,
    });
    if (emailError) {
      validationErrors.email = emailError;
    }

    if (!password) {
      validationErrors.password = "Password is required";
    } else if (!/^[A-Z]/.test(password)) {
      validationErrors.password = "Password must start with a capital letter";
    } else if (password.length < 8) {
      validationErrors.password = "Password must contain minimum 8 characters";
    } else if (!/[0-9]/.test(password)) {
      validationErrors.password = "Password must contain at least one number";
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      validationErrors.password =
        "Password must contain at least one special character";
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      validationErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const { firstName, lastName } = splitFullName(fullName);

    setFormData((prev) => ({
      ...prev,
      fullName,
      email,
    }));
    setLoading(true);

    try {
      await api.post(
        API_ENDPOINTS.auth.userRegister,
        {
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
        },
        {
          skipAuth: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      navigate("/login");
    } catch (requestError) {
      setErrors((prev) => ({
        ...prev,
        email: requestError.response?.data?.message || "Registration failed.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-card-head">
        <p className="auth-eyebrow">Employee Onboarding</p>

        <h2 className="auth-card-title">Create Your PIRNAV HRMS Account</h2>

        <p className="auth-card-subtitle">
          Start with your name, work email, and a strong password for a clean,
          secure onboarding experience.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <AuthField
          label="Full Name"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          autoComplete="name"
          placeholder="Enter your full name"
          icon={FaUser}
          error={errors.fullName}
          maxLength={50}
          required
        />

        <AuthField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="Enter your work email address"
          icon={FaEnvelope}
          error={errors.email}
          maxLength={40}
          required
        />

        <AuthField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Create a secure password"
          icon={FaLock}
          error={errors.password}
          required
          action={{
            label: showPassword ? "Hide password" : "Show password",
            icon: showPassword ? <FaEye /> : <FaEyeSlash />,
            onClick: () => setShowPassword((prev) => !prev),
          }}
        />

        <div className="auth-strength-card">
          <div className="auth-strength-head">
            <span>Password Strength</span>

            <span className={`auth-strength-pill ${passwordStrength.tone}`}>
              {passwordStrength.label}
            </span>
          </div>

          <div className="auth-strength-bars" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={`auth-strength-bar ${
                  index < passwordStrength.score
                    ? `auth-strength-bar-${passwordStrength.tone}`
                    : ""
                }`}
              />
            ))}
          </div>

          <div className="auth-rule-list">
            {passwordRules.map((rule) => (
              <span
                key={rule.id}
                className={`auth-rule-item ${rule.passed ? "passed" : ""}`}
              >
                {rule.label}
              </span>
            ))}
          </div>
        </div>

        <AuthField
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          icon={FaLock}
          error={errors.confirmPassword}
          required
          action={{
            label: showConfirmPassword ? "Hide confirm password" : "Show confirm password",
            icon: showConfirmPassword ? <FaEye /> : <FaEyeSlash />,
            onClick: () => setShowConfirmPassword((prev) => !prev),
          }}
        />

        <button
          type="submit"
          className="auth-primary-button"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="auth-footer">
        Already have an account?

        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </>
  );
}
