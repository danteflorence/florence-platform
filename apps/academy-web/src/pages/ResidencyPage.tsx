import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApplyProgramsCta } from "../components/ApplyProgramsCta";
import {
  Badge as FlorenceBadge,
  Button,
  Card as FlorenceCard,
  DataTable,
  StatusPill,
  buttonClassName,
  type FlorenceTone,
} from "@florence/design-system";
import {
  ApiError,
  fetchResidencies,
  requestResidencySeat,
  storedCandidate,
  type AcademyCamp,
  type AcademyResidency,
  type CampReservation,
} from "../lib/academyAuth";

const residencyRows = [
  { label: "Access", value: "Reserved separately", tone: "warning" as const },
  { label: "Capacity", value: "Limited in-person seats", tone: "neutral" as const },
  { label: "Academy", value: "$1,000 product is not unlimited residency access", tone: "primary" as const },
];

function locationLabel(location: AcademyResidency["location"]): string {
  return location === "manila" ? "Manila" : "Los Angeles";
}

function statusTone(status: CampReservation["status"] | undefined): FlorenceTone {
  if (status === "confirmed") return "success";
  if (status === "waitlisted" || status === "requested") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function dateRange(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
  return `${fmt.format(new Date(start))} - ${fmt.format(new Date(end))}`;
}

export default function ResidencyPage() {
  const [residencies, setResidencies] = useState<AcademyResidency[]>([]);
  const [reservations, setReservations] = useState<Record<string, CampReservation>>({});
  const [busyCamp, setBusyCamp] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const candidate = storedCandidate();

  useEffect(() => {
    let alive = true;
    void fetchResidencies().then((data) => {
      if (!alive) return;
      setResidencies(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function reserveSeat(camp: AcademyCamp): Promise<void> {
    if (!candidate) {
      setMessage("Sign in or create an account before requesting a residency seat.");
      return;
    }
    setBusyCamp(camp.id);
    setMessage("");
    try {
      const reservation = await requestResidencySeat(camp.id);
      setReservations((current) => ({ ...current, [camp.id]: reservation }));
      setMessage(`Seat request is ${reservation.status}. Ops can confirm, waitlist, cancel, or mark attendance.`);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not request this seat.");
    } finally {
      setBusyCamp(null);
    }
  }

  const campRows = residencies.flatMap((residency) =>
    residency.camps.map((camp) => ({
      residency,
      camp,
      reservation: reservations[camp.id],
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <FlorenceBadge tone="accent">Residency</FlorenceBadge>
      <div className="mt-4 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <section>
          <h1 className="text-3xl font-semibold text-florence-ink sm:text-4xl">
            Academy Live residency seats are reserved.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-florence-slate">
            Manila and Los Angeles in-person events are capacity-limited. The
            Academy product does not include unlimited in-person attendance, so
            each residency camp has a separate seat request and waitlist.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/academy/grants" className={buttonClassName({ variant: "secondary", size: "lg" })}>
              Access Grants
            </Link>
            <Link to="/learn" className={buttonClassName({ variant: "ghost", size: "lg" })}>
              Return to Academy
            </Link>
          </div>
          <ApplyProgramsCta placement="residency_page" compact className="mt-5 max-w-2xl" />
        </section>

        <FlorenceCard title="Residency reserve rules" className="p-5">
          <div className="space-y-3">
            {residencyRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 border-b border-florence-line pb-3 last:border-0 last:pb-0">
                <span className="text-sm font-medium text-florence-slate">{row.label}</span>
                <StatusPill tone={row.tone}>{row.value}</StatusPill>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-florence-slate">
            Manila residencies are quarterly four-week blocks with morning and
            evening camps. Each camp carries 20 contact hours and a capped seat
            count of 50, 75, or 100.
          </p>
        </FlorenceCard>
      </div>

      <FlorenceCard
        title="Available camps"
        subtitle={loading ? "Loading residency schedule." : "Choose one camp at a time."}
        className="mt-8 p-5"
      >
        <DataTable
          rows={campRows}
          empty="Residency schedule will appear here when the API is connected."
          getRowKey={(row) => row.camp.id}
          columns={[
            {
              id: "residency",
              header: "Residency",
              render: (row) => (
                <div>
                  <div className="font-medium text-florence-ink">{locationLabel(row.residency.location)}</div>
                  <div className="text-xs text-florence-slate">{row.residency.quarter}</div>
                </div>
              ),
            },
            {
              id: "camp",
              header: "Camp",
              render: (row) => (
                <div>
                  <div className="font-medium text-florence-ink">{row.camp.name}</div>
                  <div className="text-xs capitalize text-florence-slate">
                    {row.camp.camp_option} - {dateRange(row.camp.starts_at, row.camp.ends_at)}
                  </div>
                </div>
              ),
            },
            { id: "hours", header: "Hours", render: (row) => `${row.camp.contact_hours} contact` },
            {
              id: "seats",
              header: "Seats",
              render: (row) => `${row.camp.seats_remaining ?? row.camp.seat_capacity} of ${row.camp.seat_capacity}`,
            },
            {
              id: "status",
              header: "Status",
              render: (row) => (
                <StatusPill tone={statusTone(row.reservation?.status)}>
                  {row.reservation?.status ?? "open"}
                </StatusPill>
              ),
            },
            {
              id: "action",
              header: "",
              align: "right",
              render: (row) => (
                <Button
                  type="button"
                  size="sm"
                  variant="accent"
                  disabled={Boolean(row.reservation) || busyCamp === row.camp.id}
                  onClick={() => void reserveSeat(row.camp)}
                >
                  {busyCamp === row.camp.id ? "Requesting" : "Request seat"}
                </Button>
              ),
            },
          ]}
        />
        {message && <p className="mt-4 text-sm text-florence-slate">{message}</p>}
        {!candidate && (
          <p className="mt-3 text-sm text-florence-slate">
            <Link to="/signup" className="font-semibold text-florence-purple">Create an account</Link> to request a seat.
          </p>
        )}
      </FlorenceCard>
    </div>
  );
}
