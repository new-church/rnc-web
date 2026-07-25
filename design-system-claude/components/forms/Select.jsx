export function Select({label,options=[],style,...rest}){
  const [focus,setFocus]=React.useState(false);
  return <label style={{display:'flex',flexDirection:'column',gap:6,fontFamily:'var(--font-display)',fontSize:14,color:'var(--text-heading)',...style}}>
    {label}
    <span style={{position:'relative',display:'block'}}>
      <select {...rest} onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)} style={{width:'100%',appearance:'none',fontFamily:'var(--font-body)',fontSize:16,color:'var(--text-body)',padding:'12px 40px 12px 16px',borderRadius:'var(--radius-md)',border:'1px solid '+(focus?'var(--accent-primary)':'var(--border-strong)'),outline:'none',background:'#fff',boxShadow:focus?'var(--shadow-glow)':'none'}}>
        {options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </span>
  </label>;
}