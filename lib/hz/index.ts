/* HAAZIR data + estimation engine, ported verbatim from app/assets/js.
   The prototype boots with setClock(demoTime) then reset() — mirror that here
   so server and client render identical numbers from the seeded PRNG. */
import HZ from './data.js';
import engine from './engine.js';

engine.setClock(HZ.meta.demoTime.day, HZ.meta.demoTime.hour, HZ.meta.demoTime.minute);
engine.reset();

export { HZ, engine };
