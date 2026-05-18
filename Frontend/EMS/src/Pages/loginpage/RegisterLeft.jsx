import React, { useMemo, useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { API_ENDPOINTS } from "../../api/endpoints";
import AuthField from "./AuthField";
import {
  getPasswordRuleState,
  getPasswordStrength,
  getPasswordValidationMessage,
  isValidEmail,
  splitFullName,
} from "./authUtils";

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

  if (name === "fullName") {
    // only alphabets + spaces
    if (/^[A-Za-z\s]{0,50}$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        fullName: value,
      }));
    }
  }

  else if (name === "email") {
    // max 40 chars
    if (value.length <= 40) {
      setFormData((prev) => ({
        ...prev,
        email: value.toLowerCase(),
      }));
    }
  }

  else if (name === "password") {
    setFormData((prev) => ({
      ...prev,
      password: value,
    }));
  }

  else {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  setErrors((prev) => ({
    ...prev,
    [name]: "",
  }));
};

  const handleSubmit = async (event) => {
  event.preventDefault();

  const validationErrors = {};

  // =========================
  // FULL NAME VALIDATION
  // =========================

  const fullName = formData.fullName.trim();

  if (!fullName) {
    validationErrors.fullName =
      "Full name is required";
  }

  else if (fullName.length < 3) {
    validationErrors.fullName =
      "Full name must contain minimum 3 characters";
  }

  else if (fullName.length > 50) {
    validationErrors.fullName =
      "Full name should not exceed 50 characters";
  }

  else if (!/^[A-Za-z\s]+$/.test(fullName)) {
    validationErrors.fullName =
      "Only alphabets are allowed";
  }

  // =========================
  // EMAIL VALIDATION
  // =========================

  const email = formData.email.trim().toLowerCase();

  if (!email) {
    validationErrors.email =
      "Email address is required";
  }

  else if (email.length > 40) {
    validationErrors.email =
      "Email should not exceed 40 characters";
  }

  else {
    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@(gmail\.com|pirnav\.com)$/;

    if (!emailRegex.test(email)) {
      validationErrors.email =
        "Invalid email format";
    }
  }

  // =========================
  // PASSWORD VALIDATION
  // =========================

  const password = formData.password;

  if (!password) {
    validationErrors.password =
      "Password is required";
  }

  else {
    // First character capital
    if (!/^[A-Z]/.test(password)) {
      validationErrors.password =
        "Password must start with a capital letter";
    }

    // minimum 8 chars
    else if (password.length < 8) {
      validationErrors.password =
        "Password must contain minimum 8 characters";
    }

    // one number
    else if (!/[0-9]/.test(password)) {
      validationErrors.password =
        "Password must contain at least one number";
    }

    // one special char
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      validationErrors.password =
        "Password must contain at least one special character";
    }
  }

  // =========================
  // CONFIRM PASSWORD
  // =========================

  if (!formData.confirmPassword) {
    validationErrors.confirmPassword =
      "Confirm password is required";
  }

  else if (
    formData.password !== formData.confirmPassword
  ) {
    validationErrors.confirmPassword =
      "Passwords do not match";
  }

  // =========================

  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  const { firstName, lastName } =
    splitFullName(formData.fullName);

  setLoading(true);

  try {
    await api.post(
      API_ENDPOINTS.auth.userRegister,
      {
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      },
      {
        skipAuth: true,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    navigate("/login");
  }

  catch (requestError) {
    setErrors({
      email:
        requestError.response?.data?.message ||
        "Registration failed.",
    });
  }

  finally {
    setLoading(false);
  }
};

  return (
    <>
      <div className="auth-card-head">
        <p className="auth-eyebrow">
          Employee Onboarding
        </p>

        <h2 className="auth-card-title">
          Create Your PIRNAV HRMS Account
        </h2>

        <p className="auth-card-subtitle">
          Start with your name, work email, and a strong
          password for a clean, secure onboarding experience.
        </p>
      </div>

      {/* {error ? (
        <div className="auth-status auth-status-error">
          {error}
        </div>
      ) : null} */}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
  <AuthField
    label="Full Name"
    name="fullName"
    type="text"
    value={formData.fullName}
    onChange={handleChange}
    autoComplete="name"
    placeholder="Enter your full name"
    icon={FaUser}
    required
  />

  {errors.fullName && (
    <p className="auth-field-error">
      {errors.fullName}
    </p>
  )}
</div>

       <div>
  <AuthField
    label="Email Address"
    name="email"
    type="email"
    value={formData.email}
    onChange={handleChange}
    autoComplete="email"
    placeholder="Enter your work email address"
    icon={FaEnvelope}
    required
  />

  {errors.email && (
    <p className="auth-field-error">
      {errors.email}
    </p>
  )}
</div>

        <AuthField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Create a secure password"
          icon={FaLock}
          required
          action={{
            label: showPassword
              ? "Hide password"
              : "Show password",

            icon: showPassword
              ? <FaEye />
              : <FaEyeSlash />,

            onClick: () =>
              setShowPassword((prev) => !prev),
          }}
        />
        {errors.password && (
  <p className="auth-field-error">
    {errors.password}
  </p>
)}

        <div className="auth-strength-card">
          <div className="auth-strength-head">
            <span>Password Strength</span>

            <span
              className={`auth-strength-pill ${passwordStrength.tone}`}
            >
              {passwordStrength.label}
            </span>
          </div>

          <div
            className="auth-strength-bars"
            aria-hidden="true"
          >
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
                className={`auth-rule-item ${
                  rule.passed ? "passed" : ""
                }`}
              >
                {rule.label}
              </span>
            ))}
          </div>
        </div>

        <AuthField
          label="Confirm Password"
          name="confirmPassword"
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          icon={FaLock}
          required
          action={{
            label: showConfirmPassword
              ? "Hide confirm password"
              : "Show confirm password",

            icon: showConfirmPassword
              ? <FaEye />
              : <FaEyeSlash />,

            onClick: () =>
              setShowConfirmPassword((prev) => !prev),
          }}
        />
        {errors.confirmPassword && (
  <p className="auth-field-error">
    {errors.confirmPassword}
  </p>
)}

        <button
          type="submit"
          className="auth-primary-button"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : "Create Account"}
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