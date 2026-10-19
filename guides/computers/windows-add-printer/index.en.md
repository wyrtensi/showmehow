---
title: How to add a printer in Windows 11
summary: Switch the printer on, open Printers & scanners in Settings and click Add device. If the printer is not in the list, add it manually.
category: computers
device: printer
brands: [generic]
task: install
difficulty: easy
time: 5
tools: [A Windows 11 computer, A printer that is switched on, A USB cable for the printer or the same Wi-Fi network as the computer for a network printer]
aliases: [connect printer to computer, install printer windows 11, add a printer, windows cannot find printer, connect printer over wifi, how to connect a printer, add printer manually, printer setup windows]
sources:
  - title: Добавление или установка принтера в Windows
    url: https://support.microsoft.com/ru-ru/windows/add-a-printer-or-scanner-in-windows-14d9a442-0bcb-e11c-7a6c-63f00efae79f
    publisher: Microsoft
  - title: Add or install a printer in Windows
    url: https://support.microsoft.com/en-us/windows/add-a-printer-or-scanner-in-windows-14d9a442-0bcb-e11c-7a6c-63f00efae79f
    publisher: Microsoft
faq:
  - q: The printer list is empty or my printer is not in it
    a: Wait a few minutes, because the list does not fill at once. Check that the printer is on and plugged in, and that a network printer is on the same Wi-Fi network as the computer. If it is still missing, add it manually, as in step 7.
  - q: The printer was added but there is a Find drivers button next to it
    a: The printer should already print, but it may have fewer features until a full set of drivers is installed. The best way to get them is Windows Update.
  - q: The printer was added but it does not print
    a: Try the printer troubleshooter and Microsoft's guide "Fix printer connection and printing problems in Windows". If the manufacturer's installer fails on an ARM PC, follow the steps of this guide instead of it.
updated: 2026-10-19
authors: [wyrtensi]
---

Windows 11 finds and installs most printers by itself, and special drivers are usually not needed. If the printer did not appear automatically, you can add it through Settings in a couple of minutes.

## Get the printer ready

![A printer and a laptop: a USB cable between them on the left, Wi-Fi waves from the printer to the laptop on the right](step-1.svg)

For a wired printer, plug the USB cable into the computer and switch the printer on. For a network or wireless printer, make sure it is on and connected to the same network as the computer. For a wireless printer that must be the same Wi-Fi network.

## Open Printers & scanners

![Windows Settings window: Bluetooth & devices selected in the left menu, the Printers & scanners row highlighted in the list](step-2.svg)

Select {{Start > Settings > Bluetooth & devices > Printers & scanners}}.

## Check the list of installed printers

Your printer may already be in the list. Then you do not need to add it, and you can print.

## Click Add device

![Printers & scanners page: the add printer row with its button highlighted on the right](step-4.svg)

In the Add a printer or scanner row, click **Add device**. Windows starts searching for printers.

## Wait for the list of printers

The list can take a few minutes to fill. Keep the window open until your printer shows up.

## Click Add device next to your printer

![List of found printers with the add button highlighted on the chosen printer](step-6.svg)

Pick your printer and click the **Add device** button next to it. Sometimes the printer is added without a click.

## Add the printer manually if it is not listed

![Row saying the wanted printer is not listed, with the add manually link highlighted](step-7.svg)

Next to The printer that I want isn't listed, click **Add a new device manually**. The Add Printer window opens: follow its instructions, for example, specify the printer by its network address.

## Check Windows Update for drivers

When the printer is installed, open Windows Update and check for driver updates. If a **Find drivers** button appears next to the printer, the printer already works, but it may have reduced functions until a full set of drivers is installed.

> [!NOTE]
> To remove a printer, open the same {{Printers & scanners}} page, select the printer and click **Remove**.
