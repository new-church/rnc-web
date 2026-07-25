function Footer(){
  return <footer style={{background:'var(--rnc-gradient-dusk)',color:'var(--text-on-dark)',marginTop:'var(--space-9)'}}>
    <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'56px 32px 40px',display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:40}}>
      <div>
        <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:22,letterSpacing:'.06em',marginBottom:10}}>Roseville New Church</div>
        <p style={{margin:0,fontSize:15,color:'rgba(246,242,251,.75)',maxWidth:340}}>A Swedenborgian community in Sydney — worshipping the Lord Jesus Christ and exploring His love and wisdom together.</p>
      </div>
      <div style={{fontSize:15,lineHeight:2}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:12,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--rnc-gold-300)',marginBottom:8}}>Visit</div>
        4 Shirley Rd, Roseville NSW 2069<br/>Sundays at 10am
      </div>
      <div style={{fontSize:15,lineHeight:2}}>
        <div style={{fontFamily:'var(--font-display)',fontSize:12,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--rnc-gold-300)',marginBottom:8}}>Contact</div>
        +61 2 9416 2812<br/><a href="#" style={{color:'var(--rnc-violet-200)'}}>Email us</a>
      </div>
    </div>
    <div style={{textAlign:'center',padding:'0 0 28px',fontFamily:'var(--font-display)',fontSize:12,letterSpacing:'.1em',color:'rgba(246,242,251,.5)'}}>© 2026 Roseville New Church · ✦</div>
  </footer>;
}
window.Footer = Footer;