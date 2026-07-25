/** Labelled select with custom chevron. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Array<string | { value: string; label: string }>;
}
export declare function Select(props: SelectProps): JSX.Element;