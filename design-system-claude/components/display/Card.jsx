export function Card({variant='default',interactive,eyebrow,title,children,footer,style,...rest}){
  const [hover,setHover]=React.useState(false);
  const looks={default:{background:'var(--surface-card)',border:'1px solid var(--border-soft)'},tint:{background:'var(--surface-tint)',border:'1px solid var(--border-soft)'},dusk:{background:'var(--rnc-gradient-dusk)',border:'none'}};
  const dark=variant==='dusk';
  return <div {...rest} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    style={{borderRadius:'var(--radius-lg)',padding:'var(--space-5)',boxShadow:interactive&&hover?'var(--shadow-lift)':'var(--shadow-card)',transform:interactive&&hover?'translateY(-2px)':'none',transition:'all var(--duration-soft) var(--ease-gentle)',cursor:interactive?'pointer':'default',...looks[variant],...style}}>
    {eyebrow&&<div style={{fontFamily:'var(--font-display)',fontSize:'var(--text-eyebrow)',fontWeight:600,letterSpacing:'var(--tracking-eyebrow)',textTransform:'uppercase',color:dark?'var(--rnc-gold-300)':'var(--accent-primary)',marginBottom:10}}>{eyebrow}</div>}
    {title&&<div style={{fontFamily:'var(--font-display)',fontSize:'var(--text-h3)',fontWeight:600,letterSpacing:'var(--tracking-display)',color:dark?'var(--text-on-dark)':'var(--text-heading)',marginBottom:8}}>{title}</div>}
    <div style={{fontFamily:'var(--font-body)',fontSize:'var(--text-sm)',lineHeight:'var(--leading-body)',color:dark?'rgba(246,242,251,.85)':'var(--text-body)'}}>{children}</div>
    {footer&&<div style={{marginTop:14}}>{footer}</div>}
  </div>;
}