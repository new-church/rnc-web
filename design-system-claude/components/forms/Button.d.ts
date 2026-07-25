/** Pill button in Josefin Sans. Sentence-case labels only. */
export interface ButtonProps {
  /** 'primary' | 'secondary' | 'gold' | 'ghost' */
  variant?: 'primary' | 'secondary' | 'gold' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}
export declare function Button(props: ButtonProps): JSX.Element;