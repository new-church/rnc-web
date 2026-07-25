/** Centered modal over a violet scrim; controlled via open/onClose. */
export interface DialogProps {
  open?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width px, default 460 */
  width?: number;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;