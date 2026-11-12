import SearchSelect from "./SearchSelect";

export interface SelectOption {
  value: string;
  label: string;
}
export default function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  disabledReason,
  placeholder = "Select",
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  presentation?: "inline" | "modal";
}) {
  return (
    <SearchSelect
      label={label}
      value={value ? [value] : []}
      options={options}
      onChange={(values) => onChange(values[0] ?? "")}
      disabled={disabled}
      disabledReason={disabledReason}
      placeholder={placeholder}
    />
  );
}
