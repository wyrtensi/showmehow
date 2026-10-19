---
title: Как подключить колонку Marshall Emberton или Acton по Bluetooth
summary: Включите колонку, переведите её в режим подключения кнопкой Bluetooth (Emberton) или кнопкой источника (Acton III) и выберите её в списке Bluetooth на телефоне.
category: audio
device: speaker
brands: [marshall]
models: [Marshall Emberton III, Marshall Emberton, Marshall Acton III]
task: pair
difficulty: easy
time: 3
tools: [Колонка Marshall Emberton или Acton III, Телефон, планшет или ноутбук с Bluetooth, Зарядка колонки или розетка для Acton III]
aliases: [маршалл колонка подключить, маршал эмбертон, подключить emberton, marshall acton bluetooth, marshall emberton pairing, колонка маршалл не подключается, как подключить маршалл к телефону, marshall speaker bluetooth pair]
sources:
  - title: Emberton III - как подключить и выполнить сопряжение
    url: https://www.marshall.com/us/en/support/speakers/support-for-emberton-iii/connect-and-pair
    publisher: Marshall
  - title: Acton III - как подключить и выполнить сопряжение
    url: https://www.marshall.com/support/speakers/support-for-acton-iii/how-to-connect-and-pair
    publisher: Marshall
  - title: Acton III - если Bluetooth не подключается
    url: https://marshall.com/in/en/support/speakers/support-for-acton-iii/troubleshooting-bluetooth-pairing
    publisher: Marshall
  - title: Emberton III - сброс до заводских настроек
    url: https://www.marshall.com/us/en/support/speakers/support-for-emberton-iii/factory-reset
    publisher: Marshall
  - title: Emberton - как подключить и выполнить сопряжение
    url: https://www.marshall.com/us/en/support/speakers/support-for-emberton/how-to-connect-and-pair
    publisher: Marshall
faq:
  - q: Колонка не появляется в списке или не подключается
    a: Если подключали её раньше, удалите колонку из списка Bluetooth на телефоне и подключите заново. Отключите другое устройство, которое уже к ней подключено. У Acton III выключите колонку, подождите 10 секунд и включите снова.
  - q: Сколько устройств можно подключить сразу
    a: К Emberton III и Acton III можно подключить два устройства одновременно. Играть одновременно может только одно - пока первое не поставлено на паузу, второе не заиграет. Emberton III помнит до 8 устройств и сама подключается к последнему, если оно рядом.
  - q: Как сбросить Emberton III до заводских настроек
    a: Удалите EMBERTON III (и EMBERTON III [LE], если есть) из списка Bluetooth на телефоне. Включите колонку, зажмите кнопку Bluetooth на 7 секунд, пока индикатор не мигнёт красным и колонка не перезапустится. Настройки пользователя сотрутся, обновления прошивки останутся.
  - q: Где менять настройки звука и обновлять прошивку
    a: В приложении Marshall Bluetooth. Для подключения оно не нужно, но Marshall рекомендует его для настроек и обновлений.
variants:
  - id: emberton-3
    name: Emberton III
  - id: acton-3
    name: Acton III
updated: 2026-10-19
authors: [wyrtensi]
---

Колонки Marshall подключаются как обычные Bluetooth-колонки: нужно включить режим подключения и выбрать колонку на телефоне. Кнопки отличаются у моделей, поэтому ниже у каждого шага есть отдельные пункты для Emberton III и Acton III.

> [!NOTE]
> У первого Emberton питание включается удержанием регулятора (Control knob) 2 секунды, а Bluetooth - кнопкой Bluetooth до медленной синей пульсации; в списке колонка называется «Emberton».

## Включите колонку

![Колонка Marshall Emberton, у верхнего края выделена кнопка питания и рядом показан таймер удержания](step-1.svg)

> [!VARIANT emberton-3]
> Emberton III: зажмите кнопку питания, пока колонка не включится.

> [!VARIANT acton-3]
> Acton III работает от сети: подключите шнур питания к колонке и к розетке, затем включите колонку выключателем питания.

## Включите Bluetooth на телефоне

Откройте {{Настройки > Bluetooth}} на iPhone или {{Настройки > Подключённые устройства}} на Android (на Samsung - {{Настройки > Подключения > Bluetooth}}) и включите Bluetooth. Экран оставьте открытым.

## Удалите старую запись о колонке, если подключали её раньше

![Список Bluetooth на телефоне, у записи колонки выделена кнопка информации, снизу кнопка удаления](step-3.svg)

Если колонка уже была подключена к этому телефону, найдите её в списке Bluetooth, откройте её настройки и удалите (забудьте) устройство. Если колонки в списке нет, переходите дальше. Отключите и другие устройства, которые сейчас соединены с колонкой.

## Переведите колонку в режим подключения

![Колонка Marshall с зажатой кнопкой Bluetooth и расходящимися синими кольцами пульсации индикатора](step-4.svg)

> [!VARIANT emberton-3]
> Emberton III: нажмите и держите кнопку Bluetooth, пока индикатор не покажет медленную синюю пульсацию {{led blue pulse}}.

> [!VARIANT acton-3]
> Acton III: нажмите кнопку источника и выберите Bluetooth - горящий индикатор показывает, какой вход активен. Затем зажмите кнопку источника примерно на 2 секунды {{timer 2s}}, пока индикатор Bluetooth не начнёт мигать (Marshall описывает это как красную пульсацию {{led red pulse}}).

## Выберите колонку в списке Bluetooth

![Список Bluetooth на телефоне, в нём выделена строка с колонкой и нажата кнопка подключения](step-5.svg)

В списке доступных устройств коснитесь **EMBERTON III** или **Acton III**. Через несколько секунд телефон покажет, что колонка подключена.

## Проверьте звук

Включите музыку и отрегулируйте громкость. Если к колонке подключены два устройства, играть может только одно: поставьте на паузу то, что играло раньше.
