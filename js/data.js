/* Example families (fictional) and preset decisions. */
const FAMILIES = {
  mansoori: {
    name: { en: 'Al Mansoori family', ar: 'عائلة المنصوري' }, place: { en: 'Abu Dhabi · 5 people', ar: 'أبوظبي · 5 أفراد' },
    members: [
      { id: 'khalid', role: 'father', g: 'm', name: { en: 'Khalid', ar: 'خالد' }, age: 44, job: { en: 'Engineer', ar: 'مهندس' },
        routine: { en: 'Works 8:00–17:00 · 30 min drive', ar: 'يعمل 8:00–17:00 · 30 دقيقة قيادة' },
        traits: { social: .55, resilience: .6, screen: .45 }, baseCommute: 30, workStart: 8, workEnd: 17, workEndFri: 13, sleep: [23, 6], sleepWk: [24, 8], chores: [], choresWk: [[10, 11]] },
      { id: 'fatima', role: 'mother', g: 'f', name: { en: 'Fatima', ar: 'فاطمة' }, age: 40, job: { en: 'Government employee', ar: 'موظفة حكومية' },
        routine: { en: 'Works 7:30–15:30 · 30 min drive', ar: 'تعمل 7:30–15:30 · 30 دقيقة قيادة' },
        traits: { social: .7, resilience: .55, screen: .3 }, baseCommute: 30, workStart: 7.5, workEnd: 15.5, workEndFri: 12, sleep: [22, 5.5], sleepWk: [23, 7], chores: [[16.5, 18], [19, 20]], choresWk: [[9.5, 12], [18.5, 19.5]] },
      { id: 'omar', role: 'teen', g: 'm', name: { en: 'Omar', ar: 'عمر' }, age: 15, job: { en: 'Grade 10', ar: 'الصف العاشر' },
        routine: { en: 'School 7:00–14:30 · homework 16:00–18:00', ar: 'المدرسة 7:00–14:30 · الواجبات 16:00–18:00' },
        traits: { social: .45, resilience: .5, screen: .8 } },
      { id: 'layla', role: 'child', g: 'f', name: { en: 'Layla', ar: 'ليلى' }, age: 9, job: { en: 'Grade 4', ar: 'الصف الرابع' },
        routine: { en: 'School 7:00–13:30 · needs homework help 15:30–17:00', ar: 'المدرسة 7:00–13:30 · تحتاج مساعدة في الواجبات 15:30–17:00' },
        traits: { social: .8, resilience: .5, screen: .5 } },
      { id: 'hessa', role: 'elder', g: 'f', lives: 'nearby', name: { en: 'Grandma Hessa', ar: 'الجدة حصة' }, age: 72, job: { en: 'Lives alone, 10 min away', ar: 'تعيش وحدها على بعد 10 دقائق' },
        routine: { en: 'Family visits on Wednesday evening and Saturday', ar: 'تزورها العائلة مساء الأربعاء ويوم السبت' },
        traits: { social: .85, resilience: .6, screen: .1 } }
    ]
  },
  newlyweds: {
    name: { en: 'Rashed & Noura', ar: 'راشد ونورة' }, place: { en: 'Al Ain · married 4 months', ar: 'العين · متزوجان منذ 4 أشهر' },
    members: [
      { id: 'rashed', role: 'husband', g: 'm', name: { en: 'Rashed', ar: 'راشد' }, age: 27, job: { en: 'Police officer', ar: 'ضابط شرطة' },
        routine: { en: 'Works 7:00–15:00 · 25 min drive', ar: 'يعمل 7:00–15:00 · 25 دقيقة قيادة' },
        traits: { social: .6, resilience: .6, screen: .55 }, baseCommute: 25, workStart: 7, workEnd: 15, workEndFri: 12, sleep: [23.5, 6], sleepWk: [0.5, 8.5], chores: [[20, 20.5]], choresWk: [[10, 11]] },
      { id: 'noura', role: 'wife', g: 'f', name: { en: 'Noura', ar: 'نورة' }, age: 25, job: { en: 'Bank analyst', ar: 'محللة مالية في بنك' },
        routine: { en: 'Works 8:00–16:00 · 40 min drive', ar: 'تعمل 8:00–16:00 · 40 دقيقة قيادة' },
        traits: { social: .75, resilience: .55, screen: .5 }, baseCommute: 40, workStart: 8, workEnd: 16, workEndFri: 12, sleep: [23, 6], sleepWk: [0.5, 8.5], chores: [[17.5, 18.5]], choresWk: [[10, 12]] }
    ]
  }
};

const SCENARIOS = [
  { id: 'dubaiJob', fam: ['mansoori'], icon: 'car',
    title: { en: 'Dad takes a new job in Dubai', ar: 'الأب يقبل وظيفة جديدة في دبي' },
    desc: { en: 'Higher salary, but a 1 h 45 min drive each way from Abu Dhabi.', ar: 'راتب أعلى، لكن ساعة و45 دقيقة قيادة في كل اتجاه من أبوظبي.' },
    effects: [{ type: 'commute', member: 'khalid', minutesEachWay: 105 }, { type: 'finance', member: 'khalid', delta: -0.12 }, { type: 'finance', member: 'fatima', delta: -0.08 }] },
  { id: 'grandmaIn', fam: ['mansoori'], icon: 'home',
    title: { en: 'Grandma Hessa moves in with us', ar: 'الجدة حصة تنتقل للعيش معنا' },
    desc: { en: 'She stops living alone. Omar gives his room to her.', ar: 'لن تعيش وحدها بعد الآن، ويعطيها عمر غرفته.' },
    effects: [{ type: 'elderLives', value: 'home' }, { type: 'privacyLoss', member: 'omar', value: 0.2 }] },
  { id: 'baby', fam: ['mansoori'], icon: 'baby',
    title: { en: 'We are expecting a new baby', ar: 'ننتظر مولودًا جديدًا' },
    desc: { en: 'Fatima takes maternity leave. Nights get short.', ar: 'تأخذ فاطمة إجازة أمومة، وتقصر ساعات النوم.' },
    effects: [{ type: 'baby', member: 'fatima' }] },
  { id: 'phonesOff', fam: ['mansoori', 'newlyweds'], icon: 'phone',
    title: { en: 'No phones from 7 to 9 PM', ar: 'لا هواتف من 7 إلى 9 مساءً' },
    desc: { en: 'A house rule for everyone, parents included.', ar: 'قاعدة للبيت كله، بما في ذلك الوالدان.' },
    effects: [{ type: 'phonesOff', from: 19, to: 21 }] },
  { id: 'masters', fam: ['mansoori'], icon: 'book',
    title: { en: "Mom starts a Master's degree", ar: 'الأم تبدأ دراسة الماجستير' },
    desc: { en: 'Evening classes on Monday and Wednesday, plus study time.', ar: 'محاضرات مسائية يومي الاثنين والأربعاء، ووقت للمذاكرة.' },
    effects: [{ type: 'eveningOut', member: 'fatima', days: [0, 2], from: 17, to: 21 }, { type: 'study', member: 'fatima' }, { type: 'finance', member: 'fatima', delta: 0.04 }] },
  { id: 'moveFar', fam: ['mansoori'], icon: 'villa',
    title: { en: 'We move to a bigger villa farther out', ar: 'ننتقل إلى فيلا أكبر في منطقة أبعد' },
    desc: { en: 'More space, but 40 extra minutes to work and school, and farther from Grandma.', ar: 'مساحة أكبر، لكن 40 دقيقة إضافية للعمل والمدرسة، وبُعد عن الجدة.' },
    effects: [{ type: 'commute', member: 'khalid', minutesEachWay: 70 }, { type: 'commute', member: 'fatima', minutesEachWay: 70 }, { type: 'kidsBus', extraMinutes: 30 }, { type: 'elderLives', value: 'far' }, { type: 'space', value: 0.08 }, { type: 'finance', member: 'khalid', delta: 0.05 }] },
  { id: 'inlaws', fam: ['newlyweds'], icon: 'people',
    title: { en: "We move in with Rashed's parents", ar: 'ننتقل للعيش مع والدي راشد' },
    desc: { en: 'Save on rent and get family support, but less privacy in year one.', ar: 'توفير في الإيجار ودعم من العائلة، لكن خصوصية أقل في السنة الأولى.' },
    effects: [{ type: 'inlaws' }, { type: 'finance', member: 'rashed', delta: -0.15 }, { type: 'finance', member: 'noura', delta: -0.12 }] },
  { id: 'nightShifts', fam: ['newlyweds'], icon: 'moon',
    title: { en: 'Rashed starts rotating night shifts', ar: 'راشد يبدأ مناوبات ليلية' },
    desc: { en: 'Three nights a week, 7 PM to 7 AM, for a promotion.', ar: 'ثلاث ليالٍ في الأسبوع، من 7 مساءً إلى 7 صباحًا، مقابل ترقية.' },
    effects: [{ type: 'nightShift', member: 'rashed', days: [0, 1, 2] }, { type: 'finance', member: 'rashed', delta: -0.08 }, { type: 'finance', member: 'noura', delta: -0.05 }] },
  { id: 'nouraNear', fam: ['newlyweds'], icon: 'pin',
    title: { en: 'Noura moves to a branch near home', ar: 'نورة تنتقل إلى فرع قريب من البيت' },
    desc: { en: 'Her drive drops from 40 to 15 minutes, with a small pay cut.', ar: 'تقل مسافة قيادتها من 40 إلى 15 دقيقة، مع تخفيض بسيط في الراتب.' },
    effects: [{ type: 'commute', member: 'noura', minutesEachWay: 15 }, { type: 'finance', member: 'noura', delta: 0.04 }] }
];

if (typeof module !== 'undefined') module.exports = { FAMILIES, SCENARIOS };
