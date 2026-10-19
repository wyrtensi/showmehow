---
title: How to set up a Xiaomi router for the first time
summary: Plug in the provider cable, open router.miwifi.com or 192.168.31.1, enter your provider's details and set a Wi-Fi password. Newer models also work with the Xiaomi Home app.
category: network
device: router
brands: [xiaomi]
models: [Xiaomi Router AC1200, Xiaomi Router BE3600]
task: setup
difficulty: easy
time: 15
tools: [A Xiaomi router with its power adapter, The internet cable from your provider, A phone or a laptop, The connection login and password from your contract (if your provider needs them)]
aliases: [xiaomi router setup, mi router first setup, 192.168.31.1, miwifi.com, router.miwifi.com, set up xiaomi wifi router, mi wifi app, xiaomi home router, install xiaomi router]
sources:
  - title: How to install and configure the Xiaomi Router AC1200 for the first time?
    url: https://www.mi.com/global/support/faq/details/KA-226613/
    publisher: Xiaomi
  - title: How to install and configure the Xiaomi Router BE3600 for the first time?
    url: https://www.mi.com/global/support/faq/details/KA-501966/
    publisher: Xiaomi
faq:
  - q: The setup page does not open by itself
    a: Connect to the router's network and type `router.miwifi.com` or `192.168.31.1` in the browser. On the BE3600 the address is `miwifi.com` or `192.168.31.1`. If the page of another device opens, check that the phone or laptop is really connected to the Xiaomi router.
  - q: I cannot add the BE3600 router to the app
    a: The BE3600 cannot be bound through the old Mi Wi-Fi app, you need Xiaomi Home or Mi Home. Also check that the country or region in the app is correct, because a wrong one can make adding fail.
  - q: I do not know the connection type, login and password
    a: They are in your provider's contract, and if not, call your provider's support. Some providers do not need a login and password.
  - q: The Wi-Fi network disappeared after the setup
    a: That is normal, the Wi-Fi module restarts after the setup. Wait a little and search for the network again, now with the new name and password.
updated: 2026-10-19
authors: [wyrtensi]
---

Xiaomi routers are set up in a few minutes in a browser, with no software to install. Newer models such as the BE3600 can also be set up in the Xiaomi Home app. This guide uses the browser, and the app comes as the last step.

## Plug in the router

Connect the power adapter to the router and to a wall outlet. The BE3600 turns on automatically, on other models there may be a power button on the case.

## Connect the provider cable

![Xiaomi router back panel: the provider cable is in the internet port, the other ports are free](step-2.svg)

Put the provider cable into the Internet (WAN) port. If the internet comes through a wall socket, plug the network cable from that socket into the port. On the BE3600 either of the two router ports works, and the other end of the cable goes to the LAN port of the modem.

## Wait for the blue indicator

Wait until the system indicator on the router turns blue {{led blue solid}}. It means the router has booted and is ready for setup.

## Join the router's Wi-Fi network

![Sticker on the bottom of the Xiaomi router with the network name line highlighted](step-4.svg)

Find the Wi-Fi network name on the sticker on the bottom of the router and connect your phone or laptop to it. The AC1200 needs no password, the network is open.

## Open the setup page

![Browser window with the router address in the address bar and the setup wizard page below](step-5.svg)

After you connect, the wizard page usually opens by itself. If it does not, type this address in the browser:

```
router.miwifi.com
```

You can also use `192.168.31.1`. On the BE3600 the address is `miwifi.com` or `192.168.31.1`.

## Enter the connection details

![Wizard form with two fields for the provider login and password and a Next button](step-6.svg)

Enter your provider's login and password and click **Next**. If your provider does not issue them, this screen may be skipped. If you do not know the connection type, take the details from your contract or from the provider.

## Set the Wi-Fi password and the administrator password

Choose a new Wi-Fi password and an administrator password. You can use the same password for both.

## Wait for the setup to finish

![The router indicator is steady blue, with an arrow to a phone showing a Wi-Fi symbol](step-8.svg)

Wait until the indicator turns blue and stops blinking {{led blue solid}}, then join the Wi-Fi again with the new password. The Wi-Fi module restarts, so the network disappears for a short time.

## Add the router to Xiaomi Home

After the setup you can add the router to the Xiaomi Home (or Mi Home) app: tap **+** in the upper right corner, choose your model and follow the prompts. The BE3600 needs these apps, Mi Wi-Fi does not work with it.

## Share the Wi-Fi with guests

Enter the network name and the password you set and show the QR code to your guest: they only need to point their phone camera at it to join without typing the password.

```widget wifi-qr
security: WPA
```
