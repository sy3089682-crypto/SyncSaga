import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <main style={{"background":"var(--canvas)","color":"var(--ink)","minHeight":"100vh"}}>
      {/* Hero */}
      <section style={{"minHeight":"90vh","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","padding":"0 1rem","textAlign":"center","position":"relative"}}>
        <div style={{"position":"absolute","inset":0,"background":"radial-gradient(ellipse 60% 50% at 50% 40%, rgba(232,168,64,0.04) 0%, transparent 70%)","pointerEvents":"none"}} />
        <div style={{"position":"relative","zIndex":10,"maxWidth":"36rem","display":"flex","flexDirection":"column","alignItems":"center","gap":"1.5rem"}}>
          <span style={{"fontSize":"0.75rem","color":"var(--amber)","letterSpacing":"0.15em","fontWeight":500,"textTransform":"uppercase"}}>Watch Together</span>
          
          <h1 className="display" style={{"fontSize":"clamp(2.25rem,6vw,3.75rem)","lineHeight":1.05,"letterSpacing":"-0.02em"}}>
            Watch anime with anyone,<br />
            <span style={{"color":"var(--amber)","position":"relative"}}>
              perfectly in sync
            </span>
          </h1>
          
          <p style={{"color":"var(--ink-soft)","maxWidth":"32rem","fontSize":"clamp(0.875rem,2vw,1.0625rem)","letterSpacing":"0.008em","lineHeight":1.65}}>
            No lag, no desync, no solo watching. Join a room, queue your shows, and hear your friends react in real-time — like sitting in the same room.
          </p>
          
          <div style={{"display":"flex","gap":"0.75rem","paddingTop":"0.5rem"}}>
            <Button variant="primary" size="lg" glow>Create a Room</Button>
            <Button variant="ghost" size="lg">See What's Live</Button>
          </div>
          
          <div style={{"display":"flex","alignItems":"center","gap":"0.5rem","paddingTop":"0.5rem"}}>
            <span style={{"position":"relative","display":"flex","width":"10px","height":"10px"}}>
              <span className="animate-sync-pulse" style={{"position":"absolute","width":"100%","height":"100%","borderRadius":"50%","backgroundColor":"var(--amber)","opacity":0.75}} />
              <span style={{"position":"relative","width":"10px","height":"10px","borderRadius":"50%","backgroundColor":"var(--amber)"}} />
            </span>
            <span style={{"fontSize":"0.875rem","color":"var(--ink-soft)"}}>
              23 rooms live now —{' '}
              <a href="/discover" style={{"color":"var(--amber-text)"}}>join the lobby</a>
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{"padding":"6rem 1rem"}}>
        <div style={{"maxWidth":"56rem","margin":"0 auto","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(250px, 1fr))","gap":"1.5rem"}}>
          {[
            { step: '01', title: 'Create or join', body: 'Send a link. Friends show up.' },
            { step: '02', title: 'Sync & watch', body: 'Frame-perfect. Same frame, same time.' },
            { step: '03', title: 'React together', body: 'Voice and reactions — like sitting together.' },
          ].map(({ step, title, body }) => (
            <div key={step} className="card-surface" style={{"padding":"1.25rem","display":"flex","flexDirection":"column","gap":"0.75rem"}}>
              <span style={{"color":"var(--amber)","fontSize":"0.875rem","fontFamily":"JetBrains Mono, monospace","letterSpacing":"0.05em","fontVariantNumeric":"tabular-nums"}}>{step}</span>
              <h3 style={{"fontSize":"1.125rem","fontWeight":500}}>{title}</h3>
              <p style={{"fontSize":"0.875rem","color":"var(--ink-soft)","lineHeight":1.6}}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature details */}
      <section style={{"padding":"5rem 1rem","background":"rgba(255,255,255,0.01)"}}>
        <div style={{"maxWidth":"56rem","margin":"0 auto","display":"flex","flexDirection":"column","gap":"3rem"}}>
          {[
            { title: 'Voice that feels like presence', body: 'Real-time voice with spatial audio — not a conference call, a room.' },
            { title: 'The scrubber is precise', body: '4px track, amber fill. Built for people who notice frame accuracy.' },
            { title: 'Amber accent. Only one.', body: 'One color for active state. No confetti. Just presence.' },
          ].map(({ title, body }) => (
            <div key={title} style={{"maxWidth":"36rem"}}>
              <h2 style={{"fontSize":"1.25rem","fontWeight":500,"marginBottom":"0.5rem"}}>{title}</h2>
              <p style={{"color":"var(--ink-soft)","lineHeight":1.65}}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center" style={{"padding":"8rem 1rem"}}>
        <div style={{"maxWidth":"36rem","margin":"0 auto","display":"flex","flexDirection":"column","alignItems":"center","gap":"1.5rem"}}>
          <h2 className="font-display" style={{"fontSize":"1.875rem","fontWeight":400,"lineHeight":1.15}}>Ready to watch with friends?</h2>
          <p style={{"color":"var(--ant-soft)"}}>No ads, no algorithms. Just anime, shared.</p>
          <Button variant="primary" size="lg" glow>Get Started</Button>
        </div>
      </section>
    </main>
  );
}
