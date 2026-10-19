---
title: How to factory reset a TP-Link router
summary: Hold the Reset button on a powered-on router for more than 10 seconds until the SYS light blinks fast. All settings are erased, so the router has to be set up again.
category: network
device: router
brands: [tp-link]
models: [Archer C6, Archer AX55, TL-WR841N]
task: reset
difficulty: easy
time: 10
tools: [A TP-Link router plugged in and switched on, A paperclip or pin (if the button is in a hole), A phone or a laptop, Your internet login and password from your provider (if the provider needs them)]
aliases: [reset tp-link, tp-link factory reset, tplink hard reset, restore tp-link defaults, forgot tp-link router password, wipe tp-link router, how to reset a router to factory settings]
sources:
  - title: How to Factory Reset Your TP-Link Router
    url: https://www.tp-link.com/en/support/faq/497/
    publisher: TP-Link
faq:
  - q: The SYS light does not change its blinking while I hold the button
    a: Keep holding without letting go until the blinking speeds up. If the router has a single WPS/Reset button, a short press under 5 seconds starts WPS, and the reset only begins after 10 seconds. If the button is inside a hole, push the paperclip in until it stops.
  - q: After the reset the router shows a network with a different name and password
    a: That is expected. The network name, Wi-Fi password and the setup page address are now the ones printed on the sticker on the bottom of the router. You will need to set your own again.
  - q: The internet is gone after the reset
    a: The reset erased the settings for your provider. Check that the provider cable is in the `WAN` port and enter the connection type, login and password from your contract. If you saved a backup file beforehand, load it on the same {{Advanced > System Tools > Backup and Restore}} page.
  - q: Can I reset the router if I forgot the administrator password
    a: Yes, that is what the button is for. You set a new password for the setup page after the reset.
updated: 2026-10-19
authors: [wyrtensi]
---

A reset returns the router to its factory state: the internet settings, Wi-Fi name and password, port forwarding and parental controls are gone. It helps when a password is forgotten or the router misbehaves, but afterwards you have to set it up again.

## Save a copy of your settings

If the router page still opens, go to `tplinkwifi.net` and save the configuration file on the {{Advanced > System Tools > Backup and Restore}} page. You can load it back later instead of typing everything again. If you forgot the password, just skip this step.

## Find the Reset button

![Router back panel with the small Reset hole highlighted next to the ports](step-2.svg)

Look at the back and side panels. There are three variants: a separate Reset button, a combined WPS/Reset button, or a hole that you press with a paperclip. The exact place for your model is shown on the sticker on the bottom of the router.

> [!TIP]
> If the router's web page opens, you do not need the button: go to {{Advanced > System Tools > Backup and Restore}}, click **Factory Restore** on the Factory Default Restore page and wait for the reboot.

## Hold the button for more than 10 seconds

![A paperclip pressing the Reset button in its hole, with a stopwatch showing a long hold](step-3.svg)

The router must be switched on. Press the Reset (or WPS/Reset) button and keep it pressed for more than 10 seconds {{timer 10s}}.

> [!WARNING]
> Do not unplug the router until the reset is finished. If the router has a combined WPS/Reset button, a short press under 5 seconds starts WPS instead of a reset.

## Release the button when SYS blinks fast

![Router LED row with SYS highlighted, slow blinking changing to quick blinking](step-4.svg)

Watch the SYS light. At first it blinks slowly, then it starts to blink fast. Let go of the button at that moment.

## Wait for the reboot

The router restarts by itself with the factory settings. Do not touch it or cut the power until the lights settle.

## Join the factory Wi-Fi network

![Sticker on the router bottom with the network name and password lines highlighted](step-6.svg)

Turn the router over and find the sticker. It has the factory login, password and the router address. Connect your phone or laptop to the router's factory Wi-Fi network.

## Open the setup page

![Browser window with the router address typed in the address bar and settings cards below](step-7.svg)

Open the address from the sticker in a browser: usually `tplinkwifi.net` or `192.168.0.1`.

## Set the router up again

Set the administrator password, the internet connection, and a new Wi-Fi name and password. If you saved a settings backup, load it on the {{Advanced > System Tools > Backup and Restore}} page.
