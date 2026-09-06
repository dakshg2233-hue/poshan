/* =========================================================================
   Poshan Engine — profile -> daily targets -> meal targets -> thali portions
   Zero dependencies. Works as ESM, CommonJS or a browser global.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.PoshanEngine = factory(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- reference tables ------------------------------------------ */

  var ACTIVITY = {
    sedentary: { label: 'Sedentary',   hint: 'Desk job, little walking',      factor: 1.20,  proteinPerKg: 1.0 },
    light:     { label: 'Light',       hint: '1-3 easy sessions a week',      factor: 1.375, proteinPerKg: 1.2 },
    moderate:  { label: 'Moderate',    hint: '3-5 workouts a week',           factor: 1.55,  proteinPerKg: 1.4 },
    active:    { label: 'Very active', hint: '6-7 workouts or physical job',  factor: 1.725, proteinPerKg: 1.6 },
    athlete:   { label: 'Athlete',     hint: 'Twice-a-day training',          factor: 1.90,  proteinPerKg: 1.9 }
  };

  var GOALS = {
    lose:     { label: 'Lose fat', kcalDelta: -0.18, proteinBoost: 0.35, fatPct: 0.28 },
    maintain: { label: 'Maintain', kcalDelta:  0.00, proteinBoost: 0.00, fatPct: 0.28 },
    gain:     { label: 'Build',    kcalDelta:  0.14, proteinBoost: 0.20, fatPct: 0.26 }
  };

  var MEALS = {
    breakfast: { label: 'Breakfast', share: 0.24 },
    lunch:     { label: 'Lunch',     share: 0.36 },
    dinner:    { label: 'Dinner',    share: 0.30 },
    snack:     { label: 'Snack',     share: 0.12 }
  };

  /* Per 100 g as served. veg = vegetable-equivalent fraction (vitamin axis).
     share  = the slice of the meal's energy this dish carries on a balanced
              thali. These are what stop the solver from serving three katoris
              of rice and a spoon of dal just because the arithmetic works out.
     floorG = never serve less than this if the dish is on the plate at all.
     max    = the most a person will realistically eat in one sitting.        */
  var FOODS = [
    { id:'roti',  slot:'roti',  name:'Phulka roti',    axis:'carbs',
      per100:{kcal:264,protein:9.0,carbs:48,fat:4.5,fiber:6.5,calcium:30,veg:0},
      share:0.17, floorG:0,  max:280, step:35,  unitG:35,  unit:'roti',    unitPlural:'rotis' },

    { id:'rice',  slot:'rice',  name:'Steamed rice',   axis:'carbs',
      per100:{kcal:130,protein:2.7,carbs:28,fat:0.3,fiber:0.4,calcium:10,veg:0},
      share:0.17, floorG:0,  max:360, step:15,  unitG:150, unit:'katori',  unitPlural:'katoris' },

    { id:'dal',   slot:'dal',   name:'Dal tadka',      axis:'fiber',
      per100:{kcal:116,protein:6.5,carbs:16,fat:2.8,fiber:4.6,calcium:25,veg:0.15},
      share:0.17, floorG:60, max:360, step:10,  unitG:150, unit:'katori',  unitPlural:'katoris' },

    { id:'sabzi', slot:'sabzi', name:'Matar paneer',   axis:'protein',
      per100:{kcal:162,protein:8.6,carbs:8,fat:10.5,fiber:3.0,calcium:208,veg:0.55},
      share:0.21, floorG:50, max:320, step:10,  unitG:150, unit:'katori',  unitPlural:'katoris',
      vegan:{ name:'Tofu matar', per100:{kcal:148,protein:11.5,carbs:7,fat:8.6,fiber:3.2,calcium:230,veg:0.55} } },

    { id:'curd',  slot:'curd',  name:'Dahi',           axis:'calcium',
      per100:{kcal:61,protein:3.5,carbs:4.7,fat:3.3,fiber:0,calcium:125,veg:0},
      share:0.11, floorG:0,  max:300, step:10,  unitG:150, unit:'katori',  unitPlural:'katoris',
      vegan:{ name:'Soy curd', per100:{kcal:54,protein:3.3,carbs:4,fat:2.8,fiber:0.3,calcium:120,veg:0} } },

    /* Salad is anchored to the vitamin target, not to an energy share -
       nobody eats kachumber for the calories.                                */
    { id:'salad', slot:'salad', name:'Kachumber',      axis:'vitamins',
      per100:{kcal:26,protein:1.0,carbs:5,fat:0.2,fiber:1.8,calcium:26,veg:1},
      share:0.04, vegAnchor:0.7, floorG:40, max:280, step:10, unitG:80, unit:'bowl', unitPlural:'bowls' },

    { id:'nuts',  slot:'nuts',  name:'Nuts & seeds',   axis:'fat',
      per100:{kcal:600,protein:20,carbs:20,fat:50,fiber:8,calcium:250,veg:0},
      share:0.06, floorG:0,  max:45,  step:5,   unitG:15,  unit:'handful', unitPlural:'handfuls' },

    { id:'ghee',  slot:'ghee',  name:'Ghee',           axis:'fat',
      per100:{kcal:900,protein:0,carbs:0,fat:100,fiber:0,calcium:0,veg:0},
      share:0.04, floorG:0,  max:15,  step:2.5, unitG:5,   unit:'tsp',     unitPlural:'tsp' }
  ];

  var NUTRIENTS = ['kcal','protein','carbs','fat','fiber','calcium'];
  /* How hard the solver fights for each nutrient. Protein and energy lead.  */
  var WEIGHTS   = { kcal:3.4, protein:3.2, carbs:0.7, fat:0.6, fiber:0.7, calcium:0.7 };
  /* How hard a dish resists being pulled away from its balanced-thali share. */
  var SHAPE_W   = 0.40;

  /* ---------- small helpers --------------------------------------------- */

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function snap(v, step)  { return Math.round(v / step) * step; }
  function r1(v)          { return Math.round(v * 10) / 10; }

  /* ---------- the person ------------------------------------------------- */

  function bmi(p) { var h = p.height / 100; return p.weight / (h * h); }

  /** Mifflin-St Jeor. 'other' sits between the male and female constants. */
  function bmr(p) {
    var base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
    if (p.sex === 'male')   return base + 5;
    if (p.sex === 'female') return base - 161;
    return base - 78;
  }

  /** Protein tracks lean mass, so weight above BMI 25 only counts a quarter. */
  function referenceWeight(p) {
    var h = p.height / 100, w25 = 25 * h * h;
    return p.weight <= w25 ? p.weight : w25 + 0.25 * (p.weight - w25);
  }

  function dailyTargets(p) {
    var act  = ACTIVITY[p.activity] || ACTIVITY.moderate;
    var goal = GOALS[p.goal] || GOALS.maintain;
    var b    = bmr(p);
    var tdee = b * act.factor;
    var kcal = Math.round(tdee * (1 + goal.kcalDelta) / 10) * 10;
    var rw   = referenceWeight(p);

    var protein = Math.round(clamp(rw * (act.proteinPerKg + goal.proteinBoost), 45, 230));
    var fat     = Math.round(kcal * goal.fatPct / 9);
    var carbs   = Math.round(Math.max(kcal * 0.12, kcal - protein * 4 - fat * 9) / 4);
    var fiber   = Math.round(clamp(14 * kcal / 1000, 22, 48));
    /* ICMR-NIN / IOM style calcium RDA bands */
    var calcium = (p.age <= 18 || p.age >= 50) ? 1200 : 1000;
    var water   = Math.round((35 * p.weight + (act.factor - 1.2) * 900) / 50) * 50;

    return {
      bmr: Math.round(b), tdee: Math.round(tdee), kcal: kcal,
      protein: protein, carbs: carbs, fat: fat, fiber: fiber, calcium: calcium,
      water: water, glasses: Math.max(6, Math.round(water / 250)),
      bmi: r1(bmi(p))
    };
  }

  function mealTargets(daily, mealKey) {
    var m = MEALS[mealKey] || MEALS.lunch, s = m.share, t = {};
    NUTRIENTS.forEach(function (k) { t[k] = daily[k] * s; });
    t.veg = clamp(120 * t.kcal / 600, 70, 260);   /* vegetable-equivalent grams */
    t.share = s; t.label = m.label; t.key = mealKey;
    return t;
  }

  /* ---------- the plate --------------------------------------------------- */

  function resolveFoods(prefs) {
    prefs = prefs || {};
    return FOODS.map(function (f) {
      var out = {};
      for (var k in f) out[k] = f[k];
      if (prefs.diet === 'vegan') {
        if (f.vegan) { out.name = f.vegan.name; out.per100 = f.vegan.per100; }
        if (f.id === 'ghee') { out.name = 'Cold-pressed oil'; }
      }
      if (prefs.skip && prefs.skip.indexOf(f.id) !== -1) { out.max = 0; out.floorG = 0; out.share = 0; }
      return out;
    });
  }

  /**
   * The grams of each dish on a *balanced* thali of this size - before the
   * person's own numbers bend it. Energy shares are renormalised over
   * whatever is actually on the plate, so skipping rice grows the rotis.
   */
  function anchorsFor(foods, T) {
    var live = foods.filter(function (f) { return f.max > 0; });
    var sum = 0;
    live.forEach(function (f) { if (!f.vegAnchor) sum += f.share; });
    var norm = sum > 0 ? (1 - 0.04) / sum : 1;   /* 4% is the salad's own energy */
    return foods.map(function (f) {
      if (f.max <= 0) return 0;
      var g = f.vegAnchor
        ? T.veg * f.vegAnchor
        : (T.kcal * f.share * norm) / (f.per100.kcal / 100);
      return clamp(g, 0, f.max);
    });
  }

  function boundsFor(foods, anchors) {
    return foods.map(function (f, i) {
      if (f.max <= 0) return [0, 0];
      var hi = Math.min(f.max, Math.max(anchors[i] * 2.1, f.floorG * 1.5, f.unitG));
      var lo = Math.min(Math.max(f.floorG, anchors[i] * 0.45), hi);
      return [lo, hi];
    });
  }

  function totalsOf(foods, x) {
    var t = { kcal:0, protein:0, carbs:0, fat:0, fiber:0, calcium:0, veg:0 };
    for (var i = 0; i < foods.length; i++) {
      var p = foods[i].per100, g = x[i] / 100;
      t.kcal += p.kcal*g; t.protein += p.protein*g; t.carbs += p.carbs*g;
      t.fat += p.fat*g;   t.fiber += p.fiber*g;     t.calcium += p.calcium*g;
      t.veg += (p.veg||0) * x[i];
    }
    return t;
  }

  /**
   * Coordinate descent on weighted squared relative error, plus a shape term
   * that holds each dish near its balanced-thali anchor. Each pass solves one
   * dish's grams exactly - the objective is quadratic in a single portion -
   * then clamps it back inside its bounds. Milliseconds, and fully
   * deterministic: the same profile always gets the same thali.
   */
  function solvePortions(foods, T) {
    var n = foods.length;
    var anchors = anchorsFor(foods, T);
    var bounds  = boundsFor(foods, anchors);
    var fixed   = [];
    var x = anchors.map(function (a, i) { fixed.push(false); return clamp(a, bounds[i][0], bounds[i][1]); });

    function pass(iters) {
      for (var it = 0; it < iters; it++) {
        for (var i = 0; i < n; i++) {
          if (fixed[i] || foods[i].max <= 0) { x[i] = clamp(x[i], bounds[i][0], bounds[i][1]); continue; }
          var A = 0, B = 0;
          for (var k = 0; k < NUTRIENTS.length; k++) {
            var key = NUTRIENTS[k], tgt = T[key] || 1, w = WEIGHTS[key];
            var a = foods[i].per100[key] / 100, rest = 0;
            for (var j = 0; j < n; j++) if (j !== i) rest += foods[j].per100[key] / 100 * x[j];
            A += w * a * a / (tgt * tgt);
            B += w * a * (rest - tgt) / (tgt * tgt);
          }
          /* vitamin axis: salad and sabzi are the only levers */
          var av = (foods[i].per100.veg || 0), tv = T.veg || 1;
          if (av > 0) {
            var restV = 0;
            for (var j2 = 0; j2 < n; j2++) if (j2 !== i) restV += (foods[j2].per100.veg || 0) * x[j2];
            A += 0.9 * av * av / (tv * tv);
            B += 0.9 * av * (restV - tv) / (tv * tv);
          }
          /* shape: resist drifting away from the balanced-thali anchor */
          var an = anchors[i];
          if (an > 1) { A += SHAPE_W / (an * an); B += -SHAPE_W / an; }

          x[i] = clamp(A > 1e-9 ? -B / A : x[i], bounds[i][0], bounds[i][1]);
        }
      }
    }

    pass(60);
    /* countable items land on whole units first, then the rest re-balances */
    foods.forEach(function (f, i) {
      if (f.id === 'roti' || f.id === 'nuts' || f.id === 'ghee') {
        x[i] = clamp(snap(x[i], f.step), 0, f.max); fixed[i] = true;
      }
    });
    pass(40);
    x = x.map(function (v, i) {
      var g = clamp(snap(v, foods[i].step), 0, foods[i].max);
      return g < foods[i].unitG * 0.2 ? 0 : g;   /* drop crumbs off the plate */
    });
    return x;
  }

  /* ---------- scoring ----------------------------------------------------- */

  /** 5 points inside the sweet band, tapering to 0 at the outer edges. */
  function axisScore(ratio, band) {
    band = band || {};
    var lo = band.lo || 0.90, hi = band.hi || 1.12,
        floorLo = band.floorLo || 0.52, floorHi = band.floorHi || 1.80;
    if (ratio >= lo && ratio <= hi) return 5;
    if (ratio < lo)  return 5 * clamp((ratio - floorLo) / (lo - floorLo), 0, 1);
    return 5 * clamp((floorHi - ratio) / (floorHi - hi), 0, 1);
  }

  function axisWord(score, ratio) {
    if (score >= 4.4) return 'Great';
    if (score >= 3.4) return 'Good';
    if (score >= 2.2) return ratio < 1 ? 'Light' : 'Heavy';
    return ratio < 1 ? 'Low' : 'High';
  }

  var AXES = [
    { key:'protein',  label:'Protein',  from:'protein', target:'protein' },
    { key:'carbs',    label:'Carbs',    from:'carbs',   target:'carbs',   band:{ lo:0.85, hi:1.15, floorHi:1.7 } },
    { key:'fiber',    label:'Fiber',    from:'fiber',   target:'fiber',   band:{ lo:0.88, hi:1.45, floorHi:3.0 } },
    { key:'calcium',  label:'Calcium',  from:'calcium', target:'calcium', band:{ lo:0.85, hi:1.35, floorHi:2.4 } },
    { key:'vitamins', label:'Vitamins', from:'veg',     target:'veg',     band:{ lo:0.85, hi:1.60, floorHi:3.0 } }
  ];

  function scoreThali(totals, T) {
    var out = { axes: {}, total: 0 };
    AXES.forEach(function (a) {
      var ratio = (totals[a.from] || 0) / (T[a.target] || 1);
      var s = axisScore(ratio, a.band);
      out.axes[a.key] = { label: a.label, score: r1(s), ratio: r1(ratio), word: axisWord(s, ratio) };
      out.total += s;
    });
    out.total = Math.round(out.total * 10) / 10;
    out.rounded = Math.round(out.total);
    out.label = out.total >= 22 ? 'Great choice'
              : out.total >= 18 ? 'Well balanced'
              : out.total >= 14 ? 'Getting there'
              : 'Needs a tweak';
    return out;
  }

  /* ---------- portion wording -------------------------------------------- */

  var FRACTIONS = [[0,''],[0.25,'¼'],[0.5,'½'],[0.75,'¾']];

  function unitText(food, grams) {
    if (grams <= 0) return 'skipped';
    var n = grams / food.unitG;
    if (food.unit === 'roti' || food.unit === 'tsp' || food.unit === 'handful') {
      var c = Math.round(n * 2) / 2;
      var label = (c === 1 ? food.unit : food.unitPlural);
      var txt = (c % 1) ? (c > 1 ? Math.floor(c) + '½' : '½') : String(c);
      return txt + ' ' + label;
    }
    var whole = Math.floor(n + 1e-6), frac = n - whole;
    var best = FRACTIONS[0];
    FRACTIONS.forEach(function (f) { if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f; });
    var text = (whole ? String(whole) : '') + best[1];
    if (!text) text = '¼';
    return text + ' ' + (n <= 1.3 ? food.unit : food.unitPlural);
  }

  /* ---------- advice ------------------------------------------------------ */

  function buildSuggestions(plan, byId) {
    var a = plan.score.axes, tips = [], T = plan.targets, t = plan.totals;

    if (a.protein.ratio < 0.92) {
      tips.push({ icon:'protein', text: plan.prefs.diet === 'vegan'
        ? 'Protein is short - another 50 g of tofu or a scoop of sprouts closes the gap.'
        : 'Protein is short - add 50 g paneer, or stir a spoon of curd into the dal.' });
    }
    if (a.calcium.ratio < 0.9)  tips.push({ icon:'calcium', text:'Calcium is under target. One katori of ' + byId.curd.name.toLowerCase() + ' carries about ' + Math.round(byId.curd.unitG * byId.curd.per100.calcium / 100) + ' mg.' });
    if (a.fiber.ratio  < 0.9)   tips.push({ icon:'fiber',   text:'Swap half the rice for one more phulka - whole wheat brings about 6.5 g fiber per 100 g.' });
    if (a.vitamins.ratio < 0.9) tips.push({ icon:'veg',     text:'Pile the kachumber higher. Raw salad is the cheapest way to lift the vitamin score.' });
    if (t.fat / T.fat < 0.85)   tips.push({ icon:'fat',     text:'Add a handful of nuts or seeds to bring healthy fats up.' });
    if (t.fat / T.fat > 1.25)   tips.push({ icon:'fat',     text:'Fats are running high - go easy on the ghee and keep the sabzi drier.' });
    if (a.carbs.ratio > 1.2)    tips.push({ icon:'carbs',   text:'Carbs are heavy for this meal. Drop one roti and keep the dal as it is.' });

    if (plan.profile.goal === 'lose') tips.push({ icon:'goal', text:'Eat the salad and dal first - volume before starch keeps this deficit comfortable.' });
    if (plan.profile.goal === 'gain') tips.push({ icon:'goal', text:'Building phase: keep the ghee, and add a glass of milk alongside this thali.' });
    if (plan.daily.bmi >= 25)         tips.push({ icon:'goal', text:'BMI ' + plan.daily.bmi + ' - protein here is set on lean mass, not scale weight. That is deliberate.' });

    tips.push({ icon:'water', text:'Aim for ' + plan.daily.glasses + ' glasses of water today - about ' + (plan.daily.water / 1000).toFixed(1) + ' L for your weight and activity.' });

    var weakest = 5;
    Object.keys(a).forEach(function (k) { weakest = Math.min(weakest, a[k].score); });
    if (weakest >= 4.4) tips.unshift({ icon:'star', text:'This thali hits every axis. Repeat it and you have a template, not a one-off.' });

    return tips.slice(0, 5);
  }

  /* ---------- the whole plan ---------------------------------------------- */

  function buildPlan(profile, options) {
    options = options || {};
    var prefs  = options.prefs || {};
    var daily  = dailyTargets(profile);
    var T      = mealTargets(daily, options.meal || 'lunch');
    var foods  = resolveFoods(prefs);
    var grams  = solvePortions(foods, T);
    var totals = totalsOf(foods, grams);

    var byId = {};
    var items = foods.map(function (f, i) {
      byId[f.id] = f;
      var g = grams[i], k = g / 100;
      return {
        id: f.id, slot: f.slot, name: f.name, axis: f.axis,
        grams: Math.round(g),
        units: unitText(f, g),
        fill: f.max > 0 ? clamp(g / f.max, 0, 1) : 0,
        kcal: Math.round(f.per100.kcal * k),
        protein: r1(f.per100.protein * k),
        carbs:   r1(f.per100.carbs * k),
        fat:     r1(f.per100.fat * k),
        fiber:   r1(f.per100.fiber * k),
        calcium: Math.round(f.per100.calcium * k)
      };
    });

    var plan = {
      profile: profile, prefs: prefs, daily: daily,
      meal: { key: T.key, label: T.label, share: T.share },
      targets: {
        kcal: Math.round(T.kcal), protein: Math.round(T.protein), carbs: Math.round(T.carbs),
        fat: Math.round(T.fat), fiber: Math.round(T.fiber), calcium: Math.round(T.calcium),
        veg: Math.round(T.veg)
      },
      totals: {
        kcal: Math.round(totals.kcal), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat), fiber: Math.round(totals.fiber), calcium: Math.round(totals.calcium),
        veg: Math.round(totals.veg)
      },
      items: items
    };
    plan.score = scoreThali(totals, T);

    /* Where the plate physically cannot reach the target - worth saying out
       loud rather than quietly serving an impossible portion.               */
    plan.gaps = [];
    [['protein','g'],['calcium','mg'],['fiber','g'],['kcal','kcal']].forEach(function (pair) {
      var k = pair[0], short = plan.targets[k] - plan.totals[k];
      if (short > plan.targets[k] * 0.12) {
        plan.gaps.push({ key: k, short: Math.round(short), unit: pair[1] });
      }
    });

    plan.suggestions = buildSuggestions(plan, byId);
    return plan;
  }

  return {
    ACTIVITY: ACTIVITY, GOALS: GOALS, MEALS: MEALS, FOODS: FOODS,
    bmr: bmr, bmi: bmi, dailyTargets: dailyTargets, mealTargets: mealTargets,
    solvePortions: solvePortions, scoreThali: scoreThali, buildPlan: buildPlan
  };
});
