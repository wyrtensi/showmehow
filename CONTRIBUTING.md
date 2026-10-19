# Как участвовать

*English version below / [English below](#contributing).*

Show Me How - это инструкции, которые пишут люди, а не генерирует конвейер. Можно предложить тему,
исправить ошибку или написать инструкцию целиком. Спасибо, что вы здесь.

## Запросить инструкцию

1. Загляните на [страницу запросов](https://wyrtensi.github.io/showmehow/requests/) и в [открытые запросы](https://github.com/wyrtensi/showmehow/issues?q=is%3Aissue+is%3Aopen+label%3Arequest): возможно, такой уже есть. Тогда поставьте на нём реакцию "палец вверх": голоса показывают, что писать в первую очередь.
2. Если запроса нет, откройте [форму](https://github.com/wyrtensi/showmehow/issues/new?template=request-guide.yml): устройство, что нужно сделать, категория, язык и (по желанию) ссылки на страницу производителя.
3. Пишите о конкретном устройстве и конкретной задаче: "Подключить JBL Flip 6 к телефону", а не "Bluetooth".

## Исправить ошибку

Нашли неточность, устаревший шаг или неверную картинку? Откройте [форму ошибки](https://github.com/wyrtensi/showmehow/issues/new?template=fix-guide.yml) (на странице инструкции есть ссылка, которая подставит адрес сама) или сразу отправьте pull request с правкой. Если шаг изменился из-за новой прошивки или модели, обновите `updated` и, при необходимости, `models`.

## Написать инструкцию

Нужен Node 20+ и git. Больше ничего ставить не надо: у проекта нет npm-зависимостей.

1. Сделайте fork репозитория, клонируйте его и создайте ветку.
2. Создайте заготовку: `npm run new -- категория/slug`, например `npm run new -- audio/jbl-flip-6-pair-phone`. Категория берётся из `taxonomy/categories.json`, slug - короткое имя задачи латиницей через дефис, уникальное во всём проекте.
3. Откройте `guides/<категория>/<slug>/index.ru.md`, заполните заголовок (frontmatter) и напишите шаги. Формат описан в [docs/guide-format.md](docs/guide-format.md), полные правила - в [docs/spec.md](docs/spec.md), раздел 4.
4. Нарисуйте иллюстрации (`step-1.svg` и так далее) по правилам раздела 4.4. Английская версия `index.en.md` необязательна; если пишете, то с тем же числом шагов и теми же картинками.
   Где помогает, добавьте интерактивные элементы (подробно в [docs/guide-format.md](docs/guide-format.md#интерактивные-элементы)): таймер `{{timer 15s}}` там, где нужно удерживать кнопку или ждать; индикатор `{{led white blink}}`; модели `variants:` с `## Шаг {variant=id}` и `> [!VARIANT id]`; виджет в шаге ```` ```widget wifi-qr ````. Если элемент не делает инструкцию проще для новичка, не добавляйте его.
5. Если нужного устройства или бренда нет в `taxonomy/devices.json` или `taxonomy/brands.json`, добавьте запись в этом же pull request (русское и английское названия, псевдонимы).
6. Проверьте:
   ```bash
   npm run check            # ошибки и предупреждения по гайдам и таксономии
   npm test                 # тесты и ещё раз проверка
   npm run build            # сборка не должна давать предупреждений
   node scripts/serve.mjs   # откройте сайт и пройдите свою инструкцию по шагам
   ```
7. Отправьте pull request. Если инструкция закрывает запрос, напишите в описании `Closes #N`. Шаблон PR содержит чек-лист: пройдите его.

## Планка качества

- **Источники.** В `sources` минимум одна ссылка (https) на документацию производителя: страницу поддержки или PDF-руководство. Первым идёт производитель. Проверьте, что инструкция действительно соответствует тому, что там написано, и укажите в `models`, на каких моделях это проверено.
- **Свои слова.** Текст пишете вы сами. Не копируйте абзацы из руководств, с чужих сайтов и из ответов нейросетей без проверки на устройстве. Картинки производителей нельзя вообще; иллюстрации - только ваши собственные схематичные SVG или ваши собственные фотографии.
- **Одно действие на шаг.** Заголовок шага - повелительное наклонение ("Зажмите кнопку на кейсе"). Названия кнопок, пунктов меню и индикаторов - ровно как на устройстве или в интерфейсе; путь в меню оформляйте как `{{Настройки > Bluetooth}}`.
- **Иллюстрации** по разделу 4.4 спецификации: `viewBox="0 0 480 300"` или `0 0 300 300`, цвета только классами (`f-soft`, `s-ink`, `f-accent`, `s-hl` и другие), без текста, без внешних ссылок, до 40 КБ. Альтернативный текст (`alt`) описывает, что нарисовано.
- **Без эмодзи** - ни в тексте, ни в таксономии, ни в коде. Валидатор считает это ошибкой.
- **Честность.** Не знаете, как это работает на какой-то модели, не пишите. Опасные шаги (электричество, нагрев, вскрытие корпуса) сопровождайте блоком `> [!WARNING]` или `> [!CAUTION]`.
- **Время и сложность** реалистичны для человека, который делает это впервые.

## Как проходит ревью

1. Автоматически запускаются CI: `npm test` и `npm run build`. Ошибки проверки появляются аннотациями прямо в diff. Pull request с красным CI не рассматривается.
2. Мейнтейнер читает текст, смотрит собранную страницу, сверяет шаги с источниками и оставляет замечания. Мелкие правки (опечатки, формулировки) он может внести сам.
3. После исправлений pull request вливается в `main`, и сайт публикуется автоматически (GitHub Pages).
4. Автор получает запись в `authors` инструкции. Закрытый запрос получает ссылку на готовую страницу.

## Лицензия вкладов

Открывая pull request, вы соглашаетесь, что:

- тексты и иллюстрации инструкций, таксономия и документация публикуются под [CC BY-SA 4.0](LICENSE-CONTENT);
- код (скрипты, шаблоны, стили) - под [MIT](LICENSE);
- вы автор отправляемого или имеете право его распространять на этих условиях.

---

# Contributing

*Русская версия выше / [Русский выше](#как-участвовать).*

Show Me How guides are written by people. You can request a topic, fix a mistake or write a whole
guide. Thank you for being here.

## Request a guide

1. Check the [Requests page](https://wyrtensi.github.io/showmehow/requests/) and the [open requests](https://github.com/wyrtensi/showmehow/issues?q=is%3Aissue+is%3Aopen+label%3Arequest): yours may already be there. Add a thumbs-up reaction; votes show what to write first.
2. If it is not there, open the [request form](https://github.com/wyrtensi/showmehow/issues/new?template=request-guide.yml): the device, what you want to do, the category, the language and, optionally, links to the manufacturer's page.
3. Be specific about the device and the task: "Pair a JBL Flip 6 with a phone", not "Bluetooth".

## Fix a mistake

Found an inaccuracy, an outdated step or a wrong picture? Open the [fix form](https://github.com/wyrtensi/showmehow/issues/new?template=fix-guide.yml) (every guide page has a link that fills in the address) or send a pull request with the fix straight away. If a step changed because of new firmware or a new model, update `updated` and, if needed, `models`.

## Write a guide

You need Node 20+ and git. Nothing else to install: the project has no npm dependencies.

1. Fork the repository, clone it and create a branch.
2. Create the scaffold: `npm run new -- category/slug`, for example `npm run new -- audio/jbl-flip-6-pair-phone`. The category comes from `taxonomy/categories.json`; the slug is a short hyphenated name of the task, unique across the whole project.
3. Open `guides/<category>/<slug>/index.ru.md`, fill in the frontmatter and write the steps. The format is described in [docs/guide-format.md](docs/guide-format.md); the complete rules are in [docs/spec.md](docs/spec.md), section 4. Russian is the primary language and is required.
4. Draw the illustrations (`step-1.svg` and so on) following section 4.4. The English version `index.en.md` is optional; if you write it, keep the same number of steps and the same images.
   Where it helps, add interactive extras (details in [docs/guide-format.md](docs/guide-format.md#interactive-extras)): a timer `{{timer 15s}}` where the reader holds a button or waits; an indicator light `{{led white blink}}`; models with `variants:`, `## Step {variant=id}` and `> [!VARIANT id]`; a widget in a step with ```` ```widget wifi-qr ````. If an extra does not make the guide easier for a first-timer, leave it out.
5. If the device or brand is missing from `taxonomy/devices.json` or `taxonomy/brands.json`, add it in the same pull request (Russian and English names, aliases).
6. Verify:
   ```bash
   npm run check            # errors and warnings for guides and taxonomy
   npm test                 # tests, then the checker again
   npm run build            # the build must not print warnings
   node scripts/serve.mjs   # open the site and walk through your guide step by step
   ```
7. Open a pull request. If the guide answers a request, write `Closes #N` in the description. The PR template has a checklist: go through it.

## Quality bar

- **Sources.** At least one https link in `sources` to the manufacturer's documentation: a support page or a PDF manual, the manufacturer first. Make sure the guide matches what it says and list in `models` what you checked it against.
- **Own words.** You write the text yourself. Do not copy paragraphs from manuals, other sites or AI output that you have not verified on the device. Manufacturer images are never allowed; illustrations are your own schematic SVGs or your own photos.
- **One action per step.** The step title is imperative ("Hold the button on the case"). Buttons, menu items and indicators are named exactly as on the device or in the interface; write menu paths as `{{Settings > Bluetooth}}`.
- **Illustrations** per spec section 4.4: `viewBox="0 0 480 300"` or `0 0 300 300`, colours only through classes (`f-soft`, `s-ink`, `f-accent`, `s-hl` and the rest), no text, no external references, up to 40 KB. The `alt` text describes what is drawn.
- **No emoji** in text, taxonomy or code. The validator treats them as an error.
- **Honesty.** If you do not know how it works on a particular model, do not write it. Put steps that involve electricity, heat or opening the case behind a `> [!WARNING]` or `> [!CAUTION]` block.
- **Time and difficulty** are realistic for someone doing it for the first time.

## Review process

1. CI runs automatically: `npm test` and `npm run build`. Checker errors show up as annotations right in the diff. A pull request with a red CI is not reviewed.
2. A maintainer reads the text, looks at the built page, compares the steps with the sources and leaves comments. Small edits (typos, wording) may be made by the maintainer directly.
3. After the fixes the pull request is merged into `main` and the site is published automatically (GitHub Pages).
4. You are credited in the guide's `authors`. The request issue is closed with a link to the finished page.

## Licence of contributions

By opening a pull request you agree that:

- the guide texts, illustrations, taxonomy and documentation are published under [CC BY-SA 4.0](LICENSE-CONTENT);
- code (scripts, templates, styles) is published under [MIT](LICENSE);
- you are the author of what you submit, or have the right to distribute it on these terms.
