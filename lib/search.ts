/* Deterministic Roman-Urdu / English query parser — ported verbatim from
   app/assets/js/app.js parseQuery. Party size is read BEFORE budget so
   "2500 tak, 6 log hain" means Rs 2,500 for the table, not each. "Abhi"
   means *now*, not hurry — it must not set a travel limit. */
import { HZ } from '@/lib/hz';
import { rs } from '@/lib/format';

export interface ExtractedChip { k: string; v: string }

export interface ParsedQuery {
  raw: string;
  budget: number | null;
  budgetTotal: number | null;
  party: number;
  mood: string | null;
  maxTravel: number;
  from: string;
  extracted: ExtractedChip[];
  needsFamily?: boolean;
  needsPrayer?: boolean;
  needsRamp?: boolean;
  needsCard?: boolean;
  late?: boolean;
  dish?: string;
  cuisine?: string;
}

export function parseQuery(text: string): ParsedQuery {
  const t = ' ' + text.toLowerCase() + ' ';
  const q: ParsedQuery = {
    raw: text, budget: null, budgetTotal: null, party: 1, mood: null,
    maxTravel: 30, from: HZ.user.homeArea, extracted: [],
  };

  const ppl = t.match(/(\d+)\s*(log|bande|banday|people|person|ppl|guests|jane)/);
  if (ppl) {
    q.party = parseInt(ppl[1], 10);
    q.extracted.push({ k: 'Party size', v: q.party + ' people' });
  } else if (/\bakela|alone|solo|khud\b/.test(t)) {
    q.party = 1;
    q.extracted.push({ k: 'Party size', v: 'Solo' });
  }

  const money = t.match(/(\d{3,6})\s*(rs|rupees|rupay|tak|k\b)?/);
  if (money) {
    let b = parseInt(money[1], 10);
    if (/\bk\b/.test(money[0]) && b < 100) b *= 1000;
    if (b >= 200) {
      const perHead = /per head|per person|har banday|each/.test(t);
      q.budgetTotal = perHead ? b * q.party : b;
      q.budget = Math.round(q.budgetTotal / q.party);
      q.extracted.push({
        k: 'Budget',
        v: q.party > 1
          ? rs(q.budgetTotal) + ' total · ' + rs(q.budget) + ' a head'
          : rs(q.budget),
      });
    }
  }

  if (/spicy|teekha|tikha|masaledar|chatpata|mirch/.test(t)) {
    q.mood = 'spicy'; q.extracted.push({ k: 'Mood', v: 'Spicy' });
  } else if (/bbq|barbeque|barbecue|tikka|kabab|kebab|boti|karahi|grill/.test(t)) {
    q.mood = 'bbq'; q.extracted.push({ k: 'Mood', v: 'BBQ / grill' });
  } else if (/quiet|sukoon|peaceful|baat|talk|calm|shor nahi/.test(t)) {
    q.mood = 'quiet'; q.extracted.push({ k: 'Mood', v: 'Quiet' });
  }

  if (/family|ghar wal|bachay|bache|ammi|abbu|kids|children/.test(t)) {
    q.needsFamily = true; q.extracted.push({ k: 'Hard constraint', v: 'Family section' });
  }
  if (/prayer|namaz|masjid|salah/.test(t)) {
    q.needsPrayer = true; q.extracted.push({ k: 'Hard constraint', v: 'Prayer area' });
  }
  if (/wheelchair|ramp|step-free|walker/.test(t)) {
    q.needsRamp = true; q.extracted.push({ k: 'Hard constraint', v: 'Step-free access' });
  }
  if (/card|debit|credit|cash nahi/.test(t)) {
    q.needsCard = true; q.extracted.push({ k: 'Hard constraint', v: 'Card accepted' });
  }

  const travel = t.match(/(\d{1,2})\s*(min|minute|mint)/);
  if (travel) {
    q.maxTravel = parseInt(travel[1], 10);
    q.extracted.push({ k: 'Max travel', v: q.maxTravel + ' min' });
  } else if (/jaldi|fast|quick|hurry|jldi/.test(t)) {
    q.maxTravel = 15;
    q.extracted.push({ k: 'Max travel', v: '15 min (inferred from "jaldi")' });
  }

  if (/sasta|cheap|budget|kam paison|affordable/.test(t) && !q.budget) {
    q.budget = 700; q.budgetTotal = 700 * q.party;
    q.extracted.push({ k: 'Budget', v: 'Rs 700 a head (inferred from "sasta")' });
  }
  if (/late|raat|night|11 baje|12 baje|midnight/.test(t)) {
    q.late = true; q.extracted.push({ k: 'Time', v: 'Late night' });
  }

  const dishes = ['nihari', 'biryani', 'karahi', 'haleem', 'broast', 'burger', 'mandi', 'rabri', 'halwa puri', 'brownie', 'tikka', 'kabab', 'paye', 'sushi', 'pizza', 'falooda'];
  const found = dishes.find(dd => t.indexOf(dd) >= 0);
  if (found) { q.dish = found; q.extracted.push({ k: 'Dish', v: found.charAt(0).toUpperCase() + found.slice(1) }); }

  if (!q.budget) { q.budget = HZ.user.budgetTypical; q.budgetTotal = q.budget * q.party; }
  return q;
}
