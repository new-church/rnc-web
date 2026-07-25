export function Toast({tone='success',children,onDismiss,style}){
  const tones={success:{fg:'var(--status-success)'},warning:{fg:'var(--status-warning)'},error:{fg:'var(--status-error)'},info:{fg:'var(--status-info)'}};
  const t=tones[tone]||tones.success;
  return <div role="status" style={{display:'inline-flex',alignItems:'center',gap:10,background:'var(--surface-inverse)',color:'var(--text-on-dark)',fontFamily:'var(--font-body)',fontSize:15,padding:'12px 18px',borderRadius:'var(--radius-pill)',boxShadow:'var(--shadow-lift)',...style}}>
    <span style={{width:8,height:8,borderRadius:'50%',background:t.fg,flex:'none'}}></span>
    {children}
    {onDismiss&&<button onClick={onDismiss} aria-label="Dismiss" style={{border:'none',background:'none',cursor:'pointer',color:'rgba(246,242,251,.6)',padding:0,display:'flex',marginLeft:4}}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>}
  </div>;
}