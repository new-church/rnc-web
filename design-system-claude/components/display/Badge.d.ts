/** Small uppercase status pill. */
export interface BadgeProps {
  tone?: 'violet' | 'gold' | 'success' | 'warning' | 'error' | 'info';
  children?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;