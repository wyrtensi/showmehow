---
# Format reference: docs/guide-format.md. Check your guide with: npm run check
# Remove "draft: true" when the guide is ready to publish.
title: Как __DO_WHAT__ на __DEVICE_NAME__
summary: Одно-два предложения о том, что получится в итоге и что для этого нужно. От 40 до 220 символов.
category: __CATEGORY__
# Device id from taxonomy/devices.json, in the same category.
device: __DEVICE__
# Brand ids from taxonomy/brands.json; [generic] when the brand does not matter.
brands: [generic]
models: []
# One of: pair, setup, assemble, install, reset, maintain, fix, update, transfer
task: __TASK__
# easy, medium or hard
difficulty: easy
# Minutes, realistic for a first-timer.
time: 5
tools: [Что понадобится под рукой]
aliases: []
sources:
  - title: Название страницы поддержки или инструкции производителя
    url: __SOURCE_URL__
    publisher: Производитель
updated: __DATE__
authors: [__AUTHOR__]
draft: true
# Optional: models that differ in a few steps ("Ваша модель:" chips above step 1), 2-6 items.
# variants:
#   - id: with-button
#     name: Кейс с кнопкой
#   - id: touch-case
#     name: Сенсорный кейс
#
# Interactive extras for the body (docs/guide-format.md, "Интерактивные элементы"):
#   Удерживайте кнопку {{timer 15s}}        - a timer chip: 15s, 2m, 1m30s (up to 1h)
#   Индикатор {{led white blink}}           - a light: white green amber red blue;
#                                             solid blink fast pulse; {{led white/amber alternate}}
#   ## Зажмите кнопку {variant=with-button} - the whole step is for one model (or a,b)
#   > [!VARIANT touch-case]                 - a part of a step for one model,
#   > Дважды коснитесь кейса.                 the following "> " lines are its text
#   ```widget wifi-qr                       - a widget inside a step: wifi-qr, saddle-height,
#   security: WPA                             reminder; "key: value" lines are its parameters
#   ```
---

Короткое вступление: для чего эта инструкция и на какие модели она рассчитана. Можно опустить.

## Подготовьте всё необходимое

Один шаг - одно действие. Названия кнопок и пунктов меню пишите точно, как на устройстве: {{Настройки > Bluetooth}}.

## Сделайте главное действие

Опишите, что нажать и что должно произойти. Клавиши оформляйте так: <kbd>OK</kbd>.

> [!TIP]
> Подсказка, которая сэкономит время.

## Проверьте результат

Как понять, что всё получилось.
