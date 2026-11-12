import { ArrowLeft, ArrowRight, Check, Compass, LockKeyhole, MapPin } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const steps = ["About you", "What interests you", "Routes to explore", "Your next step"];
const interests = ["People & care", "Technology", "Making & design", "Business", "Nature & environment", "Creative work", "Public service", "Not sure yet"];
const routes = ["Apprenticeship", "University", "T Level", "College or training", "Work experience", "Direct employment"];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [district, setDistrict] = useState("Warwick");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);

  const toggle = (value: string, setValues: (values: string[]) => void, values: string[]) => setValues(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  const canContinue = step === 0 ? name.trim().length > 1 && age.length > 0 : step === 1 ? selectedInterests.length > 0 : step === 2 ? selectedRoutes.length > 0 : true;

  return <div className="onboarding-page">
    <header className="onboarding-header container-narrow"><Link href="/" className="brand-lockup"><span className="brand-mark"><Compass size={18} /></span><span><strong>Empower</strong><b>18</b></span></Link><span className="onboarding-save"><LockKeyhole size={14} /> Your answers stay yours</span></header>
    <main className="onboarding-main container-narrow">
      <div className="onboarding-progress"><div className="progress-line"><span style={{ width: `${(step / (steps.length - 1)) * 100}%` }} /></div><div className="progress-labels">{steps.map((item, index) => <span className={index <= step ? "current" : ""} key={item}><i>{index < step ? <Check size={12} /> : index + 1}</i>{item}</span>)}</div></div>
      <div className="onboarding-card">
        {step === 0 && <><p className="eyebrow">A little context helps</p><h1>Let’s start with where you are.</h1><p className="onboarding-lede">You can change these details later. We only ask for what helps us make the next screen more useful.</p><label className="field-label" htmlFor="name">What should we call you?</label><input id="name" className="text-input" placeholder="Your first name" value={name} onChange={event => setName(event.target.value)} /><label className="field-label" htmlFor="age">Which age group are you in?</label><select id="age" className="text-input" value={age} onChange={event => setAge(event.target.value)}><option value="">Choose one</option><option>14–15</option><option>16–17</option><option>18+</option><option>Prefer not to say</option></select><label className="field-label" htmlFor="district">Where are you based?</label><div className="input-with-icon"><MapPin size={17} /><select id="district" className="text-input" value={district} onChange={event => setDistrict(event.target.value)}><option>North Warwickshire</option><option>Nuneaton & Bedworth</option><option>Rugby</option><option>Warwick</option><option>Stratford-on-Avon</option><option>Outside Warwickshire</option><option>Prefer not to say</option></select></div><p className="field-hint">We use this to show opportunities close to you. We do not show your postcode publicly.</p></>}
        {step === 1 && <><p className="eyebrow">There is no perfect answer</p><h1>What are you curious about?</h1><p className="onboarding-lede">Choose anything that sounds interesting. “Not sure yet” is a useful answer too.</p><div className="choice-grid">{interests.map(item => <button className={selectedInterests.includes(item) ? "choice-chip selected" : "choice-chip"} key={item} onClick={() => toggle(item, setSelectedInterests, selectedInterests)}>{selectedInterests.includes(item) && <Check size={15} />}{item}</button>)}</div><p className="field-hint">Pick at least one so we can shape your starting recommendations.</p></>}
        {step === 2 && <><p className="eyebrow">Keep your options open</p><h1>Which routes would you like to understand?</h1><p className="onboarding-lede">You do not have to choose one today. We can help you compare them.</p><div className="choice-stack">{routes.map(item => <button className={selectedRoutes.includes(item) ? "route-option selected" : "route-option"} key={item} onClick={() => toggle(item, setSelectedRoutes, selectedRoutes)}><span className="route-check">{selectedRoutes.includes(item) ? <Check size={16} /> : null}</span><span><strong>{item}</strong><small>{item === "Apprenticeship" ? "Learn and earn with an employer." : item === "University" ? "Study a subject in more depth." : item === "T Level" ? "Technical study with an industry placement." : item === "Direct employment" ? "Start work and build experience as you go." : "A practical route with support and experience."}</small></span></button>)}</div></>}
        {step === 3 && <><div className="completion-mark"><Check size={28} /></div><p className="eyebrow">A good place to begin</p><h1>You have a starting point, {name || "there"}.</h1><p className="onboarding-lede">We’ll use what you shared to make your dashboard more relevant. Nothing is locked in, and your direction can change.</p><div className="summary-panel"><div><span>Based in</span><strong>{district}</strong></div><div><span>Curious about</span><strong>{selectedInterests.join(", ") || "A few different things"}</strong></div><div><span>Routes to compare</span><strong>{selectedRoutes.join(", ") || "A few routes"}</strong></div></div><p className="field-hint">This is a prototype view. Real recommendations will only be shown once listings have been checked.</p></>}
        <div className="onboarding-actions">{step > 0 ? <button className="button button-quiet" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button> : <Link className="button button-quiet" href="/"><ArrowLeft size={16} /> Exit</Link>}{step < steps.length - 1 ? <button className="button button-primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></button> : <button className="button button-primary" onClick={() => setLocation("/dashboard")}>See my starting point <ArrowRight size={16} /></button>}</div>
      </div>
    </main>
  </div>;
}
