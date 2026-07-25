export function Input({label,hint,error,style,...rest}){
  const [focus,setFocus]=React.useState(false);
  return <label style={{display:'flex',flexDirection:'column',gap:6,fontFamily:'var(--font-display)',fontSize:14,color:'var(--text-heading)',...style}}>
    {label}
    <input {...rest} onFocus={e=>{setFocus(true);rest.onFocus&&rest.onFocus(e)}} onBlur={e=>{setFocus(false);rest.onBlur&&rest.onBlur(e)}}
      style={{fontFamily:'var(--font-body)',fontSize:16,color:'var(--text-body)',padding:'12px 16px',borderRadius:'var(--radius-md)',border:'1px solid '+(error?'var(--status-error)':focus?'var(--accent-primary)':'var(--border-strong)'),outline:'none',background:'#fff',boxShadow:focus?'var(--shadow-glow)':'none',transition:'box-shadow var(--duration-quick) var(--ease-gentle)'}}/>
    {error?<span style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--status-error)'}}>{error}</span>:hint?<span style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--text-muted)'}}>{hint}</span>:null}
  </label>;
}