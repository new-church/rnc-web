export function Checkbox({label,checked,onChange,disabled,style}){
  return <label style={{display:'inline-flex',alignItems:'center',gap:10,cursor:disabled?'default':'pointer',opacity:disabled?.45:1,fontFamily:'var(--font-body)',fontSize:16,color:'var(--text-body)',...style}}>
    <span style={{position:'relative',width:22,height:22,flex:'none'}}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e=>onChange&&onChange(e.target.checked)} style={{position:'absolute',inset:0,opacity:0,cursor:'inherit'}}/>
      <span style={{position:'absolute',inset:0,borderRadius:7,border:'1.5px solid '+(checked?'var(--accent-primary)':'var(--border-strong)'),background:checked?'var(--accent-primary)':'#fff',transition:'all var(--duration-quick) var(--ease-gentle)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {checked&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
      </span>
    </span>
    {label}
  </label>;
}