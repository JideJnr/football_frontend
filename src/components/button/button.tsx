import React from "react";

interface ButtonProps {
  text: string;
  loadingText?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  svg?: React.ReactNode;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({
  text,
  loading = false,
  disabled = false,
  onClick,
  className = "",
  loadingText,
  svg,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`bg-brand-primary text-white font-medium text-sm rounded-md py-2 px-4 flex items-center justify-center gap-2 transition duration-300
        hover:bg-[#a3773e]
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}`}
    >
      {loading ? (
        <>
          <span>{loadingText || "Loading..."}</span>
          <i className="ri-refresh-line animate-spin text-xs"></i>
        </>
      ) : (
        <>
          <span>{text}</span>
          {svg && <span>{svg}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
