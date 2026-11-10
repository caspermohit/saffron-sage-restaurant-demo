"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Bell,
  Wifi,
  Clock,
  ReceiptText,
  Star,
  Flame,
  Check,
  Leaf,
  Search,
  ChevronLeft,
} from "lucide-react";
import { z } from "zod";
import {
  api,
  menuSchema,
  guestSchema,
  credentialSchema,
  Credential,
  GuestState,
  MenuItem,
  money,
  age,
  ApiError,
} from "@/lib/api";
import { Brand, Busy, Modal, ErrorBox, Empty } from "./ui";
type CartLine = { item: MenuItem; size: "regular" | "large"; quantity: number };
export function GuestMenu({ tableToken }: { tableToken: string }) {
  const [menu, setMenu] = useState<z.infer<typeof menuSchema> | null>(null),
    [credential, setCredential] = useState<Credential | null>(null),
    [state, setState] = useState<GuestState | null>(null),
    [category, setCategory] = useState("All dishes"),
    [search, setSearch] = useState(""),
    [cart, setCart] = useState<CartLine[]>([]),
    [dish, setDish] = useState<MenuItem | null>(null),
    [size, setSize] = useState<"regular" | "large">("regular"),
    [quantity, setQuantity] = useState(1),
    [panel, setPanel] = useState<
      "cart" | "orders" | "bill" | "wifi" | "review" | null
    >(null),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [split, setSplit] = useState(1),
    [tip, setTip] = useState(10),
    [method, setMethod] = useState("cash"),
    [rating, setRating] = useState(5),
    [comment, setComment] = useState("");
  const orderReference = useRef<string | null>(null),
    paymentReference = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = menuSchema.parse(await api(`/menu/${tableToken}`));
        if (!active) return;
        setMenu(result);
        const saved = sessionStorage.getItem(`table:${tableToken}`);
        if (saved) {
          const parsed = credentialSchema.safeParse(JSON.parse(saved));
          if (parsed.success) {
            setCredential(parsed.data);
            return;
          }
        }
        const c = credentialSchema.parse(
          await api(`/menu/${tableToken}/open`, { method: "POST" }),
        );
        if (active) {
          sessionStorage.setItem(`table:${tableToken}`, JSON.stringify(c));
          setCredential(c);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "This menu could not be opened.",
          );
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [tableToken]);
  const refresh = useCallback(async () => {
    if (!credential) return;
    try {
      setState(
        guestSchema.parse(
          await api(`/sessions/${credential.session_id}`, {
            guest: credential.token,
          }),
        ),
      );
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 409)) {
        sessionStorage.removeItem(`table:${tableToken}`);
        setCredential(null);
      }
      setError(
        e instanceof Error ? e.message : "Unable to refresh your table.",
      );
    }
  }, [credential, tableToken]);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  async function send(path: string, body: unknown) {
    if (!credential)
      throw new Error(
        "Your visit has ended. Scan the table QR again to begin a new visit.",
      );
    return api(`/sessions/${credential.session_id}/${path}`, {
      method: "POST",
      guest: credential.token,
      body,
    });
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const currency = menu?.currency || "CAD",
    subtotal = cart.reduce(
      (sum, l) =>
        sum +
        l.quantity * Math.round(l.item.price * (l.size === "large" ? 1.5 : 1)),
      0,
    ),
    tax = Math.round((subtotal * (menu?.tax_percent || 0)) / 100),
    count = cart.reduce((s, l) => s + l.quantity, 0);
  const remaining = state?.bill.remaining || 0,
    share = Math.ceil(remaining / split),
    tipAmount = Math.round((share * tip) / 100);
  function add() {
    if (!dish) return;
    setCart((lines) => {
      const found = lines.find((l) => l.item.id === dish.id && l.size === size);
      return found
        ? lines.map((l) =>
            l === found
              ? { ...l, quantity: Math.min(20, l.quantity + quantity) }
              : l,
          )
        : [...lines, { item: dish, size, quantity }];
    });
    orderReference.current = null;
    setDish(null);
    setToast("A little something delicious, added to your order.");
  }
  if (!menu)
    return (
      <div className="guest-shell">
        <Brand />
        {error ? (
          <>
            <ErrorBox message={error} />
            <button
              className="button secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </>
        ) : (
          <Busy />
        )}
      </div>
    );
  const categories = [
    "All dishes",
    ...new Set(menu.items.map((i) => i.category)),
  ];
  return (
    <div className="guest-page">
      <header className="guest-header">
        <Brand />
        <span className="table-label">
          <span className="live-dot" />
          {menu.table.name}
        </span>
      </header>
      <main className="guest-main">
        <div className="guest-welcome">
          <p className="eyebrow">PULL UP A CHAIR. STAY A LITTLE WHILE.</p>
          <h1>
            Good things
            <br />
            are on the menu.
          </h1>
          <p>
            Seasonal ingredients. Familiar favourites.
            <br />A little something for everyone.
          </p>
          <span className="welcome-leaf">
            <Leaf size={128} />
          </span>
        </div>
        <div className="guest-actions">
          <button
            onClick={() =>
              run(async () => {
                await send("calls", { kind: "waiter" });
                setToast(
                  "Your server is on the way. Make yourself comfortable.",
                );
              })
            }
            disabled={busy || !credential}
          >
            <Bell size={17} />
            Call a waiter
          </button>
          <button onClick={() => setPanel("wifi")}>
            <Wifi size={17} />
            Guest Wi-Fi
          </button>
          <button onClick={() => setPanel("orders")}>
            <Clock size={17} />
            My orders{state?.orders.length ? ` (${state.orders.length})` : ""}
          </button>
          <button onClick={() => setPanel("bill")}>
            <ReceiptText size={17} />
            My bill
          </button>
        </div>
        {error && <ErrorBox message={error} />}{" "}
        {!credential && (
          <p className="error">
            This visit has ended.{" "}
            <button onClick={() => window.location.reload()}>
              Start a new visit
            </button>
          </p>
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={18} />
            {toast}
          </div>
        )}
        <div className="guest-menu-tools">
          <div className="tabs">
            {categories.map((c) => (
              <button
                className={category === c ? "selected" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input
              placeholder="Find your favourite…"
              aria-label="Search the menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="guest-section-title">
          <h2>
            {category === "All dishes" ? "Find your new favourite." : category}
          </h2>
          <span>Made with care, served with a smile.</span>
        </div>
        <div className="dish-grid">
          {menu.items
            .filter(
              (i) =>
                (category === "All dishes" || i.category === category) &&
                `${i.name} ${i.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((i) => (
              <article
                className={`dish-card ${i.available ? "" : "sold-out"}`}
                key={i.id}
              >
                <button
                  className="dish-image-button"
                  disabled={!i.available || !credential}
                  onClick={() => {
                    setDish(i);
                    setSize("regular");
                    setQuantity(1);
                  }}
                  aria-label={`View ${i.name}`}
                >
                  <img src={i.image} alt={i.name} />
                  <span>{i.category}</span>
                  {!i.available && <b className="sold-label">Back soon</b>}
                </button>
                <div className="dish-info">
                  <div>
                    <h3>{i.name}</h3>
                    <b>{money(i.price, currency)}</b>
                  </div>
                  <p>{i.description}</p>
                  <footer>
                    <span>
                      {i.allergens.length
                        ? i.allergens.join(" · ")
                        : "Plant-based ingredients"}
                      {i.spice > 0 && (
                        <span className="spice">
                          <Flame size={13} />
                          {i.spice === 1 ? "Mild" : "Spicy"}
                        </span>
                      )}
                    </span>
                    <button
                      className="add-dish"
                      disabled={!i.available || !credential}
                      aria-label={`Add ${i.name}`}
                      onClick={() => {
                        setDish(i);
                        setSize("regular");
                        setQuantity(1);
                      }}
                    >
                      <Plus size={19} />
                    </button>
                  </footer>
                </div>
              </article>
            ))}
        </div>
        <div className="allergy-note">
          <Leaf size={21} />
          <p>
            Something we should know?
            <br />
            <span>
              For allergies or dietary needs, please speak to your server before
              ordering.
            </span>
          </p>
          <button
            onClick={() =>
              run(async () => {
                await send("calls", { kind: "waiter" });
                setToast("Your server will be with you shortly.");
              })
            }
            disabled={busy || !credential}
          >
            Let’s talk <ArrowRight size={16} />
          </button>
        </div>
        <footer className="guest-footer">
          <Brand />
          <p>Good food brings us together.</p>
          <button onClick={() => setPanel("review")}>
            <Star size={15} />
            How was your visit?
          </button>
        </footer>
      </main>
      {count > 0 && (
        <button className="cart-bar" onClick={() => setPanel("cart")}>
          <span>
            <ShoppingBag size={19} />
            <b>{count}</b> View your order
          </span>
          <strong>
            {money(subtotal + tax, currency)} <ArrowRight size={18} />
          </strong>
        </button>
      )}
      {dish && (
        <Modal title="A closer look." onClose={() => setDish(null)}>
          <img className="dish-detail-image" src={dish.image} alt={dish.name} />
          <div className="modal-body">
            <h2>{dish.name}</h2>
            <p>{dish.description}</p>
            <div className="dish-tags">
              {dish.allergens.map((a) => (
                <span key={a}>{a}</span>
              ))}
              {dish.spice > 0 && (
                <span>
                  <Flame size={13} />
                  Spice level {dish.spice}/3
                </span>
              )}
            </div>
            <fieldset>
              <legend>Make it yours</legend>
              {["regular", "large"].map((v) => (
                <label className="radio-option" key={v}>
                  <input
                    type="radio"
                    name="size"
                    checked={size === v}
                    onChange={() => {
                      if (v === "regular" || v === "large") setSize(v);
                    }}
                  />
                  {v === "regular" ? "Regular" : "Large · to share"}
                  <b>
                    {money(
                      Math.round(dish.price * (v === "large" ? 1.5 : 1)),
                      currency,
                    )}
                  </b>
                </label>
              ))}
            </fieldset>
            <div className="dish-add-row">
              <div className="stepper">
                <button
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                >
                  <Minus size={16} />
                </button>
                <span>{quantity}</span>
                <button
                  aria-label="Increase quantity"
                  disabled={quantity >= 20}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={16} />
                </button>
              </div>
              <button className="button primary" onClick={add}>
                Add to order ·{" "}
                {money(
                  Math.round(dish.price * (size === "large" ? 1.5 : 1)) *
                    quantity,
                  currency,
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {panel && (
        <Modal
          title={
            panel === "cart"
              ? "Your delicious decisions."
              : panel === "orders"
                ? "Good things take a little time."
                : panel === "bill"
                  ? "Whenever you’re ready."
                  : panel === "wifi"
                    ? "Stay a little more connected."
                    : "Leave a little love."
          }
          onClose={() => setPanel(null)}
        >
          <div className="modal-body">
            {error && <ErrorBox message={error} />}
            {panel === "cart" && (
              <>
                {!cart.length ? (
                  <Empty
                    title="Your order is waiting to happen"
                    description="Explore the menu and find something you love."
                  />
                ) : (
                  <>
                    <div className="cart-lines">
                      {cart.map((l, index) => (
                        <div
                          className="cart-line"
                          key={`${l.item.id}:${l.size}`}
                        >
                          <img src={l.item.image} alt="" />
                          <div>
                            <b>{l.item.name}</b>
                            <small>
                              {l.size} ·{" "}
                              {money(
                                Math.round(
                                  l.item.price * (l.size === "large" ? 1.5 : 1),
                                ),
                                currency,
                              )}
                            </small>
                            <div className="stepper">
                              <button
                                aria-label={`Remove one ${l.item.name}`}
                                onClick={() => {
                                  setCart((rows) =>
                                    rows.flatMap((v, i) =>
                                      i === index
                                        ? v.quantity > 1
                                          ? [{ ...v, quantity: v.quantity - 1 }]
                                          : []
                                        : [v],
                                    ),
                                  );
                                  orderReference.current = null;
                                }}
                              >
                                <Minus size={13} />
                              </button>
                              <span>{l.quantity}</span>
                              <button
                                disabled={l.quantity >= 20}
                                aria-label={`Add one ${l.item.name}`}
                                onClick={() => {
                                  setCart((rows) =>
                                    rows.map((v, i) =>
                                      i === index
                                        ? { ...v, quantity: v.quantity + 1 }
                                        : v,
                                    ),
                                  );
                                  orderReference.current = null;
                                }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                          <b>
                            {money(
                              l.quantity *
                                Math.round(
                                  l.item.price * (l.size === "large" ? 1.5 : 1),
                                ),
                              currency,
                            )}
                          </b>
                        </div>
                      ))}
                    </div>
                    <label>
                      Anything we should know?
                      <textarea
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          orderReference.current = null;
                        }}
                        maxLength={500}
                        placeholder="A special request for the kitchen…"
                      />
                    </label>
                    <div className="bill-lines">
                      <p>
                        <span>Subtotal</span>
                        <b>{money(subtotal, currency)}</b>
                      </p>
                      <p>
                        <span>Tax ({menu.tax_percent}%)</span>
                        <b>{money(tax, currency)}</b>
                      </p>
                      <p className="bill-total">
                        <span>Total</span>
                        <b>{money(subtotal + tax, currency)}</b>
                      </p>
                    </div>
                    <button
                      className="button primary full"
                      disabled={busy || !credential}
                      onClick={() =>
                        run(async () => {
                          orderReference.current ??= crypto.randomUUID();
                          await send("orders", {
                            client_reference: orderReference.current,
                            notes,
                            items: cart.map((l) => ({
                              menu_item_id: l.item.id,
                              size: l.size,
                              quantity: l.quantity,
                            })),
                          });
                          setCart([]);
                          setNotes("");
                          orderReference.current = null;
                          setPanel("orders");
                          setToast("You’re all ordered. The kitchen is on it.");
                        })
                      }
                    >
                      {busy ? "Sending to the kitchen…" : "Send to the kitchen"}
                      <ArrowRight size={17} />
                    </button>
                  </>
                )}
              </>
            )}
            {panel === "orders" && (
              <>
                {!state?.orders.length ? (
                  <Empty
                    title="Something lovely awaits"
                    description="Your orders and their progress will appear here."
                  />
                ) : (
                  state.orders.map((o) => (
                    <article className="guest-order" key={o.id}>
                      <header>
                        <b>Order #{o.id}</b>
                        <span className={`badge ${o.status}`}>
                          {o.status === "new"
                            ? "Received"
                            : o.status === "preparing"
                              ? "Cooking"
                              : o.status === "ready"
                                ? "Ready to serve"
                                : "Enjoy!"}
                        </span>
                      </header>
                      <small>{age(o.created_at)}</small>
                      <div className="progress-steps">
                        {["new", "preparing", "ready", "served"].map((s, i) => (
                          <span
                            key={s}
                            className={
                              ["new", "preparing", "ready", "served"].indexOf(
                                o.status,
                              ) >= i
                                ? "done"
                                : ""
                            }
                          />
                        ))}
                      </div>
                      {o.items.map((i) => (
                        <p key={i.id}>
                          {i.quantity} × {i.name} <small>({i.size})</small>
                        </p>
                      ))}
                      <strong>{money(o.total, currency)}</strong>
                    </article>
                  ))
                )}
                <button
                  className="button secondary full"
                  disabled={busy || !credential}
                  onClick={() =>
                    run(async () => {
                      await send("calls", { kind: "water" });
                      setToast("A fresh top-up is on the way.");
                    })
                  }
                >
                  A little more water, please
                </button>
              </>
            )}
            {panel === "wifi" && (
              <div className="wifi-card">
                <Wifi size={40} />
                <p>Make yourself at home.</p>
                <label>
                  Network<b>{state?.wifi.name || "Loading…"}</b>
                </label>
                <label>
                  Password
                  <b>{state?.wifi.password || "Please ask your server"}</b>
                </label>
              </div>
            )}
            {panel === "bill" && (
              <>
                <p>
                  Split the bill with your table, add a little thank-you, and
                  choose how you’d like to pay.
                </p>
                <div className="bill-lines">
                  <p>
                    <span>Table total, including tax</span>
                    <b>{money(state?.bill.total || 0, currency)}</b>
                  </p>
                  <p>
                    <span>Confirmed paid</span>
                    <b>{money(state?.bill.paid || 0, currency)}</b>
                  </p>
                  <p>
                    <span>Awaiting staff confirmation</span>
                    <b>{money(state?.bill.pending || 0, currency)}</b>
                  </p>
                  <p className="bill-total">
                    <span>Left to allocate</span>
                    <b>{money(remaining, currency)}</b>
                  </p>
                </div>
                {remaining > 0 ? (
                  <>
                    <label>
                      Split the remaining bill
                      <select
                        value={split}
                        onChange={(e) => {
                          setSplit(Number(e.target.value));
                          paymentReference.current = null;
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>
                            {n === 1
                              ? "I’ll take care of it all"
                              : `Pay 1 of ${n} equal shares`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Add a thank-you
                      <div className="tip-options">
                        {[0, 10, 15, 20].map((n) => (
                          <button
                            key={n}
                            className={tip === n ? "selected" : ""}
                            onClick={() => {
                              setTip(n);
                              paymentReference.current = null;
                            }}
                          >
                            {n === 0 ? "No tip" : `${n}%`}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label>
                      Payment method
                      <select
                        value={method}
                        onChange={(e) => {
                          setMethod(e.target.value);
                          paymentReference.current = null;
                        }}
                      >
                        <option value="cash">Cash · pay your server</option>
                        <option value="bank_transfer">
                          Bank transfer · staff verification
                        </option>
                      </select>
                    </label>
                    {method === "bank_transfer" && (
                      <p className="bank-note">{state?.bank_instructions}</p>
                    )}
                    <p className="fine-print">
                      Card, Apple Pay and Google Pay are not available at this
                      restaurant yet. This sends a request to your server; funds
                      are confirmed separately.
                    </p>
                    <div className="bill-lines">
                      <p>
                        <span>Your share</span>
                        <b>{money(share, currency)}</b>
                      </p>
                      <p>
                        <span>Tip</span>
                        <b>{money(tipAmount, currency)}</b>
                      </p>
                    </div>
                    <button
                      className="button primary full"
                      disabled={busy || !credential}
                      onClick={() =>
                        run(async () => {
                          paymentReference.current ??= crypto.randomUUID();
                          await send("payments", {
                            client_reference: paymentReference.current,
                            amount: share,
                            tip: tipAmount,
                            method,
                          });
                          paymentReference.current = null;
                          setToast("Your payment request is with your server.");
                        })
                      }
                    >
                      {busy
                        ? "Sending…"
                        : `Request payment · ${money(share + tipAmount, currency)}`}
                    </button>
                  </>
                ) : (
                  <Empty
                    title={
                      state?.bill.pending
                        ? "Your server will take it from here."
                        : state?.bill.total
                          ? "All taken care of. Thank you!"
                          : "Nothing to settle just yet."
                    }
                    description={
                      state?.bill.pending
                        ? "We’ll update your bill once payment is confirmed."
                        : "We’re so glad you joined us."
                    }
                  />
                )}
                <button
                  className="text-link full"
                  disabled={busy || !credential}
                  onClick={() =>
                    run(async () => {
                      await send("calls", { kind: "bill" });
                      setToast("Your server will help you with the bill.");
                    })
                  }
                >
                  Ask your server for help
                </button>
              </>
            )}
            {panel === "review" && (
              <>
                <p>The little things mean a lot. How was your time with us?</p>
                <div
                  className="rating-stars"
                  role="group"
                  aria-label="Rate your visit"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      aria-pressed={rating === n}
                      onClick={() => setRating(n)}
                    >
                      <Star
                        size={38}
                        fill={n <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
                <label>
                  Anything you’d like to share?
                  <textarea
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What made your visit special?"
                  />
                </label>
                <button
                  className="button primary full"
                  disabled={busy || !credential || !state?.orders.length}
                  onClick={() =>
                    run(async () => {
                      await send("review", { rating, comment });
                      setPanel(null);
                      setToast("Thank you. Your kind words mean the world.");
                    })
                  }
                >
                  {state?.review ? "Update your review" : "Share your review"}
                </button>
                {!state?.orders.length && (
                  <p className="fine-print">
                    You can leave a review after placing your first order.
                  </p>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
