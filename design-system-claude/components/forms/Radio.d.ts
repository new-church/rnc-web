/** Controlled radio; group with shared name, onChange receives value. */
export interface RadioProps {
  label?: React.ReactNode;
  name?: string;
  value?: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  disabled?: boolean;
}
export declare function Radio(props: RadioProps): JSX.Element;