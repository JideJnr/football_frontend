import React from "react";

interface TextInputProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
  id,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) => {
  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
    />
  );
};

export default TextInput;
