export function Tag({children,onRemove,style}){
  const [hover,setHover]=React.useState(false);
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,fontFamily:'var(--font-display)',fontSize:13,padding:'6px 14px 4px',borderRadius:'var(--radius-pill)',background:'#fff',border:'1px solid var(--border-strong)',color:'var(--text-heading)',...style}}>
    {children}
    {onRemove&&<button onClick={onRemove} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} aria-label="Remove" style={{border:'none',background:'none',cursor:'pointer',padding:0,marginTop:-2,display:'flex',color:hover?'var(--status-error)':'var(--text-muted)'}}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>}
  </span>;
}