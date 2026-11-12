export type OpportunityCategory =
  | "Apprenticeship"
  | "Work experience"
  | "Course"
  | "Entry-level job"
  | "Event"
  | "Support";

export type Opportunity = {
  id: string;
  organisation: string;
  title: string;
  category: OpportunityCategory;
  route: string;
  district: string;
  location: string;
  deadline: string;
  deadlineTone: "soon" | "steady" | "rolling";
  age: string;
  education: string;
  summary: string;
  verified: boolean;
  lastChecked: string;
  source: string;
  tags: string[];
  colour: string;
};

export const districts = [
  "All Warwickshire",
  "North Warwickshire",
  "Nuneaton & Bedworth",
  "Rugby",
  "Warwick",
  "Stratford-on-Avon",
];

export const routeTypes = [
  "All routes",
  "Apprenticeship",
  "University",
  "T Level",
  "Work experience",
  "Employment",
  "Skills & support",
];

export const opportunities: Opportunity[] = [
  {
    id: "wcs-digital",
    organisation: "Warwickshire County Council",
    title: "Digital support apprenticeship",
    category: "Apprenticeship",
    route: "Apprenticeship",
    district: "Warwick",
    location: "Warwick · Hybrid",
    deadline: "Closes 18 Dec",
    deadlineTone: "soon",
    age: "16–24",
    education: "GCSEs or equivalent",
    summary: "Learn how public services work while building practical skills in service design, data and digital support.",
    verified: true,
    lastChecked: "Checked today",
    source: "Warwickshire County Council careers",
    tags: ["Public service", "Digital", "Level 3"],
    colour: "blue",
  },
  {
    id: "jlr-engineering",
    organisation: "JLR",
    title: "Engineering insight week",
    category: "Work experience",
    route: "Work experience",
    district: "Warwick",
    location: "Gaydon · In person",
    deadline: "Apply by 06 Jan",
    deadlineTone: "steady",
    age: "16–18",
    education: "Year 12 or 13",
    summary: "Spend a week with engineering teams, tour the site and try a hands-on design challenge.",
    verified: true,
    lastChecked: "Checked yesterday",
    source: "JLR early careers",
    tags: ["Engineering", "Transport", "Year 12"],
    colour: "amber",
  },
  {
    id: "rsc-creative",
    organisation: "Royal Shakespeare Company",
    title: "Creative careers open afternoon",
    category: "Event",
    route: "Skills & support",
    district: "Stratford-on-Avon",
    location: "Stratford-upon-Avon · In person",
    deadline: "18 Jan · Free",
    deadlineTone: "steady",
    age: "14–19",
    education: "Any education level",
    summary: "Meet people working backstage, on stage and behind the scenes. Bring questions, not a perfect plan.",
    verified: true,
    lastChecked: "Checked 2 days ago",
    source: "RSC learning and participation",
    tags: ["Creative", "Arts", "Free event"],
    colour: "coral",
  },
  {
    id: "rugby-college-tlevel",
    organisation: "Rugby College",
    title: "T Level in Digital Production",
    category: "Course",
    route: "T Level",
    district: "Rugby",
    location: "Rugby · On campus",
    deadline: "Applications open",
    deadlineTone: "rolling",
    age: "16–19",
    education: "GCSEs or equivalent",
    summary: "A two-year technical course with a substantial industry placement and practical digital projects.",
    verified: true,
    lastChecked: "Checked 4 days ago",
    source: "Rugby College course guide",
    tags: ["Digital", "Technical", "Industry placement"],
    colour: "green",
  },
  {
    id: "nuneaton-volunteer",
    organisation: "Nuneaton & Bedworth Youth Service",
    title: "Youth voice volunteer team",
    category: "Support",
    route: "Skills & support",
    district: "Nuneaton & Bedworth",
    location: "Nuneaton · Flexible",
    deadline: "Join any time",
    deadlineTone: "rolling",
    age: "14–21",
    education: "Any education level",
    summary: "Build confidence, shape youth services and gain supported experience in speaking up for your community.",
    verified: true,
    lastChecked: "Checked last week",
    source: "Warwickshire Youth Council",
    tags: ["Confidence", "Leadership", "Supported"],
    colour: "violet",
  },
  {
    id: "northwcs-green",
    organisation: "North Warwickshire Borough Council",
    title: "Green skills taster day",
    category: "Event",
    route: "Skills & support",
    district: "North Warwickshire",
    location: "Atherstone · In person",
    deadline: "22 Feb · Free",
    deadlineTone: "steady",
    age: "15–19",
    education: "Any education level",
    summary: "Try practical activities across retrofit, energy and environmental work with local employers.",
    verified: true,
    lastChecked: "Checked last week",
    source: "North Warwickshire skills partnership",
    tags: ["Green skills", "Employers", "Free event"],
    colour: "green",
  },
];

export const careers = [
  {
    id: "design",
    title: "UX / service designer",
    group: "People + technology",
    description: "Make services easier to use by listening to people and turning insights into better experiences.",
    skills: ["Curiosity", "Communication", "Problem solving"],
    routes: ["Degree", "Apprenticeship", "Portfolio route"],
    accent: "blue",
  },
  {
    id: "health",
    title: "Allied health professional",
    group: "People + care",
    description: "Use science, practical skills and empathy to help people live healthier lives.",
    skills: ["Empathy", "Science", "Teamwork"],
    routes: ["University", "Degree apprenticeship", "College route"],
    accent: "coral",
  },
  {
    id: "engineering",
    title: "Sustainable engineer",
    group: "Making + future",
    description: "Design systems and products that solve real problems while using resources more responsibly.",
    skills: ["Maths", "Design", "Persistence"],
    routes: ["Degree", "Higher apprenticeship", "T Level"],
    accent: "amber",
  },
  {
    id: "community",
    title: "Community project lead",
    group: "People + place",
    description: "Bring people together to turn local ideas into projects that make a visible difference.",
    skills: ["Organisation", "Listening", "Leadership"],
    routes: ["Direct employment", "Volunteering", "Degree"],
    accent: "green",
  },
];

export const applications = [
  { id: "a1", title: "Digital support apprenticeship", organisation: "Warwickshire County Council", status: "Preparing", due: "18 Dec", next: "Review your skills examples" },
  { id: "a2", title: "Engineering insight week", organisation: "JLR", status: "Interested", due: "06 Jan", next: "Ask a teacher for a reference" },
  { id: "a3", title: "T Level in Digital Production", organisation: "Rugby College", status: "Applied", due: "Decision in March", next: "Save the open day date" },
];

export const notifications = [
  { id: "n1", tone: "blue", title: "A new opportunity matches your interests", detail: "Green skills taster day · North Warwickshire", time: "Today" },
  { id: "n2", tone: "amber", title: "Your saved deadline is coming up", detail: "Digital support apprenticeship closes in 8 days", time: "Yesterday" },
  { id: "n3", tone: "green", title: "You completed a pathway step", detail: "You compared university and apprenticeship routes", time: "Mon" },
];

export const supportItems = [
  { title: "Careers advice", description: "Talk through options with a qualified careers adviser.", organisation: "Warwickshire Skills Hub", kind: "Advice" },
  { title: "Mental health and wellbeing", description: "Find confidential support if things feel heavy or uncertain.", organisation: "Kooth and local services", kind: "Wellbeing" },
  { title: "SEND support", description: "Explore reasonable adjustments and specialist guidance.", organisation: "SEND Local Offer", kind: "Access" },
  { title: "Money and student finance", description: "Understand funding, travel and practical costs before you choose a route.", organisation: "National Careers Service", kind: "Practical" },
];
