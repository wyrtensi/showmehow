# Формат инструкции

*English version below / [English below](#guide-format).*

Инструкция - это папка `guides/<категория>/<slug>/` с файлом `index.ru.md` (обязателен), по желанию
`index.en.md` и иллюстрациями рядом. Создать заготовку: `npm run new -- категория/slug`. Проверить:
`npm run check`. Полная спецификация - в [spec.md](spec.md), раздел 4; здесь только то, что нужно автору.

## Папка и slug

- Категория - id из `taxonomy/categories.json` (`audio`, `network`, `furniture`...). Папка и поле `category` должны совпадать.
- Slug: латиница, цифры и дефисы, до 60 символов, уникален во всём проекте, читается как задача: `airpods-pair-android`, `ikea-malm-3-drawer-assemble`.

## Заголовок (frontmatter)

Файл начинается со строки `---`, заголовок заканчивается следующей строкой `---`. Поддерживается узкое
подмножество YAML: `ключ: значение`, строки в кавычках, списки `[a, b]` и блочные списки с отступом в
2 пробела, комментарии `#`. Табуляция запрещена.

| Поле | Обяз. | Что писать |
|---|---|---|
| `title` | да | Полная фраза задачи, 10-90 знаков: "Как подключить AirPods к Android". |
| `summary` | да | 40-220 знаков, одно-два предложения: карточка и meta description. Не повторяйте заголовок. |
| `category` | да | id категории. |
| `device` | да | id типа устройства из `taxonomy/devices.json`, он должен относиться к этой категории. |
| `brands` | да | список id брендов из `taxonomy/brands.json`; `[generic]`, если не зависит от бренда. |
| `models` | нет | модели, на которых проверено: `[AirPods 2, AirPods Pro 2]`. |
| `task` | да | id из `taxonomy/tasks.json`: `pair`, `setup`, `assemble`, `install`, `reset`, `maintain`, `fix`, `update`, `transfer`. |
| `difficulty` | да | `easy`, `medium` или `hard`. |
| `time` | да | минуты, 1-600, реалистично для новичка. |
| `tools` | нет | что нужно под рукой: "Крестовая отвёртка PH2". |
| `parts` | нет | для сборки: список `name`, `qty`, `ref` (артикул, необязателен). |
| `aliases` | нет | как ещё ищут: `[эйрподс андроид, airpods android]`. |
| `sources` | да | список `title`, `url` (https), `publisher`; минимум один, производитель первым. |
| `faq` | нет | до 8 пар `q` / `a`: частые проблемы. В `a` можно инлайн-разметку. |
| `updated` | да | `ГГГГ-ММ-ДД`: когда инструкцию проверяли в последний раз. |
| `authors` | да | логины GitHub. |
| `widget` | нет | интерактивный виджет: `type:` и его параметры. |
| `variants` | нет | 2-6 моделей, у которых отличаются отдельные шаги: список `id` (kebab-case) и `name` (до 40 знаков). |
| `draft` | нет | `true` - не попадает в сборку, но проверяется. |

Неизвестные поля и неизвестные id - ошибка. В `index.en.md` читаются только `title`, `summary`, `tools`,
`parts[].name`, `aliases`, `faq`, `sources[].title` и `variants[].name` (те же `id` в том же порядке);
остальное берётся из русского файла.

## Текст

- Текст до первого `## ` - вступление (0-3 коротких абзаца).
- Каждый `## Заголовок` - шаг. Заголовок в повелительном наклонении, 3-80 знаков. Шагов от 3 до 30. Заголовков `# ` быть не должно.
- Один шаг - одно действие. Если в шаге "и" между двумя действиями, разделите его.
- Блоки: абзацы, `### подзаголовок`, списки (`-`, `1.`, один уровень вложенности), блоки кода ``` для точных строк (имя сети, адрес, команда), таблицы с разделителем `|---|`.
- Врезки: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`, дальше строки с `> `.
- Картинка шага - отдельной строкой: `![описание картинки](step-2.svg)`. Не больше одной на шаг; описание обязательно, 10-160 знаков, говорит, что нарисовано.
- Инлайн: `**жирный**`, `*курсив*`, `` `код` ``, `[текст](https://...)`, `<kbd>Win</kbd>`. Путь по интерфейсу: `{{Настройки > Bluetooth > Добавить}}`.
- Любой другой HTML экранируется. Эмодзи запрещены.

## Интерактивные элементы

Всё это необязательно и выглядит как часть текста. Без JavaScript инструкция читается как обычно.

- **Таймер** `{{timer 15s}}`, `{{timer 2m}}`, `{{timer 1m30s}}` - кнопка-чип «15 с» там, где нужно удерживать
  кнопку или подождать. По нажатию идёт обратный отсчёт с кольцом, в конце телефон вибрирует и звучит
  короткий сигнал. От 1 секунды до часа (`1h`).
- **Индикатор** `{{led white blink}}` - огонёк, который мигает так же, как на устройстве. Цвета: `white`,
  `green`, `amber`, `red`, `blue`; режимы: `solid` (горит, можно не писать), `blink`, `fast`, `pulse`,
  `alternate` (два цвета попеременно: `{{led white/amber alternate}}`). Пишите рядом и словами: «индикатор
  {{led white blink}} мигает белым».
- Ошибка в таймере или индикаторе (`{{timer 15}}`, `{{led pink}}`) - ошибка проверки. Всё остальное в `{{ }}` -
  путь по интерфейсу.
- **Модели** - если у части моделей отличаются шаги. В заголовке:

  ```
  variants:
    - id: with-button
      name: Кейс с кнопкой
    - id: touch-case
      name: Сенсорный кейс
  ```

  Шаг только для одной модели: `## Зажмите кнопку {variant=with-button}` (или `{variant=a,b}`). Часть шага:

  ```
  > [!VARIANT touch-case]
  > Дважды коснитесь передней стенки кейса.
  ```

  Над шагом 1 появятся чипы «Ваша модель:»; выбор запоминается и попадает в ссылку (`?v=touch-case`),
  номера шагов и прогресс считают только видимые шаги. Без выбора видно всё, у каждой части подпись с
  названием модели. Проверка: id существуют, у каждой модели есть хотя бы один шаг, в английском файле
  те же id и те же шаги по моделям.
- **Виджет внутри шага** - блок кода с пометкой `widget <тип>`, внутри строки `ключ: значение`:

  ````
  ```widget wifi-qr
  security: WPA
  ```
  ````

  Типы: `wifi-qr` (`security`: `WPA`, `WEP`, `nopass`), `saddle-height` (без параметров), `reminder`
  (`every`: `2w`, `1m`, `3m`, `6m`, `1y`; `title`). Неизвестный тип или параметр - ошибка.
- **Живые картинки.** Анимации `anim-*` играют, только пока шаг на экране. Классом `hot` отметьте деталь,
  на которую надо смотреть: вокруг неё пульсирует кольцо. Картинку можно открыть крупно.

## Иллюстрации

Схематичный плоский рисунок: контур устройства, часть, с которой нужно что-то сделать, стрелка или пульс.
Один и тот же файл служит обоим языкам, поэтому текста на рисунке нет.

- `viewBox="0 0 480 300"` (широкий) или `0 0 300 300`; атрибутов `width` и `height` нет.
- Цвета только классами, никаких `#rrggbb`: `f-paper`, `f-soft`, `f-muted`, `f-ink`, `s-ink`, `f-accent`, `s-accent`, `f-accent-soft`, `f-hl`, `s-hl`, `f-ok`, `f-warn`; анимации `anim-pulse`, `anim-tap`, `anim-nudge`; `hot` отмечает деталь, на которую надо смотреть.
- Обводка 3 для контуров, 2 для деталей, `stroke-linecap="round"` и `stroke-linejoin="round"`.
- Разрешены элементы `svg g path rect circle ellipse line polyline polygon defs marker use title`. Скрипты, `style`, `text`, `image`, `foreignObject`, обработчики `on*` и внешние ссылки отвергаются. До 40 КБ.
- Свои фотографии (`.webp`, `.jpg`, `.png`, до 300 КБ и 1600 px в ширину) допустимы. Фотографии и картинки производителей - нет.

## Английская версия

`index.en.md` повторяет заголовок и тело. Число шагов и картинки в шагах должны совпадать с русским
файлом, иначе ошибка. Без английского файла сайт показывает русский текст с пометкой.

## Полный пример

Учебный пример (ссылка в `sources` показывает вид записи; в настоящей инструкции давайте точную страницу руководства).

`guides/network/tplink-router-first-setup/index.ru.md`:

````markdown
---
title: Как настроить роутер TP-Link в первый раз
summary: Подключите роутер к интернету и компьютеру, зайдите в его меню и задайте имя и пароль Wi-Fi. Займёт около 15 минут.
category: network
device: router
brands: [tp-link]
models: [Archer C6]
task: setup
difficulty: easy
time: 15
tools: [Роутер с блоком питания, Сетевой кабель из комплекта, Кабель интернета от провайдера, Телефон или ноутбук]
aliases: [настроить тплинк, tplink первая настройка, подключить роутер]
sources:
  - title: Руководство пользователя Archer C6
    url: https://www.tp-link.com/ru/support/
    publisher: TP-Link
faq:
  - q: Страница настройки не открывается
    a: Убедитесь, что телефон или ноутбук подключён к этому роутеру, и введите адрес из наклейки на дне роутера, а не из поиска.
  - q: Нет доступа в интернет после настройки
    a: Проверьте, что кабель провайдера вставлен в порт `WAN` (он выделен цветом), и перезагрузите роутер на 30 секунд.
updated: 2026-10-19
authors: [wyrtensi]
---

Роутер раздаёт интернет по Wi-Fi и кабелю. Первую настройку делают один раз; после неё роутер работает сам.

## Поставьте роутер и включите питание

Выберите место посередине квартиры, вдали от микроволновки. Вставьте блок питания и нажмите кнопку питания, если она есть.

## Вставьте кабель провайдера в порт WAN

![Задняя панель роутера, кабель интернета вставлен в выделенный цветом порт WAN](step-2.svg)

Кабель провайдера идёт в порт, подписанный `WAN` или `Internet` (обычно он отличается цветом). Остальные порты - для ваших устройств.

> [!WARNING]
> Не трогайте блок питания и розетку мокрыми руками.

## Подключитесь к сети роутера

Имя сети и пароль напечатаны на наклейке на дне роутера. Выберите сеть в списке Wi-Fi на телефоне и введите пароль.

## Откройте страницу настройки

Откройте браузер и введите адрес с наклейки, например:

```
tplinkwifi.net
```

Задайте пароль администратора, когда роутер попросит.

## Задайте имя и пароль Wi-Fi

Откройте {{Основные настройки > Беспроводной режим}}, придумайте имя сети и пароль не короче 8 знаков и сохраните. Телефон отключится: подключитесь к сети уже с новым именем.
````

`guides/network/tplink-router-first-setup/step-2.svg`:

````xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">
  <title>Router back panel, internet cable in the WAN port</title>
  <rect class="f-accent-soft" width="480" height="300" rx="24" opacity="0.55"/>
  <rect class="f-soft s-ink" x="60" y="110" width="360" height="100" rx="18" stroke-width="3"/>
  <rect class="f-accent s-ink" x="96" y="150" width="56" height="40" rx="6" stroke-width="2"/>
  <rect class="f-muted s-ink" x="176" y="150" width="40" height="40" rx="6" stroke-width="2"/>
  <rect class="f-muted s-ink" x="228" y="150" width="40" height="40" rx="6" stroke-width="2"/>
  <rect class="f-muted s-ink" x="280" y="150" width="40" height="40" rx="6" stroke-width="2"/>
  <path class="s-hl anim-nudge" d="M124 60 V138 M108 122 L124 138 L140 122" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
````

## Проверка перед pull request

```bash
npm run check    # ни ошибок, ни предупреждений
npm test
npm run build
node scripts/serve.mjs
```

Пройдите инструкцию по шагам на собранной странице и на узком экране телефона (320 px): картинки видны, подписи читаются, кнопки нажимаются.

---

# Guide format

*Русская версия выше / [Русский выше](#формат-инструкции).*

A guide is a folder `guides/<category>/<slug>/` with `index.ru.md` (required), optionally `index.en.md`,
and illustrations next to them. Create the scaffold with `npm run new -- category/slug` and validate
with `npm run check`. The full specification is [spec.md](spec.md), section 4; this page is what an
author needs.

## Folder and slug

- The category is an id from `taxonomy/categories.json` (`audio`, `network`, `furniture`...). The folder and the `category` field must match.
- The slug uses Latin letters, digits and hyphens, at most 60 characters, is unique across the whole project and reads like the task: `airpods-pair-android`, `ikea-malm-3-drawer-assemble`.

## Frontmatter

The file starts with a `---` line and the frontmatter ends at the next `---` line. A narrow subset of
YAML is supported: `key: value`, quoted strings, inline lists `[a, b]`, block lists indented by 2
spaces, `#` comments. Tabs are an error.

| Field | Req. | What to write |
|---|---|---|
| `title` | yes | A full task phrase, 10-90 characters: "How to pair AirPods with Android". |
| `summary` | yes | 40-220 characters, one or two sentences: the card text and the meta description. Do not repeat the title. |
| `category` | yes | The category id. |
| `device` | yes | A device type id from `taxonomy/devices.json`; it must belong to the category. |
| `brands` | yes | A list of brand ids from `taxonomy/brands.json`; `[generic]` when it does not depend on the brand. |
| `models` | no | The models the guide was checked against: `[AirPods 2, AirPods Pro 2]`. |
| `task` | yes | An id from `taxonomy/tasks.json`: `pair`, `setup`, `assemble`, `install`, `reset`, `maintain`, `fix`, `update`, `transfer`. |
| `difficulty` | yes | `easy`, `medium` or `hard`. |
| `time` | yes | Minutes, 1-600, realistic for a first-timer. |
| `tools` | no | What you need at hand: "Phillips screwdriver PH2". |
| `parts` | no | For assembly: a list of `name`, `qty` and `ref` (article number, optional). |
| `aliases` | no | Other phrases people search for: `[airpods android, pair earbuds]`. |
| `sources` | yes | A list of `title`, `url` (https) and `publisher`; at least one, the manufacturer first. |
| `faq` | no | Up to 8 `q` / `a` pairs for common problems. Inline Markdown is allowed in `a`. |
| `updated` | yes | `YYYY-MM-DD`: when the guide was last checked. |
| `authors` | yes | GitHub logins. |
| `widget` | no | An interactive widget: `type:` plus its parameters. |
| `variants` | no | 2-6 models whose steps differ in places: a list of `id` (kebab-case) and `name` (up to 40 characters). |
| `draft` | no | `true` keeps the guide out of the build but still validates it. |

Unknown fields and unknown ids are errors. In `index.en.md` only `title`, `summary`, `tools`,
`parts[].name`, `aliases`, `faq`, `sources[].title` and `variants[].name` (same ids, same order) are read;
everything else comes from the Russian file.

## Body

- Text before the first `## ` is the introduction (0-3 short paragraphs).
- Every `## Heading` is a step. The title is imperative, 3-80 characters. A guide has 3 to 30 steps. `# ` headings are not allowed.
- One step, one action. If a step has "and" between two actions, split it.
- Blocks: paragraphs, `### sub-heading`, lists (`-`, `1.`, one nested level), fenced code blocks for literal strings (a network name, an address, a command), tables with a `|---|` separator.
- Alerts: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`, followed by `> ` lines.
- The step illustration goes on its own line: `![what the picture shows](step-2.svg)`. At most one per step; the alt text is required, 10-160 characters, and says what is drawn.
- Inline: `**bold**`, `*em*`, `` `code` ``, `[text](https://...)`, `<kbd>Win</kbd>`. A UI path is `{{Settings > Bluetooth > Add}}`.
- Any other HTML is escaped. Emoji are forbidden.

## Interactive extras

All optional; they read as part of the text, and without JavaScript the guide reads as usual.

- **Timer** `{{timer 15s}}`, `{{timer 2m}}`, `{{timer 1m30s}}`: a "15 s" chip where the reader holds a button or
  waits. Pressing it counts down with a ring; at the end the phone vibrates and a short tone plays.
  1 second to one hour (`1h`).
- **Indicator light** `{{led white blink}}`: a light that blinks the way the device does. Colours `white`,
  `green`, `amber`, `red`, `blue`; patterns `solid` (the default), `blink`, `fast`, `pulse`, `alternate`
  (two colours: `{{led white/amber alternate}}`). Say it in words too: "the light {{led white blink}} blinks white".
- A bad timer or light (`{{timer 15}}`, `{{led pink}}`) fails the check. Anything else in `{{ }}` is a UI path.
- **Models**, when some steps differ between models. In the frontmatter:

  ```
  variants:
    - id: with-button
      name: Case with a button
    - id: touch-case
      name: Touch case
  ```

  A step for one model only: `## Press the button {variant=with-button}` (or `{variant=a,b}`). Part of a step:

  ```
  > [!VARIANT touch-case]
  > Double-tap the front of the case.
  ```

  "Your model:" chips appear above step 1; the choice is remembered and kept in the link (`?v=touch-case`),
  and step numbers and progress count only the visible steps. Without a choice everything shows, each
  part labelled with its model. The check: ids exist, every model keeps at least one step, the English
  file has the same ids and the same steps per model.
- **A widget inside a step**: a fenced block with the info string `widget <type>` and `key: value` lines:

  ````
  ```widget wifi-qr
  security: WPA
  ```
  ````

  Types: `wifi-qr` (`security`: `WPA`, `WEP`, `nopass`), `saddle-height` (no parameters), `reminder`
  (`every`: `2w`, `1m`, `3m`, `6m`, `1y`; `title`). An unknown type or parameter is an error.
- **Living illustrations.** `anim-*` animations play only while the step is on screen. Give the part to look
  at the class `hot` and a pulsing ring appears around it. Readers can tap a picture to enlarge it.

## Illustrations

A flat schematic drawing: the device outline, the part the user touches, an arrow or a pulse. The same
file serves both languages, so there is no text in the picture.

- `viewBox="0 0 480 300"` (wide) or `0 0 300 300`; no `width` or `height` attributes.
- Colours only through classes, never `#rrggbb`: `f-paper`, `f-soft`, `f-muted`, `f-ink`, `s-ink`, `f-accent`, `s-accent`, `f-accent-soft`, `f-hl`, `s-hl`, `f-ok`, `f-warn`; animations `anim-pulse`, `anim-tap`, `anim-nudge`; `hot` marks the part to look at.
- Stroke width 3 for outlines, 2 for details, `stroke-linecap="round"` and `stroke-linejoin="round"`.
- Allowed elements: `svg g path rect circle ellipse line polyline polygon defs marker use title`. Scripts, `style`, `text`, `image`, `foreignObject`, `on*` handlers and external references are rejected. Up to 40 KB.
- Your own photos (`.webp`, `.jpg`, `.png`, up to 300 KB and 1600 px wide) are allowed. Manufacturer photos and images are not.

## English version

`index.en.md` repeats the frontmatter and the body. The number of steps and the images in the steps must
match the Russian file, otherwise it is an error. Without an English file the site shows the Russian
text with a note.

## A complete example

A teaching example (the `sources` link shows the shape of an entry; in a real guide give the exact manual page).
Write the file in Russian; here is its English counterpart so the structure is easy to follow.

`guides/network/tplink-router-first-setup/index.en.md`:

````markdown
---
title: How to set up a TP-Link router for the first time
summary: Connect the router to the internet and to your computer, open its menu and set the Wi-Fi name and password. Takes about 15 minutes.
tools: [Router with its power adapter, The network cable from the box, The internet cable from your provider, A phone or a laptop]
aliases: [set up tplink, tplink first setup, connect a router]
sources:
  - title: Archer C6 user guide
    url: https://www.tp-link.com/ru/support/
    publisher: TP-Link
faq:
  - q: The setup page does not open
    a: Make sure the phone or laptop is connected to this router, and type the address from the sticker on the bottom of the router instead of searching for it.
  - q: No internet after setup
    a: Check that the provider cable is in the colour-coded `WAN` port, and restart the router for 30 seconds.
---

A router shares the internet over Wi-Fi and cable. The first setup is done once; after it the router works on its own.

## Place the router and switch it on

Pick a spot in the middle of the flat, away from the microwave. Plug in the power adapter and press the power button if there is one.

## Plug the provider cable into the WAN port

![Router back panel, internet cable plugged into the colour-coded WAN port](step-2.svg)

The provider cable goes into the port labelled `WAN` or `Internet` (it usually has a different colour). The other ports are for your devices.

> [!WARNING]
> Do not touch the power adapter or the socket with wet hands.

## Connect to the router's network

The network name and password are printed on the sticker on the bottom of the router. Pick the network in your phone's Wi-Fi list and enter the password.

## Open the setup page

Open a browser and type the address from the sticker, for example:

```
tplinkwifi.net
```

Set the administrator password when the router asks for it.

## Set the Wi-Fi name and password

Open {{Basic > Wireless}}, choose a network name and a password of at least 8 characters, and save. Your phone will disconnect: join the network again under its new name.
````

The illustration `step-2.svg` is the same file as in the Russian guide, because it has no text.

## Before the pull request

```bash
npm run check    # no errors, no warnings
npm test
npm run build
node scripts/serve.mjs
```

Walk through the guide on the built page and on a narrow phone screen (320 px): the pictures are
visible, the text is readable, the buttons work.
