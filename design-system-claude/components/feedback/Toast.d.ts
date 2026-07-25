/** Dark pill notification with a status dot. Position it yourself (fixed bottom-center). */
export interface ToastProps {
  tone?: 'success' | 'warning' | 'error' | 'info';
  children?: React.ReactNode;
  onDismiss?: () => void;
}
export declare function Toast(props: ToastProps): JSX.Element;