export function Tabs({tabs=[],active,onChange,style}){
  const [hover,setHover]=React.useState(null);
  return <div role="tablist" style={{display:'flex',gap:4,borderBottom:'1px solid var(--border-soft)',...style}}>
    {tabs.map(t=>{const id=typeof t==='string'?t:t.id,label=typeof t==='string'?t:t.label,is=id===active;
      return <button key={id} role="tab" aria-selected={is} onClick={()=>onChange&&onChange(id)} onMouseEnter={()=>setHover(id)} onMouseLeave={()=>setHover(null)}
        style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:15,letterSpacing:'.03em',padding:'10px 18px 12px',border:'none',background:'none',cursor:'pointer',color:is?'var(--accent-primary-strong)':hover===id?'var(--text-heading)':'var(--text-muted)',boxShadow:is?'inset 0 -2.5px 0 var(--accent-primary)':'none',transition:'color var(--duration-quick) var(--ease-gentle)'}}>{label}</button>;})}
  </div>;
}