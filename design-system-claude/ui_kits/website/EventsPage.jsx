function EventsPage(){
  const NS = window.RosevilleNewChurchDesignSystem_094ee1;
  const {Tabs,Card,Badge,Button} = NS;
  const [tab,setTab]=React.useState('All');
  const events=[
    {t:'Sunday worship',d:'Sun 26 Jul · 10am',k:'Worship',w:'In person',desc:'Worship, readings and reflection, followed by morning tea in the hall.'},
    {t:'Swedenborg Tuesday: open discussion',d:'Tue 28 Jul · 11am',k:'Study',w:'On Zoom',desc:'Delve a little deeper into concepts in Swedenborg\u2019s writing and relate them to our lives.'},
    {t:'Read and reflect on Swedenborg\u2019s writings',d:'Wed 29 Jul · 10am',k:'Study',w:'On Zoom',desc:'Reading slowly through one of the works of Swedenborg, reflecting as we go.'},
    {t:'Sunday worship',d:'Sun 2 Aug · 10am',k:'Worship',w:'In person',desc:'Worship, readings and reflection, followed by morning tea in the hall.'},
    {t:'Church garden working bee',d:'Sat 8 Aug · 9am',k:'Community',w:'In person',desc:'Help us care for the church garden — tools and morning tea provided.'}
  ];
  const shown=events.filter(e=>tab==='All'||e.k===tab);
  return <main style={{maxWidth:'var(--container-max)',margin:'0 auto',padding:'56px 32px 0'}}>
    <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:13,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--accent-primary)',marginBottom:10}}>✦ What's on</div>
    <h1 style={{marginTop:0,fontSize:'var(--text-h1)'}}>Upcoming events</h1>
    <p style={{color:'var(--text-muted)',marginTop:-6}}>All times are Sydney time (AEST).</p>
    <Tabs tabs={['All','Worship','Study','Community']} active={tab} onChange={setTab} style={{margin:'18px 0 26px'}}/>
    <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:760}}>
      {shown.map((e,i)=><Card key={i} interactive eyebrow={e.d} title={e.t}
        footer={<div style={{display:'flex',gap:10,alignItems:'center'}}><Badge tone={e.w==='On Zoom'?'info':'success'}>{e.w}</Badge>{e.w==='On Zoom'&&<Button size="sm" variant="secondary">Join Zoom</Button>}</div>}>{e.desc}</Card>)}
    </div>
  </main>;
}
window.EventsPage = EventsPage;