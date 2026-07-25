export function Button({variant='primary',size='md',icon,disabled,children,style,...rest}){
  const [hover,setHover]=React.useState(false),[press,setPress]=React.useState(false);
  const pads={sm:'9px 18px 7px',md:'13px 26px 11px',lg:'17px 34px 15px'},fs={sm:13,md:15,lg:17};
  const base={fontFamily:'var(--font-display)',fontWeight:600,letterSpacing:'0.04em',border:'1px solid transparent',borderRadius:'var(--radius-pill)',cursor:disabled?'default':'pointer',display:'inline-flex',alignItems:'center',gap:8,padding:pads[size],fontSize:fs[size],lineHeight:1,transition:'background var(--duration-quick) var(--ease-gentle),transform var(--duration-quick) var(--ease-gentle)',transform:press&&!disabled?'scale(.98)':'none',opacity:disabled?.45:1};
  const looks={
    primary:{background:hover&&!disabled?'var(--accent-primary-strong)':'var(--accent-primary)',color:'var(--text-on-accent)'},
    secondary:{background:hover&&!disabled?'var(--rnc-violet-100)':'transparent',color:'var(--accent-primary-strong)',borderColor:'var(--rnc-violet-200)'},
    gold:{background:hover&&!disabled?'var(--rnc-gold-600)':'var(--rnc-gold-500)',color:'#fff'},
    ghost:{background:hover&&!disabled?'var(--rnc-violet-50)':'transparent',color:'var(--accent-primary-strong)'}
  };
  return <button {...rest} disabled={disabled} style={{...base,...looks[variant],...style}}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>{setHover(false);setPress(false)}}
    onMouseDown={()=>setPress(true)} onMouseUp={()=>setPress(false)}>{icon}{children}</button>;
}