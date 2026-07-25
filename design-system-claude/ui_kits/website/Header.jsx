function Header({page,onNav}){
  const {Button} = window.RosevilleNewChurchDesignSystem_094ee1;
  const links=['Home','Events','About'];
  return <header style={{position:'sticky',top:0,zIndex:40,background:'rgba(251,249,244,.85)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--border-soft)'}}>
    <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'14px 32px',display:'flex',alignItems:'center',gap:28}}>
      <div onClick={()=>onNav('Home')} style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:19,letterSpacing:'.06em',color:'var(--rnc-violet-900)',cursor:'pointer',whiteSpace:'nowrap'}}>Roseville New Church</div>
      <nav style={{display:'flex',gap:6,marginLeft:'auto',alignItems:'center'}}>
        {links.map(l=><a key={l} href="#" onClick={e=>{e.preventDefault();onNav(l)}} style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:15,letterSpacing:'.03em',textDecoration:'none',padding:'8px 14px 6px',borderRadius:'var(--radius-pill)',color:page===l?'var(--accent-primary-strong)':'var(--text-muted)',background:page===l?'var(--rnc-violet-100)':'transparent'}}>{l}</a>)}
        <Button variant="gold" size="sm" style={{marginLeft:10}}>Plan a visit</Button>
      </nav>
    </div>
  </header>;
}
window.Header = Header;