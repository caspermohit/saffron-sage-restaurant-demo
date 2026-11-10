"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  LayoutDashboard,
  Armchair,
  ChefHat,
  UtensilsCrossed,
  Bell,
  Search,
  ArrowUpRight,
  ArrowRight,
  CircleHelp,
  LogOut,
  QrCode,
  Leaf,
  SlidersHorizontal,
  Check,
  Star,
  Wallet,
  Users,
  ReceiptText,
  Download,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  staffSchema,
  StaffState,
  DiningTable,
  money,
  age,
  ApiError,
} from "@/lib/api";
import { Brand, Busy, ErrorBox, Empty, Modal } from "./ui";
import { Kitchen } from "./kitchen";
import { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-config";
type View =
  "Overview" | "Floor plan" | "Kitchen" | "Menu" | "Payments" | "Reviews";
const views = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Floor plan", icon: Armchair },
  { name: "Kitchen", icon: ChefHat },
  { name: "Menu", icon: UtensilsCrossed },
  { name: "Payments", icon: Wallet },
  { name: "Reviews", icon: Star },
] satisfies { name: View; icon: typeof ChefHat }[];
export function Workspace() {
  const [token, setToken] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [data, setData] = useState<StaffState | null>(null),
    [view, setView] = useState<View>("Overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [zone, setZone] = useState("All areas"),
    [selected, setSelected] = useState<DiningTable | null>(null),
    [qr, setQr] = useState<DiningTable | null>(null),
    [help, setHelp] = useState(false),
    [working, setWorking] = useState(false);
  useEffect(() => {
    setToken(sessionStorage.getItem("saffron-staff"));
    setReady(true);
  }, []);
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setData(staffSchema.parse(await api("/staff/state", { staff: token })));
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        sessionStorage.removeItem("saffron-staff");
        setToken(null);
        setData(null);
      }
      setError(
        e instanceof Error ? e.message : "Unable to load the workspace.",
      );
    }
  }, [token]);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);
  async function action(path: string, method = "POST", body?: unknown) {
    if (!token) return;
    setWorking(true);
    try {
      await api(path, { staff: token, method, body });
      await refresh();
      setNotice("All set. Your workspace is up to date.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  }
  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(id);
    }
  }, [notice]);
  if (!ready) return <Busy />;
  if (!token)
    return (
      <Login
        onLogin={(value) => {
          sessionStorage.setItem("saffron-staff", value);
          setToken(value);
        }}
      />
    );
  const occupied = data?.tables.filter((t) => t.session_id).length || 0;
  const tables =
    data?.tables.filter(
      (t) =>
        (zone === "All areas" || t.zone === zone) &&
        t.name.toLowerCase().includes(query.toLowerCase()),
    ) || [];
  const current = selected && data?.tables.find((t) => t.id === selected.id);
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <div className="location">
          <span className="location-avatar">S</span>
          <div>
            <b>Downtown restaurant</b>
            <small>Toronto, ON</small>
          </div>
          <span className="open-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {views.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              onClick={() => {
                setView(name);
                setQuery("");
              }}
            >
              <Icon size={19} />
              {name}
              {name === "Kitchen" &&
                !!data?.orders.filter((o) => o.status !== "served").length && (
                  <span className="nav-count">
                    {data.orders.filter((o) => o.status !== "served").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="hospitality">
            <Leaf size={20} />
            <b>More time for hospitality.</b>
            <p>Let the little things take care of themselves.</p>
            <button onClick={() => setHelp(true)}>
              Explore your workspace <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> Help & getting started
          </button>
          <div className="profile">
            <span>AM</span>
            <div>
              <b>Alex Morgan</b>
              <small>Restaurant manager</small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await api("/staff/logout", { method: "POST", staff: token });
                } finally {
                  sessionStorage.removeItem("saffron-staff");
                  setToken(null);
                  setData(null);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <b>{view}</b>
          </div>
          <div className="topbar-right">
            <span className="live">
              <span /> Live service
            </span>
            <button
              className="icon-button"
              aria-label="Refresh workspace"
              onClick={refresh}
            >
              <RefreshCw size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="View service requests"
              onClick={() => {
                setView("Floor plan");
                setZone("All areas");
              }}
            >
              <Bell size={19} />
              {!!data?.calls.length && <sup>{data.calls.length}</sup>}
            </button>
            <span className="avatar-small">AM</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                A LITTLE LESS WAITING. A LOT MORE HOSPITALITY.
              </p>
              <h1>
                {view === "Overview"
                  ? "A good day starts here."
                  : view === "Floor plan"
                    ? "Every table, in view."
                    : view === "Kitchen"
                      ? "Fresh from the kitchen."
                      : view === "Menu"
                        ? "Made to be enjoyed."
                        : view === "Payments"
                          ? "The finishing touches."
                          : "A little guest love."}
              </h1>
              <p>
                {view === "Overview"
                  ? "Your dining room at a glance. Let’s make every guest feel at home."
                  : view === "Floor plan"
                    ? "Keep the service flowing, one table at a time."
                    : view === "Kitchen"
                      ? "New orders arrive here automatically. Keep everyone in the loop."
                      : view === "Menu"
                        ? "Manage what’s available on your guests’ menu."
                        : view === "Payments"
                          ? "Confirm payments only after you’ve received the funds."
                          : "Thoughts from the people around your tables."}
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => setQr(data?.tables[0] || null)}
            >
              <QrCode size={17} /> Table QR codes
            </button>
          </div>
          {error && <ErrorBox message={error} />}{" "}
          {notice && (
            <div className="toast" role="status">
              <Check size={18} />
              {notice}
            </div>
          )}
          {!data ? (
            <Busy />
          ) : (
            <>
              {view === "Overview" && (
                <>
                  <div className="stats-grid">
                    <Metric
                      label="Today’s revenue"
                      value={money(data.stats.revenue, data.currency)}
                      caption="Confirmed payments"
                      icon={<Wallet size={20} />}
                      tone="green"
                    />
                    <Metric
                      label="Tables in service"
                      value={`${occupied}`}
                      suffix={`/ ${data.tables.length}`}
                      caption={`${data.tables.length - occupied} tables ready to welcome`}
                      icon={<Armchair size={20} />}
                      tone="orange"
                    />
                    <Metric
                      label="Orders today"
                      value={`${data.stats.orders}`}
                      caption={`${data.orders.filter((o) => o.status !== "served").length} being taken care of`}
                      icon={<ReceiptText size={20} />}
                      tone="blue"
                    />
                    <Metric
                      label="Guest happiness"
                      value={data.stats.rating ? `${data.stats.rating}` : "—"}
                      suffix="/ 5"
                      caption={`${data.reviews.length} recent guest reviews`}
                      icon={<Star size={20} />}
                      tone="rose"
                    />
                  </div>
                  <div className="service-banner">
                    <div className="banner-symbol">
                      <UtensilsCrossed size={26} />
                    </div>
                    <div>
                      <h2>Good food. Thoughtful service. Happy guests.</h2>
                      <p>Your team and your tables, beautifully in sync.</p>
                    </div>
                    <button onClick={() => setView("Kitchen")}>
                      Open kitchen display <ArrowUpRight size={18} />
                    </button>
                    <span className="banner-leaf">
                      <Leaf size={100} />
                    </span>
                  </div>
                </>
              )}
              {(view === "Overview" || view === "Floor plan") && (
                <div className="floor-layout">
                  <section className="panel floor-panel">
                    <header className="section-heading">
                      <div>
                        <h2>
                          On the floor{" "}
                          <span className="count-pill">
                            {data.tables.length} tables
                          </span>
                        </h2>
                        <p>A little attention makes all the difference.</p>
                      </div>
                      <div className="legend">
                        <span>
                          <i className="available" />
                          Available
                        </span>
                        <span>
                          <i className="occupied" />
                          In service
                        </span>
                        <span>
                          <i className="attention" />
                          Needs attention
                        </span>
                      </div>
                    </header>
                    <div className="floor-tools">
                      <div className="tabs">
                        {["All areas", "Main dining", "Terrace"].map((v) => (
                          <button
                            key={v}
                            className={zone === v ? "selected" : ""}
                            onClick={() => setZone(v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <label className="search">
                        <Search size={16} />
                        <input
                          aria-label="Find a table"
                          placeholder="Find a table…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="floor-grid">
                      {tables.map((t) => (
                        <button
                          key={t.id}
                          className={`table-tile ${t.calls.length ? "needs-attention" : t.session_id ? "in-service" : "free"}`}
                          onClick={() => setSelected(t)}
                        >
                          <div className="table-tile-top">
                            <span>
                              {t.zone === "Terrace" ? "TERRACE" : "MAIN DINING"}
                            </span>
                            <span>
                              <Users size={12} /> {t.seats}
                            </span>
                          </div>
                          <div className="table-drawing">
                            <span className="chair chair-top" />
                            <span className="chair chair-left" />
                            <div>
                              <Armchair size={20} />
                              <b>{t.name.replace("Table ", "")}</b>
                            </div>
                            <span className="chair chair-right" />
                            <span className="chair chair-bottom" />
                          </div>
                          <b>{t.name}</b>
                          <span className="table-status">
                            {t.calls.length ? (
                              <>
                                <Bell size={12} /> Guest requested{" "}
                                {t.calls[0]?.kind}
                              </>
                            ) : t.session_id ? (
                              `${t.orders.length} order${t.orders.length === 1 ? "" : "s"} · ${money(t.bill?.total || 0, data.currency)}`
                            ) : (
                              "Ready for guests"
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    {!tables.length && (
                      <Empty
                        title="No tables found"
                        description="Try another table number or dining area."
                      />
                    )}
                    <footer className="floor-footer">
                      <span>
                        <span className="live-dot" /> Updates automatically
                        every 5 seconds
                      </span>
                      <button onClick={() => setView("Floor plan")}>
                        View full floor plan <ArrowRight size={15} />
                      </button>
                    </footer>
                  </section>
                  <aside className="right-stack">
                    <section className="panel requests-panel">
                      <header className="section-heading">
                        <h2>
                          Service requests{" "}
                          <span className="count-pill warm">
                            {data.calls.length}
                          </span>
                        </h2>
                        <Bell size={18} />
                      </header>
                      {data.calls.length ? (
                        data.calls.map((c) => (
                          <div className="request" key={c.id}>
                            <span className="request-icon">
                              <Bell size={17} />
                            </span>
                            <div>
                              <b>
                                {data.tables.find(
                                  (t) => t.session_id === c.table_session_id,
                                )?.name || "Table"}
                              </b>
                              <p>
                                {c.kind === "waiter"
                                  ? "A guest would like assistance"
                                  : c.kind === "water"
                                    ? "A little more water, please"
                                    : "Ready for the bill"}
                              </p>
                              <small>{age(c.created_at)}</small>
                            </div>
                            <button
                              disabled={working}
                              aria-label={`Resolve request ${c.id}`}
                              className="icon-button"
                              onClick={() =>
                                action(`/staff/calls/${c.id}/resolve`)
                              }
                            >
                              <Check size={17} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <Empty
                          title="Everyone’s taken care of"
                          description="Guest requests will appear here."
                        />
                      )}
                    </section>
                    <section className="panel kitchen-preview">
                      <header className="section-heading">
                        <h2>In the kitchen</h2>
                        <ChefHat size={18} />
                      </header>
                      <div className="kitchen-numbers">
                        <div>
                          <b>
                            {
                              data.orders.filter((o) => o.status === "new")
                                .length
                            }
                          </b>
                          <span>New</span>
                        </div>
                        <div>
                          <b>
                            {
                              data.orders.filter(
                                (o) => o.status === "preparing",
                              ).length
                            }
                          </b>
                          <span>Cooking</span>
                        </div>
                        <div>
                          <b>
                            {
                              data.orders.filter((o) => o.status === "ready")
                                .length
                            }
                          </b>
                          <span>Ready</span>
                        </div>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => setView("Kitchen")}
                      >
                        See all orders <ArrowRight size={15} />
                      </button>
                    </section>
                    <div className="quote">
                      <span>“</span>
                      <p>
                        Hospitality is simply an opportunity to show love and
                        care.
                      </p>
                      <small>IT’S THE LITTLE THINGS.</small>
                    </div>
                  </aside>
                </div>
              )}
              {view === "Kitchen" && (
                <Kitchen
                  orders={data.orders}
                  currency={data.currency}
                  working={working}
                  onStatus={(id, status) =>
                    action(`/staff/orders/${id}`, "PATCH", { status })
                  }
                />
              )}
              {view === "Menu" && (
                <section className="panel">
                  <header className="section-heading">
                    <h2>
                      The menu{" "}
                      <span className="count-pill">
                        {data.menu.length} dishes
                      </span>
                    </h2>
                    <span className="subtle">
                      <SlidersHorizontal size={16} /> Availability
                    </span>
                  </header>
                  <div className="admin-menu">
                    {data.menu.map((item) => (
                      <article key={item.id} className="admin-dish">
                        <img src={item.image} alt={item.name} />
                        <div>
                          <small>{item.category}</small>
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                          <b>{money(item.price, data.currency)}</b>
                        </div>
                        <button
                          className={`availability ${item.available ? "is-available" : ""}`}
                          disabled={working}
                          onClick={() =>
                            action(`/staff/menu/${item.id}`, "PATCH", {
                              available: !item.available,
                            })
                          }
                        >
                          {item.available ? "Available" : "Sold out"}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {view === "Payments" && (
                <section className="panel">
                  <header className="section-heading">
                    <h2>Awaiting confirmation</h2>
                    <span className="count-pill">
                      {data.payments.length} requests
                    </span>
                  </header>
                  {!data.payments.length ? (
                    <Empty
                      title="All settled"
                      description="Cash and bank transfer requests will appear here for your confirmation."
                    />
                  ) : (
                    data.payments.map((p) => (
                      <div className="payment-row" key={p.id}>
                        <Wallet size={23} />
                        <div>
                          <b>
                            {
                              data.tables.find(
                                (t) => t.session_id === p.table_session_id,
                              )?.name
                            }
                          </b>
                          <p>
                            {p.method.replace("_", " ")} · Tip{" "}
                            {money(p.tip, data.currency)}
                          </p>
                        </div>
                        <strong>
                          {money(p.amount + p.tip, data.currency)}
                        </strong>
                        <button
                          className="button primary"
                          disabled={working}
                          onClick={() =>
                            action(`/staff/payments/${p.id}/confirm`)
                          }
                        >
                          Confirm received
                        </button>
                      </div>
                    ))
                  )}
                </section>
              )}
              {view === "Reviews" && (
                <section className="panel">
                  <header className="section-heading">
                    <h2>From your guests</h2>
                    <Star size={18} />
                  </header>
                  {!data.reviews.length ? (
                    <Empty
                      title="The first kind word is on its way"
                      description="Guests can leave a review from their table menu after ordering."
                    />
                  ) : (
                    data.reviews.map((r) => (
                      <article className="review" key={r.id}>
                        <span>
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                        <p>
                          {r.comment ||
                            "A guest left a rating for their visit."}
                        </p>
                        <small>Verified table visit</small>
                      </article>
                    ))
                  )}
                </section>
              )}
              <footer className="workspace-footer">
                <span>
                  <Leaf size={14} /> Made for moments around the table.
                </span>
                <span>Saffron & Sage · Restaurant workspace</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {current && (
        <Modal title={current.name} onClose={() => setSelected(null)}>
          <div className="modal-body">
            <p>
              {current.zone} · {current.seats} seats
            </p>
            <div className="detail-stats">
              <div>
                <small>Table status</small>
                <b>{current.session_id ? "In service" : "Available"}</b>
              </div>
              <div>
                <small>Current bill</small>
                <b>{money(current.bill?.total || 0, data?.currency)}</b>
              </div>
            </div>
            {current.orders.map((o) => (
              <div className="detail-order" key={o.id}>
                <b>
                  Order #{o.id}{" "}
                  <span className={`badge ${o.status}`}>{o.status}</span>
                </b>
                <p>
                  {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                </p>
              </div>
            ))}
            <button
              className="button primary full"
              onClick={() => {
                setQr(current);
                setSelected(null);
              }}
            >
              <QrCode size={17} /> Open table QR code
            </button>
            {current.session_id && (
              <button
                className="button secondary full"
                disabled={working}
                onClick={() =>
                  action(`/staff/sessions/${current.session_id}/close`)
                }
              >
                Settle & close table
              </button>
            )}
            <p className="fine-print">
              A table can close once every order is served and its full bill is
              confirmed paid.
            </p>
          </div>
        </Modal>
      )}
      {qr && (
        <Modal
          title="A warm welcome, one scan away."
          onClose={() => setQr(null)}
        >
          <div className="modal-body qr-content">
            <p>Choose a table and print its personal menu code.</p>
            <label>
              Table
              <select
                value={qr.id}
                onChange={(e) =>
                  setQr(
                    data?.tables.find((t) => t.id === Number(e.target.value)) ||
                      null,
                  )
                }
              >
                {data?.tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.zone}
                  </option>
                ))}
              </select>
            </label>
            <div className="qr-print" id="table-qr">
              <Brand />
              <h3>{qr.name}</h3>
              <QRCodeSVG
                value={`${window.location.origin}/menu/${qr.qr_token}`}
                size={200}
                marginSize={2}
              />
              <h3>Good things are on the menu.</h3>
              <p>Scan to explore, order & enjoy.</p>
            </div>
            <a
              className="button primary full"
              href={`/menu/${qr.qr_token}`}
              target="_blank"
              rel="noreferrer"
            >
              Preview guest menu <ArrowUpRight size={17} />
            </a>
            <button
              className="button secondary full"
              onClick={() => window.print()}
            >
              <Download size={17} /> Print table card
            </button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Welcome to your workspace."
          onClose={() => setHelp(false)}
        >
          <div className="modal-body help-copy">
            <p>
              <b>1. Set the table.</b> Open Table QR codes, pick a table and
              print its card. Guests scan to browse and order.
            </p>
            <p>
              <b>2. Keep service flowing.</b> New orders appear in Kitchen. Move
              them through Cooking, Ready and Served.
            </p>
            <p>
              <b>3. Take care of the little things.</b> Resolve waiter, water
              and bill requests from the floor.
            </p>
            <p>
              <b>4. Finish on a good note.</b> Guests split their bill and
              request cash or bank transfer payment. Confirm received funds
              under Payments, then close the table.
            </p>
            <p className="fine-print">
              Online card, Apple Pay and Google Pay require a payment provider
              integration. Prices are CAD and include 13% tax at checkout by
              default.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  suffix,
  caption,
  icon,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  caption: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <article className="metric">
      <div>
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <strong>
        {value} <small>{suffix}</small>
      </strong>
      <p>{caption}</p>
    </article>
  );
}
function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState(
      DEMO_MODE ? DEMO_EMAIL : "manager@saffron.local",
    ),
    [password, setPassword] = useState(DEMO_MODE ? DEMO_PASSWORD : ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">THE ART OF A GOOD SERVICE</p>
          <h1>
            More connection.
            <br />
            Less running around.
          </h1>
          <p>
            A thoughtful little workspace for the people
            <br />
            who make every guest feel at home.
          </p>
          <span className="login-note">
            <Leaf size={20} /> Good food brings us together.
          </span>
        </div>
        <small>SAFFRON & SAGE · RESTAURANT WORKSPACE</small>
      </div>
      <div className="login-form-wrap">
        <form
          className="login-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = z.object({ token: z.string() }).parse(
                await api("/login", {
                  method: "POST",
                  body: { email, password },
                }),
              );
              onLogin(result.token);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="brand-icon">
            <Leaf size={28} />
          </span>
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Ready for a lovely service?</h2>
          <p>
            {DEMO_MODE
              ? "Explore the staff workspace, then open a guest menu to place a sample order."
              : "Sign in to your restaurant workspace."}
          </p>
          {DEMO_MODE && (
            <div className="demo-login-details">
              <strong>Public test login</strong>
              <p>
                Email: <code>{DEMO_EMAIL}</code>
                <br />
                Password: <code>{DEMO_PASSWORD}</code>
              </p>
              <small>
                Each browser has its own sample restaurant. Open guest ordering
                in another tab of this browser to see updates in the staff
                workspace.
              </small>
            </div>
          )}
          <label>
            Email address
            <input
              autoComplete="username"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <ErrorBox message={error} />}
          <button className="button primary full" disabled={busy}>
            {busy ? "Signing in…" : "Enter workspace"}
            <ArrowRight size={18} />
          </button>
          <p className="fine-print">
            {DEMO_MODE ? "Use the public test login shown above. Other testers may change the shared sample data." : "Your manager provides your staff sign-in details."}
            <br />
            Guests can scan the QR code at their table.
          </p>
        </form>
      </div>
    </div>
  );
}
