// Strings of the washer-panel widget and machine localisation, ported from washguide (src/i18n.js).
// Russian is the source language of the machine data; English comes from each machine's optional
// `en` block and falls back to Russian field by field. Shared by render.js and the browser.

const num = (lang, v) => (lang === 'ru' ? String(v).replace('.', ',') : String(v));

export const T = {
  ru: {
    min: (m) => `${m} мин`,
    hm: (h, m) => (m ? `${h} ч ${m} мин` : `${h} ч`),
    num: (v) => num('ru', v),
    symbolNames: {
      power: 'питание', 'half-load': 'половинная загрузка', 'water-stop': 'остановка с водой', 'no-spin': 'без отжима',
      spin: 'отжим', rinse: 'полоскание', 'extra-rinse': 'дополнительное полоскание', prewash: 'предварительная стирка',
      eco: 'экономия', intensive: 'интенсивная стирка', start: 'старт', drain: 'слив', delicate: 'деликатная', wool: 'шерсть'
    },
    end: { stop: 'Остановится сама и сольёт воду', 'water-stop': 'Остановится с водой в баке', drain: 'Сольёт воду и остановится' },
    phase: { heat: 'Нагрев', prewash: 'Предстирка', wash: 'Стирка', rinse: 'Полоскания', softener: 'Кондиционер', spin: 'Отжим', drain: 'Слив', soak: 'Замачивание', pause: 'Пауза' },
    cStop: 'Ручка программ стоит на точке стопа: машина ничего не будет делать. Поверните её на номер программы.',
    cNoHeat: 'Эта программа не греет воду: ручка температуры ни на что не влияет.',
    cTempMax: (p, max, t) => `Для программы ${p} не выше ${max} °C, выбрано ${t} °C.`,
    cNoSpin: 'Программа не отжимает: ручка отжима ни на что не влияет.',
    cSpinMax: (max, r) => `Для этой ткани отжим не выше ${max} об/мин, выбрано ${r}.`,
    cOption: (b) => `Кнопка «${b}» с этой программой не используется.`,
    cNoData: 'Для этого положения нет данных о программе.',
    cNoHeatHere: 'На этом участке цикла вода не нагревается: температура не влияет.',
    pressed: 'нажата', released: 'отжата',
    use: { prewash: 'Предстирка', main: 'Основная стирка', softener: 'Кондиционер', bleach: 'Отбеливатель', starch: 'Крахмал' },
    marks: { flower: 'цветок', 'triangle-cl': 'треугольник CL', asterisk: 'звёздочка' },
    slotNeeded: 'Нужно', slotEmpty: 'Пусто', trayFront: 'Ручка лотка — к вам',
    endChip: { stop: 'стоп', 'water-stop': 'с водой' },
    page: 'стр.', ok: 'Конфликтов нет: так можно запускать.',
    viaButton: '. Чтобы слить и отжать, отожмите кнопку остановки с водой.',
    contAfter: (spin, drain) => `. Чтобы продолжить: выключите машину, поверните ручку программ на ${spin}${drain ? ` (или ${drain}, только слив)` : ''} и включите снова.`,
    manual: (t, c) => `по инструкции: ${t}${c != null ? ` при ${c} °C` : ''}`,
    estimate: 'оценка',
    pathKnob: 'Путь ручки программ: от выбранной позиции до остановки',
    pathStages: 'Этапы программы (ручка во время стирки не поворачивается)',
    upToKg: (v) => `, до ${num('ru', v)} кг`,
    roleTitle: { program: 'Программа', temperature: 'Температура', spin: 'Отжим' }, buttons: 'Кнопки',
    powerWord: 'питания',
    cwWarn: (a, b) => `На машине эта ручка крутится только по часовой: чтобы попасть с ${a} на ${b}, проведите её вперёд через точку стопа.`,
    offWarn: (b) => `Поворачивайте при выключенной кнопке ${b}.`,
    // widget chrome
    title: 'Панель машины',
    lead: 'Нажимайте на метки вокруг ручек и на кнопки, на рисунке или в списках под ним. Время, предупреждения и лоток пересчитываются сразу.',
    presets: 'Что стираем?',
    more: (n) => `Ещё ${n}`,
    settings: 'Как выставить',
    result: 'Что будет',
    tray: 'Лоток для моющих средств',
    trayHint: 'Вид спереди, слева направо. Подсвечены отсеки, из которых машина возьмёт средство.',
    panelLabel: (name) => `Панель ${name}: ручки и кнопки`,
    partial: 'Данные неполные.',
    partialLead: 'В найденной инструкции нет части сведений:',
    timeNote: 'Время примерное: шаги таймера плюс нагрев воды ТЭНом. На деле зависит от температуры воды в трубах, загрузки и напряжения в сети.',
    noJs: 'Без JavaScript показана первая подсказка из инструкции. Чтобы крутить ручки на рисунке, включите JavaScript.',
    loadError: 'Не удалось загрузить данные машины. Обновите страницу.'
  },
  en: {
    min: (m) => `${m} min`,
    hm: (h, m) => (m ? `${h} h ${m} min` : `${h} h`),
    num: (v) => num('en', v),
    symbolNames: {
      power: 'power', 'half-load': 'half load', 'water-stop': 'rinse hold', 'no-spin': 'no spin',
      spin: 'spin', rinse: 'rinse', 'extra-rinse': 'extra rinse', prewash: 'prewash',
      eco: 'economy', intensive: 'intensive', start: 'start', drain: 'drain', delicate: 'delicate', wool: 'wool'
    },
    end: { stop: 'Stops by itself and drains', 'water-stop': 'Stops with water in the drum', drain: 'Drains and stops' },
    phase: { heat: 'Heating', prewash: 'Prewash', wash: 'Wash', rinse: 'Rinses', softener: 'Softener', spin: 'Spin', drain: 'Drain', soak: 'Soak', pause: 'Pause' },
    cStop: 'The programme knob is on a stop mark: the machine will do nothing. Turn it to a programme.',
    cNoHeat: 'This programme does not heat water: the temperature knob has no effect.',
    cTempMax: (p, max, t) => `Programme ${p} allows up to ${max} °C; ${t} °C is selected.`,
    cNoSpin: 'This programme does not spin: the spin knob has no effect.',
    cSpinMax: (max, r) => `This fabric allows up to ${max} rpm; ${r} is selected.`,
    cOption: (b) => `The "${b}" button is not used with this programme.`,
    cNoData: 'No programme data for this position.',
    cNoHeatHere: 'Water is not heated on this part of the cycle: the temperature has no effect.',
    pressed: 'pressed', released: 'released',
    use: { prewash: 'Prewash', main: 'Main wash', softener: 'Softener', bleach: 'Bleach', starch: 'Starch' },
    marks: { flower: 'flower', 'triangle-cl': 'CL triangle', asterisk: 'asterisk' },
    slotNeeded: 'Needed', slotEmpty: 'Empty', trayFront: 'Drawer handle — towards you',
    endChip: { stop: 'stop', 'water-stop': 'water' },
    page: 'p.', ok: 'No conflicts: safe to run like this.',
    viaButton: '. To drain and spin, release the rinse-hold button.',
    contAfter: (spin, drain) => `. To continue: switch off, turn the programme knob to ${spin}${drain ? ` (or ${drain} to drain only)` : ''} and switch on again.`,
    manual: (t, c) => `manual: ${t}${c != null ? ` at ${c} °C` : ''}`,
    estimate: 'estimate',
    pathKnob: 'Programme knob path: from the selected position to the stop',
    pathStages: 'Programme stages (the knob does not turn during the wash)',
    upToKg: (v) => `, up to ${v} kg`,
    roleTitle: { program: 'Programme', temperature: 'Temperature', spin: 'Spin' }, buttons: 'Buttons',
    powerWord: 'power',
    cwWarn: (a, b) => `On the machine this knob turns clockwise only: to get from ${a} to ${b}, turn it forward past the stop mark.`,
    offWarn: (b) => `Turn it with the ${b} button released.`,
    title: 'Machine panel',
    lead: 'Tap the marks around the knobs and the buttons, on the drawing or in the lists below it. Time, warnings and the drawer update at once.',
    presets: 'What are you washing?',
    more: (n) => `${n} more`,
    settings: 'How to set it',
    result: 'What happens',
    tray: 'Detergent drawer',
    trayHint: 'Front view, left to right. Highlighted compartments are the ones the machine takes detergent from.',
    panelLabel: (name) => `${name} panel: knobs and buttons`,
    partial: 'Incomplete data.',
    partialLead: 'The manual found lacks some information:',
    timeNote: 'Time is approximate: the timer steps plus heating the water. Real time depends on tap water temperature, load and mains voltage.',
    noJs: 'Without JavaScript the first suggestion from the manual is shown. Turn JavaScript on to turn the knobs on the drawing.',
    loadError: 'Could not load the machine data. Reload the page.'
  }
};

export function L(m) {
  return T[(m && m._lang) || 'ru'];
}

// Deep copy of the machine with English overrides applied. Russian stays where `en` is silent.
export function localize(m, lang) {
  const out = JSON.parse(JSON.stringify(m));
  delete out.en;
  out._lang = lang === 'en' ? 'en' : 'ru';
  if (out._lang === 'ru' || !m.en) return out;
  const en = m.en;
  for (const k of ['summary', 'years']) if (en[k]) out[k] = en[k];
  if (Array.isArray(en.pitfalls) && en.pitfalls.length === (m.pitfalls || []).length) out.pitfalls = en.pitfalls;
  for (const c of out.panel.controls) {
    const e = en.controls?.[c.id];
    if (!e) continue;
    for (const k of ['help', 'name', 'label']) if (e[k]) c[k] = e[k];
    if (e.zones && c.zones) for (const z of c.zones) if (e.zones[z.id]) z.label = e.zones[z.id];
    if (e.positions && c.positions) for (const p of c.positions) if (e.positions[p.value]) p.label = e.positions[p.value];
  }
  if (out.tray && en.tray) {
    if (en.tray.help) out.tray.help = en.tray.help;
    for (const c of out.tray.compartments) if (en.tray.compartments?.[c.id]) c.label = en.tray.compartments[c.id];
  }
  for (const p of out.programs) {
    const e = en.programs?.[p.pos];
    if (e?.name) p.name = e.name;
    if (e?.note) p.note = e.note;
  }
  (out.rules || []).forEach((r, i) => { if (en.rules?.[i]) r.message = en.rules[i]; });
  for (const p of out.presets || []) {
    const e = en.presets?.[p.id];
    if (!e) continue;
    if (e.title) p.title = e.title;
    if (e.note) p.note = e.note;
    if (e.dose) p.dose = { ...p.dose, ...e.dose };
  }
  (out.troubleshooting || []).forEach((t, i) => {
    const e = en.troubleshooting?.[i];
    if (e?.title) t.title = e.title;
    if (e?.causes?.length === t.causes.length) t.causes = e.causes;
  });
  (out.care || []).forEach((c, i) => {
    const e = en.care?.[i];
    if (e) for (const k of ['title', 'text', 'interval']) if (e[k]) c[k] = e[k];
  });
  if (en.notes && out.notes) for (const k of ['assumptions', 'gaps']) if (en.notes[k]?.length) out.notes[k] = en.notes[k];
  (out.sources || []).forEach((s, i) => { if (en.sources?.[i]) s.title = en.sources[i]; });
  return out;
}
