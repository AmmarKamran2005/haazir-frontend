export const en = {
  // Navigation
  'nav.ask': 'Ask',
  'nav.group': 'Group',
  'nav.city': 'City',
  'nav.venue': 'Venue',
  'nav.partner': 'Partner',
  'nav.diner': 'Diner',
  'nav.staff': 'Staff',

  // Brand
  'brand.tagline': 'Sach, abhi',

  // Common
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.retry': 'Try again',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.signin': 'Sign in',
  'common.signout': 'Sign out',
  'common.back': 'Back',
  'common.copyLink': 'Copy link',
  'common.copied': 'Copied',
  'common.undo': 'Undo',
  'common.min': 'min',

  // Ask surface
  'ask.headline': 'Kya khana hai?',
  'ask.headlineUr': 'آپ کیا کھانا چاہیں گے؟',
  'ask.placeholder': 'Type in Urdu, Roman-Urdu or English…',
  'ask.inputLabel': 'What do you want to eat?',
  'ask.search': 'Search',
  'ask.byVoice': 'Ask by voice',
  'ask.byPhoto': 'Photograph a menu',
  'ask.romanUrduHint': 'Roman Urdu works best',
  'ask.pulse': 'Karachi right now',

  // Results
  'results.title': 'Search results',
  'results.matches': '{n} matches',
  'results.searching': 'Searching…',
  'results.match': '1 match',
  'results.missing': 'What you’re missing',
  'results.missingSub': 'The frontier just outside your constraints. One relaxation each.',
  'results.excluded': 'Excluded by hard constraints',
  'results.relaxedNote': 'Showing results with one constraint relaxed from what you asked for.',

  // Venue truth card
  'venue.title': 'Truth card',
  'venue.subtitle': 'Everything we can verify, with how sure we are',
  'venue.live': 'Live state',
  'venue.dishTime': 'Dish-time graph',
  'venue.trust': 'Trust',
  'venue.dealTruth': 'Deal truth',
  'venue.facts': 'Access facts',
  'venue.twins': 'Taste twins',
  'venue.hold': 'Hold a table',
  'venue.checkinFree': 'I’m here — it’s free',
  'venue.checkinBusy': 'I’m here — it’s packed',
  'venue.notFound': 'Venue not found',

  // City
  'city.title': 'Karachi Tonight',
  'city.meanNow': 'mean utilisation right now',
  'city.meanWeek': 'mean utilisation across a full week',
  'city.idleSeats': 'seats empty at this moment',
  'city.rightNow': 'Right now',

  // Group
  'group.lobby': 'Group lobby',
  'group.dignity': 'The dignity constraint',
  'group.enterMine': 'Enter my constraints',
  'group.mine': 'Your constraints',
  'group.private': 'Private to you',
  'group.onlyYou': 'Only you can see this',
  'group.budget': 'Most I can spend',
  'group.travel': 'Furthest I’ll travel',
  'group.mood': 'Mood',
  'group.diet': 'Can’t eat',
  'group.solved': 'Solved',
  'group.answer': 'The answer',
  'group.satisfaction': 'Satisfaction per member',
  'group.runnersUp': 'Runners-up',
  'group.solveAgain': 'Solve again',

  // Staff
  'staff.title': 'Staff console',
  'staff.howFull': 'How full are you right now?',
  'staff.waitFor': 'Wait for a table',
  'staff.send': 'Send update',
  'staff.today': 'Today, free for you',
  'staff.access': 'Staff access',
  'staff.activate': 'Activate this device',
  'staff.deviceLabel': 'Device label',

  // Bands
  'band.free': 'Free',
  'band.moderate': 'Steady',
  'band.busy': 'Busy',
  'band.full': 'Full',

  // Partner
  'partner.yieldOpp': 'Yield opportunity detected',
  'partner.publishOffer': 'Publish this offer',
  'partner.confirmPublish': 'Yes, publish it',
  'partner.pricePosition': 'Price position vs',
  'partner.utilisationNow': 'Utilisation now',
  'partner.coversSent': 'Verified covers sent',
  'partner.covers7': 'Covers, last 7 days',

  // Auth
  'auth.verifyTitle': 'Sign in',
  'auth.verifySubtitle': 'Magic link verification',
  'auth.verifying': 'Verifying your link...',
  'auth.success': 'You are signed in. Redirecting...',
  'auth.invalidLink': 'This link is invalid or has expired.',
  'auth.noToken': 'No verification token provided.',
  'auth.returnHome': 'Return home',

  // Offline
  'offline.label': 'offline',
  'offline.lastKnown': 'last known {minutes} minutes ago',
} as const;

export type TranslationKey = keyof typeof en;
