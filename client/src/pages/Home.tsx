import { startLogin } from "@/const";
import { ArrowRight, Compass, HeartHandshake, MapPin, ShieldCheck, Sparkles, Target, Wrench } from "lucide-react";
import { Link } from "wouter";

const intentCards = [
  { icon: Compass, title: "Explore careers", copy: "See what different jobs involve and where they could lead." },
  { icon: Target, title: "Find an opportunity", copy: "Search apprenticeships, courses, events and local experience." },
  { icon: MapPin, title: "Start local", copy: "Find routes and support across Warwickshire." },
  { icon: Wrench, title: "Build my CV", copy: "Turn your skills, interests and experience into a clear story." },
  { icon: Sparkles, title: "Prepare for applications", copy: "Break the next step into smaller, more manageable actions." },
  { icon: HeartHandshake, title: "Get support", copy: "Find trusted organisations if you need advice or someone to talk to." },
];

export default function Home() {
  return (
    <div className="public-page">
      <header className="public-header container-wide">
        <Link href="/" className="brand-lockup" aria-label="Empower18 home">
          <span className="brand-mark"><Compass size={18} strokeWidth={2.5} /></span>
          <span><strong>Empower</strong><b>18</b></span>
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#local">Warwickshire</a>
          <a href="#support">Support</a>
        </nav>
        <div className="public-actions">
          <button className="button button-quiet" onClick={() => startLogin()}>Sign in</button>
          <Link href="/onboarding" className="button button-primary">Start exploring <ArrowRight size={16} /></Link>
        </div>
      </header>

      <main>
        <section className="hero container-wide">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> A clearer next step for Warwickshire</p>
            <h1>You do not need the whole plan today.</h1>
            <p className="hero-lede">Empower18 helps you explore what is possible, understand the routes into it, and take one practical next step toward a future that feels like yours.</p>
            <div className="hero-actions">
              <Link href="/onboarding" className="button button-primary button-large">Find my next step <ArrowRight size={18} /></Link>
              <Link href="/opportunities" className="button button-outline button-large">Browse opportunities</Link>
            </div>
            <div className="trust-line"><ShieldCheck size={16} /> Verified opportunities · Plain English · Built with local support</div>
          </div>
          <div className="hero-map-card" aria-label="Warwickshire opportunity overview">
            <div className="map-orbit orbit-one" />
            <div className="map-orbit orbit-two" />
            <div className="map-spark spark-one" />
            <div className="map-spark spark-two" />
            <div className="map-label label-north">North Warwickshire</div>
            <div className="map-label label-rugby">Rugby</div>
            <div className="map-label label-warwick">Warwick</div>
            <div className="map-label label-stratford">Stratford-on-Avon</div>
            <div className="map-core"><Compass size={28} /><span>Start<br />somewhere</span></div>
            <div className="map-caption"><strong>Local by design</strong><span>Explore routes across the county, then widen your view when you are ready.</span></div>
          </div>
        </section>

        <section className="intent-section container-wide" id="how-it-works">
          <div className="section-intro split-intro">
            <div><p className="eyebrow">Start with what is on your mind</p><h2>What would you like to explore?</h2></div>
            <p>There is no wrong place to begin. Pick the question that feels most useful today.</p>
          </div>
          <div className="intent-grid">
            {intentCards.map(({ icon: Icon, title, copy }) => (
              <Link key={title} href={title === "Find an opportunity" ? "/opportunities" : title === "Explore careers" ? "/careers" : title === "Get support" ? "/support" : "/onboarding"} className="intent-card">
                <span className="icon-tile"><Icon size={19} /></span>
                <span className="intent-title">{title}</span>
                <span className="intent-copy">{copy}</span>
                <ArrowRight size={16} className="intent-arrow" />
              </Link>
            ))}
          </div>
        </section>

        <section className="local-band" id="local">
          <div className="container-wide local-band-inner">
            <div><p className="eyebrow">Built around where you are</p><h2>Local knowledge. Wider possibilities.</h2><p>Start with employers, colleges, support organisations and opportunities close to home across all five Warwickshire districts.</p></div>
            <div className="district-list">{["North Warwickshire", "Nuneaton & Bedworth", "Rugby", "Warwick", "Stratford-on-Avon"].map((district, index) => <span key={district} className={index === 3 ? "district-chip active" : "district-chip"}>{district}</span>)}</div>
          </div>
        </section>

        <section className="steps-section container-wide">
          <div className="section-intro"><p className="eyebrow">A useful rhythm</p><h2>Discover → prepare → take your next step.</h2></div>
          <div className="steps-row">
            {[{ n: "01", t: "Discover", c: "Get a clearer picture of careers, routes and opportunities that fit your interests." }, { n: "02", t: "Prepare", c: "Build confidence with practical tools, resources and support matched to where you are." }, { n: "03", t: "Move forward", c: "Save what matters, track your progress and always know the next small action." }].map(step => <div className="step-card" key={step.n}><span className="step-number">{step.n}</span><h3>{step.t}</h3><p>{step.c}</p></div>)}
          </div>
        </section>

        <section className="support-strip" id="support">
          <div className="container-wide support-strip-inner"><span className="support-icon"><HeartHandshake size={20} /></span><div><strong>You are allowed to ask for help.</strong><span>Empower18 points you to specialist organisations when you need advice, wellbeing support or safeguarding help.</span></div><Link href="/support" className="button button-outline">See support options <ArrowRight size={16} /></Link></div>
        </section>
      </main>

      <footer className="public-footer container-wide"><div className="brand-lockup"><span className="brand-mark"><Compass size={17} /></span><span><strong>Empower</strong><b>18</b></span></div><span>For young people finding a future that feels possible.</span><div className="footer-links"><a href="#support">Support</a><a href="#local">Warwickshire</a><a href="/privacy">Privacy</a></div></footer>
    </div>
  );
}
