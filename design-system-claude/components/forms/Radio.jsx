export function Radio({label,checked,onChange,name,value,disabled,style}){
  return <label style={{display:'inline-flex',alignItems:'center',gap:10,cursor:disabled?'default':'pointer',opacity:disabled?.45:1,fontFamily:'var(--font-body)',fontSize:16,color:'var(--text-body)',...style}}>
    <span style={{position:'relative',width:22,height:22,flex:'none'}}>
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={()=>onChange&&onChange(value)} style={{position:'absolute',inset:0,opacity:0,cursor:'inherit'}}/>
      <span style={{position:'absolute',inset:0,borderRadius:'50%',border:'1.5px solid '+(checked?'var(--accent-primary)':'var(--border-strong)'),background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',transition:'all var(--duration-quick) var(--ease-gentle)'}}>
        {checked&&<span style={{width:11,height:11,borderRadius:'50%',background:'var(--accent-primary)'}}></span>}
      </span>
    </span>
    {label}
  </label>;
}