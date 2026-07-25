export function Dialog({open,onClose,title,children,footer,width=460}){
  if(!open)return null;
  return <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(35,19,56,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:24}}>
    <div onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" style={{background:'var(--surface-card)',borderRadius:'var(--radius-lg)',boxShadow:'var(--shadow-lift)',maxWidth:width,width:'100%',padding:'var(--space-6)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:12}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:'var(--text-h3)',letterSpacing:'var(--tracking-display)',color:'var(--text-heading)'}}>{title}</div>
        <button onClick={onClose} aria-label="Close" style={{border:'none',background:'none',cursor:'pointer',color:'var(--text-muted)',padding:4,display:'flex'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div style={{fontFamily:'var(--font-body)',fontSize:'var(--text-base)',lineHeight:'var(--leading-body)',color:'var(--text-body)'}}>{children}</div>
      {footer&&<div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:'var(--space-5)'}}>{footer}</div>}
    </div>
  </div>;
}