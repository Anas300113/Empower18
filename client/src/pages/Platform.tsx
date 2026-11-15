import { useAuth } from "@/_core/hooks/useAuth";
import { careers, notifications, supportItems } from "@/data";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  ExternalLink,
  FileText,
  Filter,
  HeartHandshake,
  Home,
  Info,
  ListChecks,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/opportunities", label: "Explore", icon: Compass },
  { href: "/careers", label: "Careers", icon: Target },
  { href: "/applications", label: "Applications", icon: ListChecks },
  { href: "/tools", label: "Tools", icon: Wrench },
];

function Brand() {
  return (
    <Link href="/dashboard" className="brand-lockup">
      <span className="brand-mark">
        <Compass size={18} />
      </span>
      <span>
        <strong>Empower</strong>
        <b>18</b>
      </span>
    </Link>
  );
}

function PlatformShell({
  children,
  title,
  eyebrow,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
}) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const activePath = location.startsWith("/opportunities")
    ? "/opportunities"
    : location;
  return (
    <div className="platform-page">
      <header className="platform-header">
        <div className="container-wide platform-header-inner">
          <button
            className="mobile-menu-button"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenu}
            aria-controls="mobile-menu"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={20} />
          </button>
          <Brand />
          <nav className="platform-nav" aria-label="Platform navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    activePath === item.href
                      ? "platform-nav-link active"
                      : "platform-nav-link"
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="platform-header-actions">
            <Link
              href="/notifications"
              className="icon-button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </Link>
            <Link href="/support" className="support-link">
              <HeartHandshake size={16} /> Support
            </Link>
            <button
              className="avatar-button"
              aria-label="Open profile menu"
              onClick={() => setLocation("/settings")}
            >
              {(user as any)?.name?.slice(0, 1) || "A"}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div id="mobile-menu" className="mobile-menu">
            <div className="container-wide">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenu(false)}
                  className={
                    activePath === item.href
                      ? "mobile-menu-link active"
                      : "mobile-menu-link"
                  }
                >
                  {item.label}
                  <ArrowRight size={16} />
                </Link>
              ))}
              <Link href="/notifications" className="mobile-menu-link">
                Notifications
                <ArrowRight size={16} />
              </Link>
              <Link href="/settings" className="mobile-menu-link">
                Settings
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </header>
      <div className="demo-banner">
        <div className="container-wide">
          <Info size={15} />
          <span>
            <strong>Prototype data:</strong> opportunity details are sample
            content until connected to verified sources.
          </span>
          <Link href="/admin">View content controls</Link>
        </div>
      </div>
      <main
        id="main-content"
        tabIndex={-1}
        className="platform-main container-wide"
      >
        <div className="page-heading">
          <div>
            <p className="eyebrow">{eyebrow || "Empower18"}</p>
            <h1>{title}</h1>
          </div>
          <div className="page-heading-actions">
            <Link
              href="/notifications"
              className="icon-button"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              <span className="sr-only">Notifications</span>
            </Link>
            <button
              className="button button-quiet desktop-only"
              onClick={() =>
                logout().catch(() =>
                  toast.error("We couldn't sign you out yet.")
                )
              }
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
        {children}
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map(item => {
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              key={item.href}
              className={
                activePath === item.href
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link href="/settings" className="mobile-nav-item">
          <MoreHorizontal size={19} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

function SectionHeader({
  title,
  link,
  href,
}: {
  title: string;
  link?: string;
  href?: string;
}) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {link && href && (
        <Link href={href} className="text-link">
          {link} <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

function StatusPill({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`status-pill ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

type OpportunityApiItem = {
  id: string;
  title: string;
  description: string;
  summary: string | null;
  type: string;
  status: string;
  location: string | null;
  district: string | null;
  deliveryMethod: string | null;
  isRemoteEligible: boolean;
  minAge: number | null;
  maxAge: number | null;
  educationRequirements: string | null;
  qualificationRequirements: string | null;
  requiredSkills: string[];
  compensationText: string | null;
  applicationInstructions: string | null;
  applicationDeadlineAt: string | Date | null;
  externalApplicationUrl: string | null;
  canonicalUrl: string | null;
  verifiedAt: string | Date | null;
  verificationEvidence: string | null;
  nextReviewAt: string | Date | null;
  sourceName: string | null;
  sourceOfficialUrl: string | null;
  sourceReliability: string | null;
  sourceLastChecked: string | Date | null;
  organisationName: string | null;
  organisationWebsite: string | null;
};

function formatDate(
  value: string | Date | null | undefined,
  fallback = "Not supplied"
) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

function ageLabel(item: OpportunityApiItem) {
  if (item.minAge && item.maxAge) return `${item.minAge}–${item.maxAge}`;
  if (item.minAge) return `${item.minAge}+`;
  if (item.maxAge) return `Up to ${item.maxAge}`;
  return "Age requirements not supplied";
}

function opportunityTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function isClosingSoon(value: string | Date | null) {
  if (!value) return false;
  const time = new Date(value).getTime() - Date.now();
  return time >= 0 && time < 1000 * 60 * 60 * 24 * 14;
}

function OpportunityRow({
  opportunity,
  saved,
  onSave,
  compact = false,
}: {
  opportunity: OpportunityApiItem;
  saved: boolean;
  onSave: () => void;
  compact?: boolean;
}) {
  const deadline = opportunity.applicationDeadlineAt
    ? `Closes ${formatDate(opportunity.applicationDeadlineAt)}`
    : "Rolling application";
  return (
    <div className={compact ? "opportunity-row compact" : "opportunity-row"}>
      <div className="opportunity-logo blue">
        {(opportunity.organisationName || "?").slice(0, 1)}
      </div>
      <div className="opportunity-main">
        <div className="opportunity-topline">
          <span className="opportunity-org">
            {opportunity.organisationName || "Organisation not supplied"}
          </span>
          <span className="verified-label">
            <ShieldCheck size={13} /> Verified source
          </span>
        </div>
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="opportunity-title"
        >
          {opportunity.title}
        </Link>
        <div className="opportunity-meta">
          <span>{opportunityTypeLabel(opportunity.type)}</span>
          <span>
            {opportunity.district ||
              opportunity.location ||
              (opportunity.isRemoteEligible
                ? "Remote"
                : "Location not supplied")}
          </span>
          <span>{ageLabel(opportunity)}</span>
        </div>
        {!compact && <p>{opportunity.summary || opportunity.description}</p>}
      </div>
      <div className="opportunity-side">
        <StatusPill
          tone={
            isClosingSoon(opportunity.applicationDeadlineAt) ? "amber" : "green"
          }
        >
          {deadline}
        </StatusPill>
        <small>
          Checked {formatDate(opportunity.sourceLastChecked, "not yet checked")}
        </small>
        <div className="row-actions">
          <button
            className={saved ? "icon-button saved" : "icon-button"}
            aria-label={saved ? "Remove saved opportunity" : "Save opportunity"}
            onClick={onSave}
          >
            {saved ? "★" : "☆"}
          </button>
          <Link
            href={`/opportunities/${opportunity.id}`}
            className="icon-button"
            aria-label="Open opportunity"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const opportunitiesQuery = trpc.opportunities.list.useQuery({
    page: 1,
    pageSize: 2,
    sort: "newest",
  });
  const savedQuery = trpc.opportunities.savedList.useQuery(undefined, {
    enabled: Boolean(user),
  });
  return (
    <PlatformShell title="Good morning, Alex" eyebrow="Your starting point">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Your next step</p>
          <h2>Find an opportunity worth a closer look.</h2>
          <p>
            Browse verified opportunities from organisations and sources that
            have been checked by the Empower18 team.
          </p>
          <div className="inline-actions">
            <Link href="/opportunities" className="button button-primary">
              Explore opportunities <ArrowRight size={16} />
            </Link>
            <Link href="/careers" className="button button-outline">
              Compare routes <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="next-step-orbit">
          <div className="orbit-ring ring-large" />
          <div className="orbit-ring ring-small" />
          <span className="orbit-centre">
            <Compass size={24} />
          </span>
          <span className="orbit-note">
            real listings
            <br />
            <strong>checked first</strong>
          </span>
        </div>
      </section>
      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Saved opportunities</span>
          <strong>{savedQuery.data?.length ?? 0}</strong>
          <Link href="/opportunities" className="stat-link">
            Keep exploring <ArrowRight size={14} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-label">Published opportunities</span>
          <strong>{opportunitiesQuery.data?.total ?? 0}</strong>
          <Link href="/opportunities" className="stat-link">
            View catalogue <ArrowRight size={14} />
          </Link>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pathway clarity</span>
          <strong className="stat-word">Building</strong>
          <span className="stat-helper">Keep asking questions.</span>
        </div>
      </section>
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <SectionHeader
            title="Recently published"
            link="See all"
            href="/opportunities"
          />
          {opportunitiesQuery.isLoading && (
            <p className="field-hint">Loading verified opportunities…</p>
          )}
          {opportunitiesQuery.isError && (
            <p className="field-hint">
              We could not load opportunities yet. Try Explore again shortly.
            </p>
          )}
          {opportunitiesQuery.data?.items.map(item => (
            <OpportunityRow
              key={item.id}
              opportunity={item as OpportunityApiItem}
              saved={Boolean(
                savedQuery.data?.some(saved => saved.opportunityId === item.id)
              )}
              onSave={() => undefined}
            />
          ))}
          {!opportunitiesQuery.isLoading &&
            opportunitiesQuery.data?.items.length === 0 && (
              <div className="empty-state">
                <Compass size={28} />
                <h3>The verified catalogue is being built.</h3>
                <p>
                  There are no published opportunities matching this view yet.
                </p>
              </div>
            )}
        </div>
        <aside className="dashboard-column side-column">
          <div className="panel support-panel">
            <span className="support-icon">
              <HeartHandshake size={19} />
            </span>
            <p className="eyebrow">You can ask for help</p>
            <h3>Not sure what to do next?</h3>
            <p>
              Talk through options with a trusted organisation. You do not need
              to have the right words ready.
            </p>
            <Link href="/support" className="button button-outline">
              Find support <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </PlatformShell>
  );
}

export function Explore() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState<string | undefined>();
  const [route, setRoute] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [page, setPage] = useState(1);
  const filters = trpc.opportunities.filters.useQuery();
  const query = trpc.opportunities.list.useQuery({
    search: search || undefined,
    district: district as never,
    route: route as never,
    category,
    page,
    pageSize: 20,
    sort: "closing_soonest",
  });
  const saved = trpc.opportunities.savedList.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const utils = trpc.useUtils();
  const save = trpc.opportunities.save.useMutation({
    onSuccess: () => utils.opportunities.savedList.invalidate(),
  });
  const unsave = trpc.opportunities.unsave.useMutation({
    onSuccess: () => utils.opportunities.savedList.invalidate(),
  });
  const toggleSave = (id: string, currentlySaved: boolean) => {
    if (!user) {
      toast.error("Sign in to save opportunities.");
      return;
    }
    (currentlySaved ? unsave : save).mutate({ opportunityId: id });
  };
  const clearFilters = () => {
    setSearch("");
    setDistrict(undefined);
    setRoute(undefined);
    setCategory(undefined);
    setPage(1);
  };
  return (
    <PlatformShell
      title="Explore opportunities"
      eyebrow="Find something worth a closer look"
    >
      <div className="explore-intro">
        <p>
          Apprenticeships, work experience, courses, events and support across
          Warwickshire. Published listings show where they came from and when
          they were last checked.
        </p>
        <Link href="/careers" className="button button-outline">
          Explore career routes <ArrowRight size={16} />
        </Link>
      </div>
      <div className="marketplace-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            placeholder="Search by role, organisation or skill"
            aria-label="Search opportunities"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <kbd>⌘ K</kbd>
        </div>
        <button
          className="filter-button"
          onClick={() => document.getElementById("where-filter")?.focus()}
          aria-label="Jump to opportunity filters"
        >
          <Filter size={16} /> Filters
        </button>
      </div>
      <div id="opportunity-filters" className="filter-row">
        <label>
          <span>Where</span>
          <select
            id="where-filter"
            value={district || ""}
            onChange={event => {
              setDistrict(event.target.value || undefined);
              setPage(1);
            }}
          >
            <option value="">All Warwickshire</option>
            {filters.data?.districts.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Route</span>
          <select
            value={route || ""}
            onChange={event => {
              setRoute(event.target.value || undefined);
              setPage(1);
            }}
          >
            <option value="">All routes</option>
            {filters.data?.routes.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select
            value={category || ""}
            onChange={event => {
              setCategory(event.target.value || undefined);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {filters.data?.categories.map(item => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="switch-label">
          <span>Verified listings only</span>
          <button
            className={verifiedOnly ? "switch on" : "switch"}
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            aria-pressed={verifiedOnly}
            aria-label="Show verified listings only"
          >
            <span />
          </button>
        </label>
        <button className="sort-button" aria-label="Sort opportunities">
          Closing soonest <ChevronDown size={14} />
        </button>
      </div>
      <div className="marketplace-summary">
        <span>
          <strong>{query.data?.total ?? 0}</strong> published opportunities
        </span>
        <span className="summary-note">
          <ShieldCheck size={14} /> Verification evidence is recorded before
          publishing
        </span>
      </div>
      {query.isLoading && (
        <div className="empty-state">
          <Search size={28} />
          <h3>Loading verified opportunities…</h3>
          <p>Checking the latest published catalogue.</p>
        </div>
      )}
      {query.isError && (
        <div className="empty-state">
          <Search size={28} />
          <h3>We could not load opportunities.</h3>
          <p>Try again in a moment.</p>
          <button
            className="button button-outline"
            onClick={() => query.refetch()}
          >
            Retry
          </button>
        </div>
      )}
      {!query.isLoading && !query.isError && (
        <div className="opportunity-list">
          {query.data?.items
            .filter(item => !verifiedOnly || item.verificationEvidence)
            .map(item => {
              const isSaved = Boolean(
                saved.data?.some(
                  savedItem => savedItem.opportunityId === item.id
                )
              );
              return (
                <OpportunityRow
                  key={item.id}
                  opportunity={item as OpportunityApiItem}
                  saved={isSaved}
                  onSave={() => toggleSave(item.id, isSaved)}
                />
              );
            })}
          {query.data?.items.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>The verified catalogue is empty for this search.</h3>
              <p>
                Try widening your filters or check back after the next content
                review.
              </p>
              <button className="button button-outline" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
      {(query.data?.total ?? 0) > 20 && (
        <div className="inline-actions">
          <button
            className="button button-outline"
            disabled={page === 1}
            onClick={() => setPage(current => current - 1)}
          >
            Previous
          </button>
          <span className="field-hint">Page {page}</span>
          <button
            className="button button-outline"
            disabled={page * 20 >= (query.data?.total ?? 0)}
            onClick={() => setPage(current => current + 1)}
          >
            Next
          </button>
        </div>
      )}
      <div className="marketplace-footnote">
        <Info size={15} />
        <span>
          Always open the original organisation link before applying. Empower18
          does not submit applications for you.
        </span>
      </div>
    </PlatformShell>
  );
}

export function OpportunityDetail({ id }: { id?: string }) {
  const { user } = useAuth();
  const query = trpc.opportunities.getById.useQuery(
    { id: id || "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(id) }
  );
  const saved = trpc.opportunities.isSaved.useQuery(
    { opportunityId: id || "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(user && id) }
  );
  const utils = trpc.useUtils();
  const save = trpc.opportunities.save.useMutation({
    onSuccess: () => utils.opportunities.isSaved.invalidate(),
  });
  const unsave = trpc.opportunities.unsave.useMutation({
    onSuccess: () => utils.opportunities.isSaved.invalidate(),
  });
  const track = trpc.applications.create.useMutation({
    onSuccess: () => {
      utils.applications.list.invalidate();
      toast.success("Added to your private application tracker.");
    },
    onError: error => toast.error(error.message),
  });
  const opportunity = query.data as OpportunityApiItem | null | undefined;
  if (query.isLoading)
    return (
      <PlatformShell
        title="Opportunity details"
        eyebrow="Explore · Opportunity"
      >
        <p className="field-hint">Loading the verified opportunity…</p>
      </PlatformShell>
    );
  if (query.isError || !opportunity)
    return (
      <PlatformShell
        title="Opportunity unavailable"
        eyebrow="Explore · Opportunity"
      >
        <div className="empty-state">
          <Search size={28} />
          <h3>This opportunity is no longer published.</h3>
          <p>It may have expired, been paused or been returned for review.</p>
          <Link href="/opportunities" className="button button-outline">
            Back to opportunities
          </Link>
        </div>
      </PlatformShell>
    );
  const currentSaved = Boolean(saved.data);
  return (
    <PlatformShell title="Opportunity details" eyebrow="Explore · Opportunity">
      <Link href="/opportunities" className="back-link">
        <ArrowLeft size={15} /> Back to opportunities
      </Link>
      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-hero blue">
            <div className="detail-logo">
              {(opportunity.organisationName || "?").slice(0, 1)}
            </div>
            <div>
              <span className="opportunity-org">
                {opportunity.organisationName || "Organisation not supplied"}
              </span>
              <h2>{opportunity.title}</h2>
              <div className="detail-tags">
                <span>{opportunityTypeLabel(opportunity.type)}</span>
                <span>
                  {opportunity.district ||
                    opportunity.location ||
                    "Location not supplied"}
                </span>
              </div>
            </div>
          </div>
          <div className="detail-body">
            <div className="detail-section">
              <h3>What you could do</h3>
              <p>{opportunity.description}</p>
            </div>
            <div className="detail-section">
              <h3>Who it could suit</h3>
              <ul className="check-list">
                <li>
                  <Check size={16} /> {ageLabel(opportunity)}
                </li>
                {opportunity.educationRequirements && (
                  <li>
                    <Check size={16} /> {opportunity.educationRequirements}
                  </li>
                )}
                {opportunity.qualificationRequirements && (
                  <li>
                    <Check size={16} /> {opportunity.qualificationRequirements}
                  </li>
                )}
              </ul>
            </div>
            {opportunity.requiredSkills.length > 0 && (
              <div className="detail-section">
                <h3>Skills and experience</h3>
                <p>{opportunity.requiredSkills.join(" · ")}</p>
              </div>
            )}
            {opportunity.compensationText && (
              <div className="detail-section">
                <h3>Compensation</h3>
                <p>{opportunity.compensationText}</p>
              </div>
            )}
            {opportunity.applicationInstructions && (
              <div className="detail-section">
                <h3>Application information</h3>
                <p>{opportunity.applicationInstructions}</p>
              </div>
            )}
          </div>
        </article>
        <aside className="detail-side">
          <div className="panel detail-facts">
            <StatusPill
              tone={
                isClosingSoon(opportunity.applicationDeadlineAt)
                  ? "amber"
                  : "green"
              }
            >
              {opportunity.applicationDeadlineAt
                ? `Closes ${formatDate(opportunity.applicationDeadlineAt)}`
                : "Rolling application"}
            </StatusPill>
            <div className="fact">
              <MapPin size={16} />
              <span>
                <small>Location</small>
                <strong>
                  {opportunity.location ||
                    (opportunity.isRemoteEligible
                      ? "Remote eligible"
                      : "Not supplied")}
                </strong>
              </span>
            </div>
            <div className="fact">
              <CalendarDays size={16} />
              <span>
                <small>Last checked</small>
                <strong>
                  {formatDate(opportunity.sourceLastChecked, "Not supplied")}
                </strong>
              </span>
            </div>
            <div className="fact">
              <ShieldCheck size={16} />
              <span>
                <small>Verification</small>
                <strong>Verified {formatDate(opportunity.verifiedAt)}</strong>
              </span>
            </div>
            {opportunity.externalApplicationUrl && (
              <a
                className="button button-primary full-width"
                href={opportunity.externalApplicationUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> View official application page
              </a>
            )}
            <button
              className="button button-outline full-width"
              disabled={track.isPending}
              onClick={() => {
                if (!user) {
                  toast.error("Sign in to track an opportunity.");
                  return;
                }
                track.mutate({ opportunityId: opportunity.id });
              }}
            >
              <ListChecks size={16} />{" "}
              {track.isPending ? "Adding…" : "Track application"}
            </button>
            <button
              className={
                currentSaved
                  ? "button button-outline full-width saved-action"
                  : "button button-outline full-width"
              }
              onClick={() => {
                if (!user) {
                  toast.error("Sign in to save opportunities.");
                  return;
                }
                (currentSaved ? unsave : save).mutate({
                  opportunityId: opportunity.id,
                });
              }}
            >
              {currentSaved ? <Check size={16} /> : "☆"}{" "}
              {currentSaved ? "Saved to your list" : "Save opportunity"}
            </button>
            <span className="field-hint">
              If you visit an external site, your application remains your
              responsibility. Empower18 does not submit it.
            </span>
            <span className="field-hint">
              Listing reports are not available yet. Please contact support if
              something needs checking.
            </span>
          </div>
          <div className="panel source-panel">
            <p className="eyebrow">Source</p>
            <strong>{opportunity.sourceName || "Source not supplied"}</strong>
            <small>
              {opportunity.sourceReliability === "healthy"
                ? "Source is currently marked healthy."
                : "Source reliability is not marked healthy; publication should be reviewed."}
            </small>
            {opportunity.sourceOfficialUrl && (
              <a
                className="text-link"
                href={opportunity.sourceOfficialUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open source website <ExternalLink size={14} />
              </a>
            )}
          </div>
        </aside>
      </div>
    </PlatformShell>
  );
}

export function Careers() {
  const [selected, setSelected] = useState("design");
  const chosen = careers.find(item => item.id === selected) || careers[0];
  return (
    <PlatformShell title="Career explorer" eyebrow="Understand what could fit">
      <div className="explorer-hero">
        <div>
          <p className="eyebrow">You can start with a question</p>
          <h2>What kind of work would feel worth doing?</h2>
          <p>
            Explore a few starting points, then compare the routes, skills and
            experiences that could lead there.
          </p>
        </div>
        <div className="explorer-orbit">
          <span>curiosity</span>
          <span>skills</span>
          <span>routes</span>
          <span>experience</span>
          <Compass size={24} />
        </div>
      </div>
      <div className="career-layout">
        <div>
          <SectionHeader
            title="Starting points"
            link="Take the interest quiz"
            href="/onboarding"
          />
          <div className="career-grid">
            {careers.map(career => (
              <button
                key={career.id}
                className={
                  selected === career.id
                    ? `career-card selected ${career.accent}`
                    : `career-card ${career.accent}`
                }
                onClick={() => setSelected(career.id)}
              >
                <span className="career-card-top">
                  <span className="icon-tile">
                    <Target size={18} />
                  </span>
                  <span className="career-group">{career.group}</span>
                </span>
                <h3>{career.title}</h3>
                <p>{career.description}</p>
                <span className="career-card-footer">
                  Explore pathway <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </div>
        <aside className="pathway-panel">
          <p className="eyebrow">Your selected pathway</p>
          <h2>{chosen.title}</h2>
          <p>{chosen.description}</p>
          <div className="pathway-block">
            <span>Skills to build</span>
            <div className="mini-chip-row">
              {chosen.skills.map(skill => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </div>
          <div className="pathway-block">
            <span>Possible routes</span>
            <ul>
              {chosen.routes.map((route, index) => (
                <li key={route}>
                  <i>{index + 1}</i>
                  {route}
                  <ArrowRight size={14} />
                </li>
              ))}
            </ul>
          </div>
          <div className="pathway-block">
            <span>A useful next action</span>
            <p className="next-action">
              <Sparkles size={15} /> Find one local opportunity where you can
              try a related skill.
            </p>
          </div>
          <Link
            href="/opportunities"
            className="button button-primary full-width"
          >
            Find related opportunities <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </PlatformShell>
  );
}

export function Applications() {
  const applications = trpc.applications.list.useQuery();
  const utils = trpc.useUtils();
  const updateStage = trpc.applications.updateStage.useMutation({
    onSuccess: () => {
      utils.applications.list.invalidate();
      toast.success("Application stage updated.");
    },
    onError: error => toast.error(error.message),
  });
  const stages = [
    "interested",
    "started",
    "submitted",
    "under_review",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ] as const;
  const activeCount =
    applications.data?.filter(
      item => !["offer", "rejected", "withdrawn"].includes(item.stage)
    ).length ?? 0;
  return (
    <PlatformShell
      title="My applications"
      eyebrow="Keep your next steps together"
    >
      <div className="tracker-summary">
        <div>
          <span className="eyebrow">Moving forward</span>
          <strong>{activeCount}</strong>
          <small>applications with a next action</small>
        </div>
        <div>
          <span className="eyebrow">Privacy</span>
          <strong className="stat-word">Private</strong>
          <small>Only you can view this tracker.</small>
        </div>
        <Link href="/opportunities" className="button button-primary">
          Find an opportunity <ArrowRight size={16} />
        </Link>
      </div>
      {applications.isLoading && (
        <p className="field-hint">Loading your application tracker…</p>
      )}
      {applications.isError && (
        <div className="empty-state">
          <Info size={24} />
          <h3>We could not load your tracker.</h3>
          <p>Try again in a moment.</p>
          <button
            className="button button-outline"
            onClick={() => applications.refetch()}
          >
            Retry
          </button>
        </div>
      )}
      {applications.data?.length === 0 && (
        <div className="empty-state">
          <ListChecks size={28} />
          <h3>Your tracker is ready when you are.</h3>
          <p>
            Open a verified opportunity and choose “Track application” to keep
            your next steps together.
          </p>
          <Link href="/opportunities" className="button button-primary">
            Explore opportunities <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {applications.data && applications.data.length > 0 && (
        <div className="tracker-list">
          {applications.data.map(item => (
            <div className="tracker-row" key={item.id}>
              <div className="tracker-step">
                <span className={`tracker-dot ${item.stage}`} />
                <span className="tracker-line" />
              </div>
              <div className="tracker-main">
                <div className="tracker-heading">
                  <div>
                    <h3>{item.opportunity.title}</h3>
                    <p>
                      {item.opportunity.location || "Location not supplied"}
                    </p>
                  </div>
                  <select
                    aria-label={`Stage for ${item.opportunity.title}`}
                    value={item.stage}
                    disabled={updateStage.isPending}
                    onChange={event =>
                      updateStage.mutate({
                        applicationId: item.id,
                        stage: event.target.value as (typeof stages)[number],
                      })
                    }
                  >
                    {stages.map(stage => (
                      <option key={stage} value={stage}>
                        {stage.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="tracker-meta">
                  <span>
                    <CalendarDays size={14} />{" "}
                    {item.opportunity.applicationDeadlineAt
                      ? `Closes ${formatDate(item.opportunity.applicationDeadlineAt)}`
                      : "No closing date supplied"}
                  </span>
                  {item.opportunity.externalApplicationUrl && (
                    <a
                      className="text-link"
                      href={item.opportunity.externalApplicationUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open official application <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                {item.notes && <p className="field-hint">{item.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="tracker-note">
        <Info size={16} />
        <span>
          Your tracker is private. Empower18 never contacts an organisation or
          submits an application for you.
        </span>
      </div>
    </PlatformShell>
  );
}

export function Tools() {
  const tools = [
    {
      icon: FileText,
      title: "CV builder",
      copy: "Create a clear CV from the experiences and skills you already have.",
      cta: "Build a CV",
      tone: "blue",
    },
    {
      icon: MessageCircle,
      title: "Application helper",
      copy: "Understand questions, find your examples and structure your answers.",
      cta: "Prepare an answer",
      tone: "amber",
    },
    {
      icon: UsersRound,
      title: "Interview practice",
      copy: "Try common questions and practise saying your ideas out loud.",
      cta: "Practise",
      tone: "green",
    },
    {
      icon: Sparkles,
      title: "UCAS / personal statement",
      copy: "Gather ideas and shape your own words with editable guidance.",
      cta: "Start planning",
      tone: "coral",
    },
  ];
  return (
    <PlatformShell
      title="Preparation tools"
      eyebrow="Build confidence, one piece at a time"
    >
      <div className="tools-note">
        <Sparkles size={17} />
        <span>
          <strong>Responsible AI, by design.</strong> Suggestions stay editable,
          your own experiences stay central, and we never invent qualifications
          or achievements.
        </span>
      </div>
      <div className="tool-grid">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <div className={`tool-card ${tool.tone}`} key={tool.title}>
              <span className="tool-icon">
                <Icon size={21} />
              </span>
              <h2>{tool.title}</h2>
              <p>{tool.copy}</p>
              <button
                className="button button-outline"
                onClick={() =>
                  toast.info(
                    `${tool.title} is ready for your content in the next step.`
                  )
                }
              >
                {tool.cta} <ArrowRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <SectionHeader
        title="Guides worth keeping"
        link="See the learning centre"
        href="/support"
      />
      <div className="resource-row">
        <div>
          <span className="resource-tag">GUIDE</span>
          <h3>How to find examples of your skills</h3>
          <p>Small moments from school, home, hobbies and work all count.</p>
        </div>
        <div>
          <span className="resource-tag">CHECKLIST</span>
          <h3>Before you press submit</h3>
          <p>A calm final check for details, evidence and deadlines.</p>
        </div>
        <div>
          <span className="resource-tag">VIDEO</span>
          <h3>What an apprenticeship is really like</h3>
          <p>Hear from people who started in different ways.</p>
        </div>
      </div>
    </PlatformShell>
  );
}

export function NotificationsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weekly, setWeekly] = useState(true);
  return (
    <PlatformShell
      title="Notifications"
      eyebrow="Stay informed, not overwhelmed"
    >
      <div className="notification-layout">
        <div className="notification-list">
          {notifications.map(item => (
            <div className="notification-card" key={item.id}>
              <span className={`notification-icon ${item.tone}`}>
                <Bell size={17} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <small>{item.time}</small>
              </div>
              <button className="icon-button" aria-label="Dismiss notification">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <aside className="panel preference-panel">
          <p className="eyebrow">Your preferences</p>
          <h2>Choose what is useful.</h2>
          <p>
            We will only send reminders that help you act on something you chose
            to follow.
          </p>
          <PreferenceRow
            label="New opportunities that match me"
            on={emailAlerts}
            onToggle={() => setEmailAlerts(!emailAlerts)}
          />
          <PreferenceRow
            label="Closing-date reminders"
            on={true}
            onToggle={() => undefined}
          />
          <PreferenceRow
            label="Weekly opportunity digest"
            on={weekly}
            onToggle={() => setWeekly(!weekly)}
          />
          <PreferenceRow
            label="Events and programme reminders"
            on={false}
            onToggle={() => undefined}
          />
          <Link href="/settings" className="text-link">
            Manage privacy and consent <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </PlatformShell>
  );
}

function PreferenceRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="preference-row">
      <span>{label}</span>
      <button
        className={on ? "switch on" : "switch"}
        onClick={onToggle}
        aria-pressed={on}
        aria-label={`${label}: ${on ? "on" : "off"}`}
      >
        <span />
      </button>
    </div>
  );
}

export function Support() {
  return (
    <PlatformShell
      title="Support and signposting"
      eyebrow="You do not have to work it out alone"
    >
      <div className="support-intro">
        <div>
          <h2>Find the right kind of help.</h2>
          <p>
            Empower18 does not replace specialist services. These organisations
            can give you advice, practical support or someone to talk to.
          </p>
        </div>
        <div className="safeguarding-badge">
          <ShieldCheck size={19} />
          <span>
            <strong>Your safety matters</strong>
            <small>
              If you feel unsafe or worried about someone, speak to a trusted
              adult or use the report link below.
            </small>
          </span>
        </div>
      </div>
      <div className="support-grid">
        {supportItems.map(item => (
          <div className="support-card" key={item.title}>
            <span className="support-card-tag">{item.kind}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <strong>{item.organisation}</strong>
            <button
              className="text-link"
              onClick={() =>
                toast.info(
                  "This link will connect to the organisation's verified support page."
                )
              }
            >
              View support options <ExternalLink size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="safeguarding-panel">
        <div className="support-icon">
          <ShieldCheck size={21} />
        </div>
        <div>
          <p className="eyebrow">Safeguarding and reporting</p>
          <h2>Something does not feel right?</h2>
          <p>
            Report an incorrect listing, a concern about a message or a problem
            with the platform. A trained team member should review it under the
            programme’s safeguarding arrangements.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() =>
            toast.success(
              "Report form opened — your details will only be used to respond."
            )
          }
        >
          Report a concern <ArrowRight size={16} />
        </button>
      </div>
    </PlatformShell>
  );
}

export function Settings() {
  const [highContrast, setHighContrast] = useState(false);
  const [adjustments, setAdjustments] = useState(false);
  return (
    <PlatformShell title="Settings" eyebrow="Your account, your choices">
      <div className="settings-layout">
        <div className="settings-nav">
          <button className="active">Profile</button>
          <button>Notifications</button>
          <button>Privacy and consent</button>
          <button>Accessibility</button>
          <button>Account</button>
        </div>
        <div className="settings-content">
          <section className="settings-section">
            <p className="eyebrow">Profile</p>
            <h2>About you</h2>
            <div className="settings-fields">
              <label>
                <span>First name</span>
                <input value="Alex" readOnly />
              </label>
              <label>
                <span>Location</span>
                <select defaultValue="Warwick">
                  <option>Warwick</option>
                  <option>Rugby</option>
                  <option>Stratford-on-Avon</option>
                </select>
              </label>
              <label>
                <span>Education level</span>
                <select defaultValue="Sixth form / college">
                  <option>School</option>
                  <option>Sixth form / college</option>
                  <option>University</option>
                  <option>Not currently studying</option>
                </select>
              </label>
            </div>
            <button
              className="button button-primary"
              onClick={() => toast.success("Profile changes saved.")}
            >
              Save changes <Check size={16} />
            </button>
          </section>
          <section className="settings-section">
            <p className="eyebrow">Accessibility</p>
            <h2>Make Empower18 work better for you.</h2>
            <PreferenceRow
              label="High contrast mode"
              on={highContrast}
              onToggle={() => setHighContrast(!highContrast)}
            />
            <PreferenceRow
              label="I may need reasonable adjustments"
              on={adjustments}
              onToggle={() => setAdjustments(!adjustments)}
            />
            <p className="field-hint">
              You can tell us more about what would help without sharing
              anything you do not want to.
            </p>
          </section>
          <section className="settings-section danger-section">
            <p className="eyebrow">Account controls</p>
            <h2>Privacy and account</h2>
            <div className="settings-link-row">
              <LockKeyhole size={18} />
              <span>
                <strong>Privacy and consent</strong>
                <small>Review what we store and why.</small>
              </span>
              <ArrowRight size={16} />
            </div>
            <div className="settings-link-row">
              <UserRound size={18} />
              <span>
                <strong>Download your data</strong>
                <small>Request a copy of your profile and tracker.</small>
              </span>
              <ArrowRight size={16} />
            </div>
            <div className="settings-link-row">
              <LogOut size={18} />
              <span>
                <strong>Close your account</strong>
                <small>Remove your profile and saved work.</small>
              </span>
              <ArrowRight size={16} />
            </div>
          </section>
        </div>
      </div>
    </PlatformShell>
  );
}

export function Admin() {
  const [status, setStatus] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("apprenticeship");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<
    "manual" | "api" | "rss" | "web_scrape" | "email_parse"
  >("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const dashboard = trpc.admin.dashboard.useQuery();
  const list = trpc.admin.opportunities.list.useQuery({
    status: status as never,
    page: 1,
    pageSize: 50,
  });
  const sources = trpc.admin.sources.list.useQuery();
  const organisations = trpc.admin.organisations.list.useQuery();
  const audit = trpc.admin.audit.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();
  const refreshAdmin = () => {
    utils.admin.opportunities.list.invalidate();
    utils.admin.dashboard.invalidate();
    utils.admin.sources.list.invalidate();
    utils.admin.organisations.list.invalidate();
    utils.admin.audit.list.invalidate();
  };
  const resetDraft = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setType("apprenticeship");
  };
  const createDraft = trpc.admin.opportunities.createDraft.useMutation({
    onSuccess: () => {
      resetDraft();
      refreshAdmin();
      toast.success("Draft created.");
    },
    onError: error => toast.error(error.message),
  });
  const updateDraft = trpc.admin.opportunities.updateDraft.useMutation({
    onSuccess: () => {
      resetDraft();
      refreshAdmin();
      toast.success("Draft updated.");
    },
    onError: error => toast.error(error.message),
  });
  const transition = trpc.admin.opportunities.approveAndPublish.useMutation({
    onSuccess: () => {
      utils.admin.opportunities.list.invalidate();
      utils.admin.dashboard.invalidate();
      toast.success("Opportunity published after verification checks.");
    },
    onError: error => toast.error(error.message),
  });
  const returnForChanges =
    trpc.admin.opportunities.returnForChanges.useMutation({
      onSuccess: () => {
        utils.admin.opportunities.list.invalidate();
        utils.admin.dashboard.invalidate();
        toast.success("Opportunity returned for changes.");
      },
      onError: error => toast.error(error.message),
    });
  const close = trpc.admin.opportunities.close.useMutation({
    onSuccess: () => {
      utils.admin.opportunities.list.invalidate();
      utils.admin.dashboard.invalidate();
      toast.success("Opportunity closed.");
    },
    onError: error => toast.error(error.message),
  });
  const createSource = trpc.admin.sources.create.useMutation({
    onSuccess: () => {
      setSourceName("");
      setSourceUrl("");
      refreshAdmin();
      toast.success("Source added to the registry.");
    },
    onError: error => toast.error(error.message),
  });
  const updateSource = trpc.admin.sources.update.useMutation({
    onSuccess: () => {
      refreshAdmin();
      toast.success("Source status updated.");
    },
    onError: error => toast.error(error.message),
  });
  const createOrganisation = trpc.admin.organisations.create.useMutation({
    onSuccess: () => {
      setOrganisationName("");
      refreshAdmin();
      toast.success("Organisation added.");
    },
    onError: error => toast.error(error.message),
  });
  const saveDraft = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { title, description, type: type as never };
    if (editingId) updateDraft.mutate({ id: editingId, changes: payload });
    else
      createDraft.mutate({
        ...payload,
        isRemoteEligible: false,
        requiredSkills: [],
      });
  };
  const auditActorLabel = (actorUserId: string | null) =>
    actorUserId ? actorUserId.slice(0, 8) : "deleted user";
  const beginEdit = (item: {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
  }) => {
    if (!["draft", "pending_review", "paused"].includes(item.status)) return;
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setType(item.type);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PlatformShell title="Content controls" eyebrow="Admin operations">
      <div className="admin-banner">
        <ShieldCheck size={20} />
        <div>
          <strong>Verification before visibility</strong>
          <p>
            Only records with a source, evidence, eligibility and review date
            can be published.
          </p>
        </div>
      </div>
      {dashboard.isError && (
        <div className="empty-state">
          <h3>Administrator access required.</h3>
          <p>{dashboard.error.message}</p>
        </div>
      )}
      {dashboard.data && (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">Drafts</span>
              <strong>{dashboard.data.drafts}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending review</span>
              <strong>{dashboard.data.pendingReview}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Published</span>
              <strong>{dashboard.data.published}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Overdue review</span>
              <strong>{dashboard.data.overdue}</strong>
            </div>
          </div>
          <div className="admin-grid">
            <div className="panel admin-panel">
              <div className="section-header">
                <h2>{editingId ? "Edit draft" : "Create draft"}</h2>
                {editingId && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={resetDraft}
                  >
                    Cancel editing
                  </button>
                )}
              </div>
              <form className="settings-fields" onSubmit={saveDraft}>
                <label>
                  <span>Title</span>
                  <input
                    required
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                  />
                </label>
                <label>
                  <span>Type</span>
                  <select
                    value={type}
                    onChange={event => setType(event.target.value)}
                  >
                    <option value="apprenticeship">Apprenticeship</option>
                    <option value="internship">Internship</option>
                    <option value="traineeship">Traineeship</option>
                    <option value="work_experience">Work experience</option>
                    <option value="part_time">Part-time</option>
                    <option value="full_time">Full-time</option>
                    <option value="volunteering">Volunteering</option>
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Description</span>
                  <textarea
                    required
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                    rows={5}
                  />
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={createDraft.isPending || updateDraft.isPending}
                >
                  {editingId ? "Save draft" : "Create draft"}
                </button>
              </form>
            </div>
            <div className="panel admin-panel">
              <div className="section-header">
                <h2>Opportunity queue</h2>
                <select
                  aria-label="Filter opportunity status"
                  value={status || ""}
                  onChange={event => setStatus(event.target.value || undefined)}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending review</option>
                  <option value="published">Published</option>
                  <option value="paused">Paused</option>
                  <option value="expired">Expired</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {list.isLoading && (
                <p className="field-hint">Loading content queue…</p>
              )}
              {list.data?.map(item => (
                <div className="admin-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.organisationName || "Organisation not supplied"} ·{" "}
                      {item.status}
                    </small>
                  </div>
                  <span className="admin-state">
                    {item.status.replaceAll("_", " ")}
                  </span>
                  <div className="row-actions">
                    {["draft", "pending_review", "paused"].includes(
                      item.status
                    ) && (
                      <button
                        className="button button-outline"
                        onClick={() => beginEdit(item)}
                      >
                        Edit
                      </button>
                    )}
                    {item.status === "pending_review" && (
                      <>
                        <button
                          className="button button-outline"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Publish this opportunity after confirming its source and evidence?"
                              )
                            )
                              transition.mutate({ id: item.id });
                          }}
                        >
                          Publish
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Return ${item.title} for changes`}
                          onClick={() =>
                            returnForChanges.mutate({
                              id: item.id,
                              reason:
                                "Please complete the verification review.",
                            })
                          }
                        >
                          <ArrowLeft size={16} />
                        </button>
                      </>
                    )}
                    {item.status === "published" && (
                      <button
                        className="icon-button"
                        aria-label={`Close ${item.title}`}
                        onClick={() => {
                          if (window.confirm("Close this opportunity?"))
                            close.mutate({
                              id: item.id,
                              reason: "Closed by administrator.",
                            });
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!list.isLoading && list.data?.length === 0 && (
                <div className="empty-state">
                  <Info size={24} />
                  <h3>No records in this queue.</h3>
                  <p>
                    Create a draft when you have a real source and content to
                    review.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="admin-grid">
            <div className="panel admin-panel">
              <div className="section-header">
                <h2>Source registry</h2>
                <span className="field-hint">
                  Deactivate a source to pause its published listings.
                </span>
              </div>
              <form
                className="settings-fields"
                onSubmit={event => {
                  event.preventDefault();
                  createSource.mutate({
                    name: sourceName,
                    type: sourceType,
                    officialUrl: sourceUrl || null,
                  });
                }}
              >
                <label>
                  <span>Source name</span>
                  <input
                    required
                    value={sourceName}
                    onChange={event => setSourceName(event.target.value)}
                  />
                </label>
                <label>
                  <span>Source type</span>
                  <select
                    value={sourceType}
                    onChange={event =>
                      setSourceType(event.target.value as typeof sourceType)
                    }
                  >
                    <option value="manual">Manual</option>
                    <option value="api">API</option>
                    <option value="rss">RSS</option>
                    <option value="email_parse">Email</option>
                    <option value="web_scrape">Web retrieval</option>
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <span>Official URL</span>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={event => setSourceUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </label>
                <button
                  className="button button-outline"
                  type="submit"
                  disabled={createSource.isPending}
                >
                  Add source
                </button>
              </form>
              {sources.data?.map(source => (
                <div className="admin-row" key={source.id}>
                  <div>
                    <strong>{source.name}</strong>
                    <small>
                      {source.type} · {source.reliabilityStatus}
                    </small>
                  </div>
                  <span className="admin-state">
                    {source.isActive ? "active" : "inactive"}
                  </span>
                  <button
                    className="button button-outline"
                    disabled={updateSource.isPending}
                    onClick={() => {
                      const action = source.isActive
                        ? "deactivate"
                        : "activate";
                      if (
                        window.confirm(
                          `${action[0].toUpperCase()}${action.slice(1)} ${source.name}?`
                        )
                      )
                        updateSource.mutate({
                          id: source.id,
                          changes: { isActive: !source.isActive },
                        });
                    }}
                  >
                    {source.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
            <div className="panel admin-panel">
              <div className="section-header">
                <h2>Organisation registry</h2>
                <span className="field-hint">
                  Link organisations to opportunity records during content
                  review.
                </span>
              </div>
              <form
                className="settings-fields"
                onSubmit={event => {
                  event.preventDefault();
                  createOrganisation.mutate({ name: organisationName });
                }}
              >
                <label>
                  <span>Organisation name</span>
                  <input
                    required
                    value={organisationName}
                    onChange={event => setOrganisationName(event.target.value)}
                  />
                </label>
                <div className="inline-actions" style={{ alignItems: "end" }}>
                  <button
                    className="button button-outline"
                    type="submit"
                    disabled={createOrganisation.isPending}
                  >
                    Add organisation
                  </button>
                </div>
              </form>
              {organisations.data?.map(organisation => (
                <div className="admin-row" key={organisation.id}>
                  <div>
                    <strong>{organisation.name}</strong>
                    <small>
                      {organisation.type || "Type not supplied"} ·{" "}
                      {organisation.location || "Location not supplied"}
                    </small>
                  </div>
                  <span className="admin-state">
                    {organisation.isVerified ? "verified" : "unverified"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <section className="panel admin-panel">
            <div className="section-header">
              <h2>Recent audit history</h2>
              <span className="field-hint">
                Administrative changes are retained with their actor and time.
              </span>
            </div>
            {audit.isLoading && (
              <p className="field-hint">Loading audit history…</p>
            )}
            {audit.data?.map(entry => (
              <div className="admin-row" key={entry.id}>
                <div>
                  <strong>{entry.action.replaceAll(".", " ")}</strong>
                  <small>
                    {entry.targetType} · {formatDate(entry.createdAt)}
                  </small>
                </div>
                <span className="admin-state">
                  {auditActorLabel(entry.actorUserId)}
                </span>
              </div>
            ))}
            {audit.data?.length === 0 && (
              <p className="field-hint">
                No administrative actions have been recorded yet.
              </p>
            )}
          </section>
        </>
      )}
    </PlatformShell>
  );
}
