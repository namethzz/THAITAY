import type { FC } from "react";
import type { Material } from "@/types";

export interface MaterialPickerProps {
  materials?: Material[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
}

declare const MaterialPicker: FC<MaterialPickerProps>;
export default MaterialPicker;
