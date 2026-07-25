/** Labelled text input with focus glow; supports hint and error text. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}
export declare function Input(props: InputProps): JSX.Element;