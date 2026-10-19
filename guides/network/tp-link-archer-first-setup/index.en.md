---
title: How to do the first setup of a TP-Link Archer router in the web interface
summary: Connect the modem to the WAN port, open tplinkwifi.net, pick the connection type, set a Wi-Fi name and password and wait for the internet test to pass.
tools: [A TP-Link Archer router with its power adapter, An Ethernet cable, A phone or laptop, The login and password from your provider (for PPPoE)]
aliases: [tp-link router setup, tp-link archer setup, tplinkwifi.net, how to log in to tp-link router, first setup tp link, archer ax55 setup, tp link wan port, set up wifi router]
sources:
  - title: How to Set Up Your TP-Link Wi-Fi Router on the Web Management Page (Classic Interface)
faq:
  - q: tplinkwifi.net does not open
    a: "Type 192.168.0.1 in the browser's address bar, not in a search box. Make sure the device is connected to this router and try Chrome, Firefox or Edge."
  - q: The setup wizard does not appear
    a: "Clear the browser cache and try again. Type the address in the address bar, not in a search box."
  - q: The internet connection test fails
    a: "Check that the cable is fully seated in the router's WAN port and in the modem. With PPPoE, check the login and password from your provider."
  - q: Which connection type should I pick
    a: "Press AUTO DETECT or ask your provider. Dynamic IP has no login, PPPoE has a login and password, Static IP uses a fixed address from your provider."
---

This is for TP-Link routers with the classic interface (shown on an Archer AX55). If your interface differs the steps are alike but the screens are not. Setup takes 5 to 10 minutes.

## Connect the modem to the WAN port

![Back of the router with the WAN port highlighted and a cable going to a modem](step-1.svg)

Power off the modem (and remove its backup battery if it has one) and connect it with an Ethernet cable to the router's **WAN (Internet)** port. Power the modem on and wait about 2 minutes, then plug the router's power adapter in and switch it on. If the provider's cable comes from a wall socket, plug it straight into WAN.

## Connect your phone or laptop to the router

Connect with a cable to one of the LAN ports or over Wi-Fi: the device must be on this router's network.

## Open the setup page

![Browser window with the address typed in the address bar](step-3.svg)

In Chrome, Firefox or Edge type `tplinkwifi.net` or `192.168.0.1` into the **address bar** and press Enter. Do not type these into a search box.

## Choose your time zone

![Setup wizard with a time zone drop-down and the Next button](step-4.svg)

In the wizard pick your time zone and click **Next**.

## Choose the connection type

![Connection type screen with the AUTO DETECT button](step-5.svg)

Pick the type your provider gave you, or click **AUTO DETECT**. For PPPoE enter the provider's login and password. If your provider needs a VLAN, click **Special ISP Settings (IPTV/VLAN)**, choose Custom, enter the VLAN ID and tick 802.1Q Tag. Then click Next. For the MAC address pick **Use Default MAC Address** unless the provider asks otherwise.

## Set the Wi-Fi name and password

![Wi-Fi form with a name and password for the 2.4 GHz and 5 GHz bands](step-7.svg)

Enter a network name and a password for 2.4 GHz and for 5 GHz and click **Next**.

## Wait for the test and finish

![Completion screen with a check mark and the firmware auto-update switch](step-8.svg)

The router tests the internet by itself, which takes a few seconds. Then choose whether to turn on firmware auto-update (recommended) and click Next. On the last screen click **Next** once more to finish.

> [!TIP]
> Write down the new Wi-Fi password. If you forget it, the router can be reset with the Reset button and set up again.
