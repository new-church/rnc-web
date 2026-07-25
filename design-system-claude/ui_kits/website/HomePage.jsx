function HomePage({onNav}){
  const NS = window.RosevilleNewChurchDesignSystem_094ee1;
  const {Button,Card,Badge,Input} = NS;
  const [email,setEmail]=React.useState('');
  const [sent,setSent]=React.useState(false);
  const Icon=({d,size=22})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
  const sun=<Icon d={<><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></>}/>;
  return <main>
    <section style={{background:'var(--rnc-gradient-dawn)',borderBottom:'1px solid var(--border-soft)'}}>
      <div style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'96px 32px 88px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:13,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--accent-primary)',marginBottom:18}}>✦ A Swedenborgian community in Sydney ✦</div>
        <h1 style={{margin:'0 auto',fontWeight:300,fontSize:'var(--text-hero)',maxWidth:820}}>A place to seek, question, and <span style={{background:'var(--rnc-gradient-aurora)',WebkitBackgroundClip:'text',backgroundClip:'text',color:'transparent',fontWeight:600}}>grow in light</span></h1>
        <p style={{maxWidth:560,margin:'22px auto 34px',fontSize:'var(--text-lg)',color:'var(--text-muted)'}}>We explore the Bible and the nature of God through the writings of Emanuel Swedenborg — and we'd love you to join us.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <Button size="lg">Join us this Sunday</Button>
          <Button size="lg" variant="secondary" onClick={()=>onNav('About')}>What we believe</Button>
        </div>
      </div>
    </section>
    <section style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'72px 32px 0'}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:24}}>
        <h2 style={{margin:0,fontSize:'var(--text-h2)'}}>This week</h2>
        <a href="#" onClick={e=>{e.preventDefault();onNav('Events')}} style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:15}}>All events →</a>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
        <Card interactive eyebrow="Sunday · 10am" title="Sunday worship" footer={<Badge tone="gold">Morning tea after</Badge>}>Worship, readings and reflection at 4 Shirley Rd — everyone is welcome.</Card>
        <Card interactive eyebrow="Tuesday · 11am" title="Open discussion" footer={<Badge tone="info">On Zoom</Badge>}>Delve deeper into Swedenborg's writings and relate them to our own lives.</Card>
        <Card interactive eyebrow="Wednesday · 10am" title="Read &amp; reflect" footer={<Badge tone="info">On Zoom</Badge>}>Reading slowly through one of Swedenborg's works, together.</Card>
      </div>
    </section>
    <section style={{maxWidth:'var(--container-max)',margin:'72px auto 0',padding:'0 32px'}}>
      <div style={{background:'var(--rnc-gradient-dusk)',borderRadius:'var(--radius-lg)',padding:'64px 48px',textAlign:'center',color:'var(--text-on-dark)'}}>
        <div style={{color:'var(--rnc-gold-300)',display:'flex',justifyContent:'center',marginBottom:14}}>{sun}</div>
        <p style={{margin:'0 auto',maxWidth:640,fontStyle:'italic',fontSize:26,lineHeight:1.5}}>“All religion relates to life, and the life of religion is to do good.”</p>
        <div style={{marginTop:16,fontFamily:'var(--font-display)',fontSize:13,letterSpacing:'.22em',textTransform:'uppercase',color:'rgba(246,242,251,.6)'}}>Emanuel Swedenborg</div>
      </div>
    </section>
    <section style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'72px 32px 0',display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}}>
      <div>
        <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:13,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--accent-primary)',marginBottom:12}}>Newsletter</div>
        <h2 style={{marginTop:0,fontSize:'var(--text-h2)'}}>News from the church, every month</h2>
        <p style={{color:'var(--text-muted)'}}>Reflections, garden updates, Swedenborg Centre news and what's coming up — straight to your inbox.</p>
      </div>
      <Card variant="tint">
        {sent?<div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:18,color:'var(--status-success)',padding:'18px 0'}}>✦ You're on the list — welcome!</div>:
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Input label="Email address" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          <Button onClick={()=>email&&setSent(true)}>Subscribe</Button>
        </div>}
      </Card>
    </section>
  </main>;
}
window.HomePage = HomePage;