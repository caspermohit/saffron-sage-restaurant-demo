"use client";
import { ChefHat, Clock, ArrowRight } from "lucide-react";
import { Order, money, age } from "@/lib/api";
import { Empty } from "./ui";
export function Kitchen({
  orders,
  currency,
  working,
  onStatus,
}: {
  orders: Order[];
  currency: string;
  working: boolean;
  onStatus: (id: number, status: string) => void;
}) {
  const columns = [
    {
      status: "new",
      name: "New orders",
      next: "preparing",
      action: "Start cooking",
    },
    {
      status: "preparing",
      name: "In the kitchen",
      next: "ready",
      action: "Mark ready",
    },
    {
      status: "ready",
      name: "Ready to serve",
      next: "served",
      action: "Mark served",
    },
  ];
  return (
    <div className="kitchen-board">
      {columns.map((c) => (
        <section className="kitchen-column" key={c.status}>
          <h2>
            <span className={`status-dot ${c.status}`} />
            {c.name}
            <span>{orders.filter((o) => o.status === c.status).length}</span>
          </h2>
          {orders
            .filter((o) => o.status === c.status)
            .map((o) => (
              <article className="order-card" key={o.id}>
                <header>
                  <div>
                    <small>ORDER #{String(o.id).padStart(3, "0")}</small>
                    <h3>{o.table}</h3>
                  </div>
                  <span className="badge">
                    <Clock size={12} />
                    {age(o.created_at)}
                  </span>
                </header>
                <div className="order-lines">
                  {o.items.map((i) => (
                    <div key={i.id}>
                      <b>{i.quantity}×</b>
                      <span>
                        {i.name}
                        <small>{i.size}</small>
                      </span>
                    </div>
                  ))}
                </div>
                {o.notes && <p className="order-note">Note: {o.notes}</p>}
                <footer>
                  <span>{money(o.total, currency)}</span>
                  <button
                    className="button primary"
                    disabled={working}
                    onClick={() => onStatus(o.id, c.next)}
                  >
                    {c.action}
                    <ArrowRight size={15} />
                  </button>
                </footer>
              </article>
            ))}
          {!orders.some((o) => o.status === c.status) && (
            <Empty
              title="A moment of calm"
              description="Orders will appear here."
            />
          )}
        </section>
      ))}
      <div className="served-summary">
        <ChefHat size={18} />
        {orders.filter((o) => o.status === "served").length} orders served this
        service
      </div>
    </div>
  );
}
