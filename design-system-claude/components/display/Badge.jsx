export function Badge({tone='violet',children,style}){
  const tones={violet:{bg:'var(--rnc-violet-100)',fg:'var(--rnc-violet-700)'},gold:{bg:'var(--rnc-gold-100)',fg:'var(--rnc-gold-600)'},success:{bg:'var(--status-success-bg)',fg:'var(--status-success)'},warning:{bg:'var(--status-warning-bg)',fg:'var(--status-warning)'},error:{bg:'var(--status-error-bg)',fg:'var(--status-error)'},info:{bg:'var(--status-info-bg)',fg:'var(--status-info)'}};
  const t=tones[tone]||tones.violet;
  return <span style={{display:'inline-flex',alignItems:'center',gap:6,fontFamily:'var(--font-display)',fontWeight:600,fontSize:12,letterSpacing:'.08em',textTransform:'uppercase',padding:'5px 12px 3px',borderRadius:'var(--radius-pill)',background:t.bg,color:t.fg,...style}}>{children}</span>;
}