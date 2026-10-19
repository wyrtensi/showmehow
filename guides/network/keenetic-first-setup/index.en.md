---
title: How to do the first setup of a Keenetic router with the my.keenetic.net wizard
summary: Plug the provider's cable into port 0, open my.keenetic.net, start the wizard, then set the admin password, the connection method and the Wi-Fi name.
tools: [A Keenetic router with its power adapter, The provider cable, A phone or laptop, The details from your provider contract (login and password for PPPoE, PPTP or L2TP)]
aliases: [keenetic setup, keenetic first setup, my.keenetic.net, how to log in to keenetic router, keenetic setup wizard, 192.168.1.1 keenetic, keenetic initial setup wizard, my.keenetic.net not opening]
sources:
  - title: Initial Setup Wizard (Keenetic Help)
faq:
  - q: my.keenetic.net does not open
    a: "Type 192.168.1.1 in the address bar. Check that the device is connected to this router and gets its IP and DNS automatically. Restart the device and the router."
  - q: The wizard does not appear because the router was set up before
    a: "If you are not sure the router is on factory settings, reset it with the Reset button and start again."
  - q: The internet does not work after setup
    a: "Ask your provider whether the service is available and what connection details are needed: login and password, protocol, MAC address."
  - q: Is there anything special about the Wi-Fi name and password
    a: "The password must be 8 to 63 characters. For the network name use Latin letters, digits and a hyphen, with no spaces or special characters - some devices cannot join such networks."
---

The Keenetic initial setup wizard tests the internet connection for you. Before you start, get your provider contract: you need to know whether a login and password are used, which protocol applies (PPPoE, PPTP, L2TP) and whether the MAC address is registered.

## Plug the provider's cable into port 0

![Back of the router with port 0 highlighted and the provider's cable going in](step-1.svg)

Put the provider's cable into port **0** (Internet). If you use a 4G/3G USB modem, plug it into the USB port. Switch the power on.

## Open the router page

![Browser with my.keenetic.net typed in and a router icon](step-2.svg)

Connect your phone or computer to the router over Wi-Fi or with a cable in a gray port and open the browser. The welcome page should open. If it does not, type `my.keenetic.net` or `192.168.1.1` in the address bar.

## Start the wizard

![Router welcome page with the Run Wizard button highlighted](step-3.svg)

On the welcome page click **Run Wizard**. Accept the License Agreement.

## Set the time zone and the admin password

![Administrator password field and the Next button](step-4.svg)

Pick your time zone and set a password for the `admin` account. It is mandatory, protects the settings, and should be at least 8 characters with letters and digits. Click **Next**.

## Choose how the router connects to the internet

![Connection method choice with the first option selected](step-5.svg)

Pick the method named in your provider contract. A direct Ethernet connection without a login is called IPoE. On the TV screen choose the first, recommended option unless your provider gave you an IPTV set-top box. If the provider needs a VLAN number enter it, otherwise continue without VLAN. Keep the "Router" mode and click **Next**.

## Wait for the connection and the update

![Router connecting to the internet and updating, with a progress bar](step-6.svg)

The router connects and checks whether KeeneticOS is up to date. If there is an update it installs it by itself. Do not power off the router: the update takes a few minutes and then the device restarts.

## Set the Wi-Fi name and password

![Wi-Fi network name and password fields with preset values](step-7.svg)

On the Wi-Fi screen you can keep the suggested values or set your own. Write down the network name and password: you need them to connect other devices.

## Finish the setup

![Final screen with a check mark and the Finish button](step-8.svg)

Save your credentials (copy or print them) and click **Finish**. To register the router and track its warranty, create a Keenetic Account at account.keenetic.com.
