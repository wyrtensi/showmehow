---
title: How to factory reset a Keenetic router
summary: Hold the Reset button with a paperclip until the Status light blinks fast, or reset from the web interface. The router loses all your own settings.
category: network
device: router
brands: [keenetic]
models: [Keenetic KN-1811, Keenetic KN-1011, Keenetic KN-1711]
task: reset
difficulty: easy
time: 15
tools: [A Keenetic router with its power adapter, A paperclip or another thin sharp object, A phone or a laptop, Your internet connection details from your provider]
aliases: [keenetic reset, reset keenetic router, keenetic factory defaults, forgot keenetic password, netcraze reset, restore keenetic to default, wipe keenetic settings]
sources:
  - title: Сброс настроек и пароля администратора
    url: https://support.keenetic.ru/ultra/kn-1811/ru/16714.html
    publisher: Keenetic
  - title: Resetting the system settings and admin password
    url: https://support.keenetic.com/titan/kn-1811/en/16714.html
    publisher: Keenetic
  - title: Initial Setup Wizard
    url: https://support.keenetic.ru/ultra/kn-1811/ru/13521.html
    publisher: Keenetic
faq:
  - q: I released the button and the router just rebooted with the old settings
    a: The button was released too early. Keep it pressed until the Status light starts to blink fast, usually 10 to 12 seconds, then repeat the reset.
  - q: The lights look strange and the router does not boot normally
    a: The button was held for more than 30 seconds, so the router entered emergency recovery mode, where it waits for a firmware file over TFTP. Keenetic's emergency firmware recovery instructions will bring it back.
  - q: The my.keenetic.net page does not open
    a: Connect to the router by cable or to its factory Wi-Fi network and type `192.168.1.1` in the address bar. If that does not help, restart your phone or laptop and the router.
  - q: The wizard finished but there is no internet
    a: Check that the provider cable is in the internet port. Some providers bind the connection to a MAC address, then you have to give them the WAN MAC address from the sticker on the router. Take the other details from your contract or from the provider's support.
updated: 2026-10-19
authors: [wyrtensi]
---

A reset deletes all your own Keenetic settings: the internet connection, Wi-Fi and the administrator password. You need it when the password is lost or when you want to start over. The button always works, while a reset from the web interface works only if you can still log in.

## Prepare your provider's details

After the reset the internet is set up from scratch, so find the connection type, login and password in your contract. If you do not have them, ask your provider's support.

## Unplug the network cables from the router

Pull out the provider cable and all cables to computers, but leave the power connected. The manufacturer recommends this so that the reset runs without interference.

## Find the Reset button

![Keenetic back panel with network ports and the small hole of the reset button highlighted](step-3.svg)

Switch the router on and wait until it has fully booted. The button is on the same side of the case as the ports, and its place depends on the model. If the web interface opens, you can skip steps 3-5 and go to step 6.

## Press the button with a paperclip

![A paperclip pressing the button in its hole, with a stopwatch showing part of a circle](step-4.svg)

Press the Reset button with a thin sharp object such as a paperclip and keep it pressed.

> [!WARNING]
> Do not hold the button for more than 30 seconds: the router will enter emergency recovery mode and wait for a firmware file over TFTP.

## Release the button when Status blinks fast

![Keenetic front panel: the leftmost Status light blinks fast, with an arrow showing the button release](step-5.svg)

Watch the leftmost Status light. After 10 to 12 seconds it starts to blink fast. Release the button only then. If you let go earlier, the router just reboots without a reset.

## Or reset from the web interface

![Web interface window with the reset button highlighted and the confirmation field](step-6.svg)

This replaces steps 3-5. Open the {{General System Settings}} page and click **Reset all settings** in the System Reboot section. In the Deleting Custom Settings window type the word `RESET` in capital letters into the Confirm settings reset field and click **Delete settings**.

> [!NOTE]
> You can also reset the router from the Keenetic mobile app: open the router settings, go to the Management menu and tap Reset at the bottom. Do it only at home on the same network as the router, because on a remote router you will lose access to it.

## Wait for the reboot

The router restarts with the factory settings and goes into Router mode, even if it worked in another mode before (on models without a hardware mode switch).

## Plug the cables back in

![Router back panel: the provider cable is plugged into the internet port, an arrow points at the port](step-8.svg)

Put the provider cable into the internet port (it is labelled "0" on many models) and connect your computer with a cable to one of the other ports, or to the factory Wi-Fi network.

## Open the my.keenetic.net page

![Browser window with the router address in the address bar and the start button highlighted on the welcome page](step-9.svg)

Type `my.keenetic.net` or `192.168.1.1` in the browser. The welcome page of the web interface should open.

## Run the setup wizard

Click **Run Wizard** on the welcome page. Accept the license agreement, choose the time zone, set the administrator password (it is mandatory and should be at least 8 characters), then enter your internet connection details and the Wi-Fi name and password. Save your credentials on the final screen.
