import Select from "react-select";

interface CustomSelectProps {
  name: string;
  options: Array<{ value: string; label: string }>; // Define a more specific type for options
  onChange: (option: any, actionMeta: { name: string }) => void;
  value: any;
  disabled?: boolean; // Use a boolean for the disabled prop
  placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  name,
  options, // Ensure this isn't declared anywhere else
  onChange,
  value,
  placeholder,
  disabled,
}) => {
  return (
    <Select
      name={name}
      options={options}
      menuPlacement="auto"
      className="js-example-placeholder-single js-states"
      classNamePrefix="Select2"
      value={options.find((opt) => opt.value === value) || null}
      onChange={(option) => onChange(option, { name })}
      isDisabled={disabled}
      placeholder={placeholder}
      menuPortalTarget={document.body}
    />
  );
};

export default CustomSelect;
