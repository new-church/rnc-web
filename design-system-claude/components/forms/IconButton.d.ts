/** Circular icon-only button. Always pass label for accessibility. */
export interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  variant?: 'ghost' | 'tinted' | 'primary';
  /** Diameter in px, default 40 */
  size?: number;
  onClick?: () => void;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;