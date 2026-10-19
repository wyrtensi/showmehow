<p align="center">
  <a href="https://wyrtensi.github.io/showmehow/"><img src="docs/banner.svg" alt="Show Me How: short illustrated step-by-step guides for everyday devices" width="100%"></a>
</p>

<p align="center">
  <a href="https://wyrtensi.github.io/showmehow/"><b>Site</b></a> ·
  <a href="https://wyrtensi.github.io/showmehow/en/">English</a> ·
  <a href="https://wyrtensi.github.io/showmehow/">Русский</a> ·
  <a href="https://wyrtensi.github.io/showmehow/llms.txt">llms.txt</a> ·
  <a href="https://github.com/wyrtensi/showmehow/issues/new?template=request-guide.yml">Request a guide</a>
</p>

**Show Me How** is a site of short, illustrated, step-by-step guides for everyday devices and things:
pair headphones, set up a router, assemble a chest of drawers, put a bike together out of the box.
Every guide is built the same way:

- **one action per step**, an imperative title, the exact button and menu names as they appear on the device;
- **a schematic illustration** for the steps where seeing helps (our own flat SVG drawings that follow the light and dark theme);
- **sources** from the manufacturer's own documentation, with the text written in our own words;
- **two reading modes**: all steps on one page, or one step per screen with big buttons, swipe and keyboard arrows;
- **troubleshooting** for the things that usually go wrong, and a progress tick for every step.

Russian is the primary language and is required for every guide; English is optional and falls back
to Russian with a visible note. Everything is prerendered and works without JavaScript; the script
only adds search, the step mode, progress and filters.

## Guides

<!-- guides:start -->
The list is generated from `guides/` by the maintainer. Browse it on the [site](https://wyrtensi.github.io/showmehow/guides/).
<!-- guides:end -->

## Need a guide that is not here?

[Request it](https://github.com/wyrtensi/showmehow/issues/new?template=request-guide.yml) with a
short form: the device, what you want to do, optional links to the manufacturer's page. Votes are
thumbs-up reactions on the issue, and the most wanted requests are written first. You can also use
the form on the [Requests page](https://wyrtensi.github.io/showmehow/requests/) of the site: it opens
the same issue prefilled.

Found a mistake in a guide? Use "Report a mistake" at the bottom of the guide page, or
[open a fix issue](https://github.com/wyrtensi/showmehow/issues/new?template=fix-guide.yml).

## Write a guide

A guide is one Markdown file with a small header, plus SVG illustrations next to it. No tooling to
install: Node 20+ and nothing else.

```bash
git clone https://github.com/<you>/showmehow && cd showmehow   # your fork
npm run new -- audio/jbl-flip-6-pair-phone                      # category/slug, creates a template
# write guides/audio/jbl-flip-6-pair-phone/index.ru.md and the step illustrations
npm run check                                                    # validate the guide and the taxonomy
npm test
npm run build
node scripts/serve.mjs                                           # look at the result in a browser
```

Then open a pull request and write `Closes #N` if the guide answers a request. The full rules are in
[CONTRIBUTING.md](CONTRIBUTING.md) and the format reference is [docs/guide-format.md](docs/guide-format.md).

## How it works

```
guides/<category>/<slug>/index.ru.md   the guide (required), index.en.md (optional), step-<n>.svg
taxonomy/                              categories, devices, brands, tasks
data/synonyms.json                     search synonyms
src/lib/                               parser, Markdown renderer, SVG sanitizer, validation, model, SEO, search
src/render/                            HTML templates (pure functions)
src/client/  src/styles/  src/icons/   browser code, CSS, icons
src/widgets/                           interactive widgets a guide may embed
scripts/build.mjs  check.mjs  new.mjs  serve.mjs   build, validate, scaffold, local server
scripts/test/                          tests
docs/spec.md  docs/guide-format.md     platform spec; format reference for authors
```

No npm dependencies; Node 20+ (CI uses 24). The build validates everything, renders the site into
`dist/` for both languages and writes the data endpoints. Details are in [docs/spec.md](docs/spec.md).

```bash
npm test                      # unit tests, then the guide checker
npm run check                 # validate guides and taxonomy only
npm run build                 # build into dist/
node scripts/serve.mjs        # serve dist/ locally
```

`BASE_PATH=/showmehow/ SITE_URL=https://wyrtensi.github.io/showmehow npm run build` produces the
production build with canonical links and absolute URLs in `sitemap.xml` and `llms.txt`. Pushes to
`main` are tested, built and published to GitHub Pages by `.github/workflows/pages.yml`.

## For AI agents

The site publishes [`llms.txt`](https://wyrtensi.github.io/showmehow/llms.txt), `llms-full.txt` (Russian) and
`en/llms-full.txt`, `guides.json` (the catalog), `api/<slug>.json` (a full guide, both languages),
`sitemap.xml` and JSON-LD (`HowTo`, `FAQPage`, `BreadcrumbList`) on every page. A visually hidden note
at the top of each page points agents to this data.

## Licence

- Code (scripts, templates, workflows): [MIT](LICENSE).
- Guide texts, illustrations, taxonomy and docs: [CC BY-SA 4.0](LICENSE-CONTENT).

Contributors agree to this by opening a pull request. Device and brand names belong to their owners
and are used only to say which product a guide is about; the project is not affiliated with any
manufacturer.

---

## По-русски

**Покажи, как** (Show Me How) - сайт коротких пошаговых инструкций с картинками: подключить наушники,
настроить роутер, собрать комод, достать из коробки и собрать велосипед. Один шаг - одно действие,
названия кнопок и пунктов меню как на устройстве, схематичные рисунки на шагах, где нужно показать,
и ссылки на документацию производителя. Тексты написаны своими словами. Основной язык - русский,
английский добавляют по желанию.

- Сайт: **[wyrtensi.github.io/showmehow](https://wyrtensi.github.io/showmehow/)**, английская версия - [/en/](https://wyrtensi.github.io/showmehow/en/).
- Нет нужной инструкции - [запросите её](https://github.com/wyrtensi/showmehow/issues/new?template=request-guide.yml). Чем больше реакций "палец вверх" на запросе, тем раньше он будет выполнен.
- Хотите написать инструкцию сами - `npm run new -- категория/slug`, затем `npm run check`, `npm test` и pull request. Правила - в [CONTRIBUTING.md](CONTRIBUTING.md), формат - в [docs/guide-format.md](docs/guide-format.md).
- Код под лицензией MIT, тексты и иллюстрации инструкций - CC BY-SA 4.0.
