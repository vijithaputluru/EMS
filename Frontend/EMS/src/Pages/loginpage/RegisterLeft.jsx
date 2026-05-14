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

  const [error, setError] = useState("");

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
      if (/^[a-zA-Z\s.'-]{0,60}$/.test(value)) {
        setFormData((prev) => ({
          ...prev,
          fullName: value,
        }));
      }
    } else if (name === "email") {
      setFormData((prev) => ({
        ...prev,
        email: value.toLowerCase(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError("Enter a valid email address.");
      return;
    }

    const passwordMessage =
      getPasswordValidationMessage(formData.password);

    if (passwordMessage) {
      setError(passwordMessage);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const { firstName, lastName } = splitFullName(formData.fullName);

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
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Registration failed."
      );
    } finally {
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

      {error ? (
        <div className="auth-status auth-status-error">
          {error}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
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