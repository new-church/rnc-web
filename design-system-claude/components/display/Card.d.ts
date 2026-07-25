/** Surface card: white, violet tint, or dusk gradient. interactive adds hover lift. */
export interface CardProps {
  variant?: 'default' | 'tint' | 'dusk';
  interactive?: boolean;
  eyebrow?: string;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}
export declare function Card(props: CardProps): JSX.Element;