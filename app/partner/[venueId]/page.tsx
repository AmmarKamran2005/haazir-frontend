"use client";

import { use, useState } from "react";
import { useClock } from "@/lib/hooks/useDemoClock";
import { rs, pct } from "@/lib/format";
import { partnerAnalytics, partnerPrices } from "@/lib/api";
import { useAsync } from "@/lib/hooks/useAsync";
import { Label } from "@/components/primitives/Label";
import { useToast } from "@/components/chrome/Toasts";
import { Icon } from "@/components/primitives/Icon";
import { useI18n } from "@/lib/i18n";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Page({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = use(params);
  useClock();
  const toast = useToast();
  const { t } = useI18n();

  /* Publishing changes what diners see, so it is confirmed before it goes
     live — the plan's acceptance criterion for this screen. */
  const [confirming, setConfirming] = useState(false);
  const [published, setPublished] = useState(false);

  const { data: analytics, loading } = useAsync(() => partnerAnalytics(venueId), [venueId]);
  const { data: prices } = useAsync(() => partnerPrices(venueId), [venueId]);

  if (loading || !analytics) {
    return (
      <div className="app__scroll scroll">
        <h1 className="sr">{loading ? 'Loading' : 'Venue not found'}</h1>
        <div className="empty">
          <div className="empty__t">{loading ? 'Loading…' : 'Venue not found'}</div>
          <div className="empty__s">
            {loading
              ? 'Fetching this venue’s analytics.'
              : 'No partner data is configured for this venue.'}
          </div>
        </div>
      </div>
    );
  }

  const { venue: v, fuse: f, weekCovers, utilisation, offPeak, attribution } = analytics;
  const maxC = Math.max(...weekCovers);

  return (
    <>
      <h1 className="sr">{v.name} partner dashboard</h1>
      <div className="ahead">
        <div style={{ flex: 1 }}>
          <div className="ahead__t">{v.name} · partner</div>
          <div className="ahead__s">Yield engine — the business half of the product</div>
        </div>
      </div>

      <div className="app__scroll scroll">
        <div className="ask">
          <div className="pgrid">
            <div className="pcard">
              <div className="pcard__l">{t('partner.utilisationNow')}</div>
              <div className="pcard__v">{Math.round(f.occupancy * 100)}%</div>
              <div className="pcard__s">
                {Math.round(v.capacity * (1 - f.occupancy))} of {v.capacity} covers idle
              </div>
            </div>
            <div className="pcard">
              <div className="pcard__l">{t('partner.coversSent')}</div>
              <div className="pcard__v">{attribution.seatedVerified}</div>
              <div className="pcard__s">
                of {attribution.sent} referred · receipt-matched, {rs(attribution.revenuePkr)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "var(--sp-4)" }}>
            <div className="sec__h"><Label>{t('partner.covers7')}</Label></div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96 }}>
              {weekCovers.map((cv, i) => {
                const h = (cv / maxC) * 100;
                const low = utilisation[i] < 0.40;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 5, height: "100%", justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>{cv}</span>
                    <div
                      style={{
                        width: "100%", height: h + "%",
                        background: low ? "var(--verm-lo)" : "var(--sunk-2)",
                        border: "1px solid " + (low ? "var(--verm-md)" : "var(--rule-strong)"),
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--ink-3)" }}>{DAYS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "var(--sp-5)" }} className="offer">
            <div className="offer__h">{t('partner.yieldOpp')}</div>
            <div className="offer__b">
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
                Your <b>{offPeak.window}</b> window runs at <b>{pct(offPeak.utilisation)}</b> capacity —{" "}
                <b>{offPeak.seatsIdle} seats</b> idle at {pct(offPeak.marginPct)} contribution margin.
              </p>
              <div className="pgrid" style={{ marginTop: "var(--sp-3)" }}>
                <div className="pcard">
                  <div className="pcard__l">Priced offer</div>
                  <div className="pcard__v">{pct(offPeak.suggestedDiscount)}</div>
                  <div className="pcard__s">off, shown only to diners whose palate and budget already fit</div>
                </div>
                <div className="pcard">
                  <div className="pcard__l">Projected fill</div>
                  <div className="pcard__v">+{offPeak.projectedCovers}</div>
                  <div className="pcard__s">
                    covers · {rs(offPeak.projectedCovers * v.avgTicket * (1 - offPeak.suggestedDiscount) * offPeak.marginPct)} contribution
                  </div>
                </div>
              </div>
              {published ? (
                <div
                  className="s-free"
                  style={{
                    marginTop: "var(--sp-3)", display: "flex", alignItems: "center", gap: 8,
                    padding: "11px 13px", border: "1px solid var(--sig-md)",
                    background: "var(--sig-lo)", borderRadius: "var(--r-sm)", fontSize: 13,
                  }}
                >
                  <Icon name="check" />
                  <span>
                    Live in the <b>{offPeak.window}</b> window. Shown only to diners who already match,
                    labelled, and never above an organic result.
                  </span>
                </div>
              ) : confirming ? (
                <div
                  style={{
                    marginTop: "var(--sp-3)", padding: "12px 13px",
                    border: "1px solid var(--rule-strong)", background: "var(--sunk)",
                    borderRadius: "var(--r-sm)",
                  }}
                >
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>
                    Publish <b>{pct(offPeak.suggestedDiscount)} off</b> in the{" "}
                    <b>{offPeak.window}</b> window at <b>{v.name}</b>? Diners see it immediately.
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button
                      className="btn btn--primary btn--sm"
                      type="button"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setConfirming(false);
                        setPublished(true);
                        toast(
                          "Offer published to the " + offPeak.window +
                          " window, shown only to diners who already match. Labelled, and never above an organic result.",
                          "ticket",
                        );
                      }}
                    >
                      {t('partner.confirmPublish')}
                    </button>
                    <button className="btn btn--sm" type="button" onClick={() => setConfirming(false)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn--primary btn--full"
                  style={{ marginTop: "var(--sp-3)" }}
                  type="button"
                  onClick={() => setConfirming(true)}
                >
                  {t('partner.publishOffer')}
                </button>
              )}
              <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 9, lineHeight: 1.5 }}>
                Paid placement never displaces an organic result — an offer can only change the price shown on a venue
                a diner already matched. It is labelled and visually separated. Ranking integrity is a product constraint, not a policy page.
              </p>
            </div>
          </div>

          {prices && prices.rows.length > 0 && (
            <div style={{ marginTop: "var(--sp-5)" }}>
              <div className="sec__h"><Label>{t('partner.pricePosition')} {prices.area}</Label></div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--rule-strong)" }}>
                      <th style={{ textAlign: "left", padding: "8px 6px", fontWeight: 600, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)" }}>Dish</th>
                      <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)" }}>Your price</th>
                      <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)" }}>Area median</th>
                      <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-3)" }}>Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.rows.map(r => (
                      <tr key={r.dish} style={{ borderBottom: "1px solid var(--rule)" }}>
                        <td style={{ padding: "9px 6px", fontWeight: 500 }}>{r.dish}</td>
                        <td style={{ padding: "9px 6px", textAlign: "right", fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}>{rs(r.yourPrice)}</td>
                        <td style={{ padding: "9px 6px", textAlign: "right", fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }}>{rs(r.areaMedian)}</td>
                        <td style={{
                          padding: "9px 6px", textAlign: "right", fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums",
                          color: r.gap > 0 ? "var(--verm)" : r.gap < 0 ? "var(--jade)" : "var(--ink-3)",
                        }}>
                          {r.gap > 0 ? "+" : ""}{rs(r.gap)} ({r.gapPct > 0 ? "+" : ""}{Math.round(r.gapPct * 100)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginTop: "var(--sp-5)" }}>
            <div className="sec__h"><Label>Why this is the business</Label></div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
              A restaurant does not need more attention — it needs the empty Tuesday filled. We are the only party that can see,
              in real time, which seats are idle and which diner would actually enjoy sitting in them.{" "}
              <b style={{ color: "var(--ink)" }}>We take a cut of covers we can prove we caused</b>, matched to a receipt — not a click.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}