export function Switch({label,checked,onChange,disabled,style}){
  return <label style={{display:'inline-flex',alignItems:'center',gap:10,cursor:disabled?'default':'pointer',opacity:disabled?.45:1,fontFamily:'var(--font-body)',fontSize:16,color:'var(--text-body)',...style}}>
    <span onClick={()=>!disabled&&onChange&&onChange(!checked)} style={{width:44,height:26,borderRadius:13,background:checked?'var(--accent-primary)':'var(--rnc-stone-300)',position:'relative',transition:'background var(--duration-soft) var(--ease-gentle)',flex:'none'}}>
      <span style={{position:'absolute',top:3,left:checked?21:3,width:20,height:20,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(46,26,71,.3)',transition:'left var(--duration-soft) var(--ease-gentle)'}}></span>
    </span>
    {label}
  </label>;
}