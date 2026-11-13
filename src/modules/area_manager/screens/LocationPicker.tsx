import SearchSelect from "../../report/screens/SearchSelect";
import type { LocationOption } from "../../report/services/service";

export default function LocationPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[];
  options: LocationOption[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <SearchSelect
      label="Visit Locations"
      multiple
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={options.map((option) => ({
        value: option.id,
        label: option.name,
      }))}
    />
  );
}
