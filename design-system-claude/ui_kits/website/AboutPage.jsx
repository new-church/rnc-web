function AboutPage(){
  const NS = window.RosevilleNewChurchDesignSystem_094ee1;
  const {Card,Button} = NS;
  return <main style={{maxWidth:'var(--container-prose)',margin:'0 auto',padding:'56px 32px 0'}}>
    <div style={{fontFamily:'var(--font-display)',fontWeight:600,fontSize:13,letterSpacing:'.22em',textTransform:'uppercase',color:'var(--accent-primary)',marginBottom:10}}>✦ About us</div>
    <h1 style={{marginTop:0,fontSize:'var(--text-h1)'}}>An old faith, seen in new light</h1>
    <p style={{fontSize:'var(--text-lg)'}}>The Roseville New Church is a place of worship for those seeking to understand the Bible and the nature of God through the theological writings of Emanuel Swedenborg.</p>
    <p>We worship the Lord Jesus Christ as the one true God, in heaven and on earth. Our aim is to deepen our understanding of His love and wisdom, and to help one another lead joyful and useful lives — in the present and the hereafter.</p>
    <p style={{fontStyle:'italic',fontSize:22,lineHeight:1.5,color:'var(--rnc-violet-700)',borderLeft:'none',margin:'36px 0',textAlign:'center'}}>“Love in its essence is spiritual fire.”</p>
    <p>You don't need to know anything about Swedenborg to visit. Come as you are, ask anything, and stay for morning tea.</p>
    <Card variant="tint" title="Come and see us" style={{marginTop:32}} footer={<Button>Get directions</Button>}>
      Sundays at 10am · 4 Shirley Rd, Roseville NSW 2069 — two minutes' walk from Roseville station.
    </Card>
  </main>;
}
window.AboutPage = AboutPage;