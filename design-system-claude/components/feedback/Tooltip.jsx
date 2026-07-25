export function Tooltip({label,children,side='top'}){
  const [show,setShow]=React.useState(false);
  const pos=side==='bottom'?{top:'calc(100% + 8px)'}:{bottom:'calc(100% + 8px)'};
  return <span style={{position:'relative',display:'inline-flex'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
    {children}
    {show&&<span role="tooltip" style={{position:'absolute',left:'50%',transform:'translateX(-50%)',...pos,background:'var(--surface-inverse)',color:'var(--text-on-dark)',fontFamily:'var(--font-display)',fontSize:12.5,letterSpacing:'.03em',padding:'7px 12px 5px',borderRadius:'var(--radius-sm)',whiteSpace:'nowrap',zIndex:50,boxShadow:'var(--shadow-card)'}}>{label}</span>}
  </span>;
}