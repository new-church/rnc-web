/** Underline tabs. Controlled: pass active id + onChange. */
export interface TabsProps {
  tabs: Array<string | { id: string; label: React.ReactNode }>;
  active?: string;
  onChange?: (id: string) => void;
}
export declare function Tabs(props: TabsProps): JSX.Element;