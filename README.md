# AeroTizen

A simple home screen for Samsung TVs, and a command-line tool to clean the TV up from your computer.

![AeroTizen home screen](docs/screenshots/home.png)

## Why I made this

I bought a 65" Samsung DU7200 and the home screen was mostly ads. There was a "Top Picks for You"
row I couldn't remove, Samsung TV Plus started playing on its own at boot, and the TV tracks what
you watch unless you dig through the privacy menus to turn it off.

On Android TV you'd install a different launcher and remove the junk over ADB. Samsung's Tizen
doesn't let you do either. There's no way to replace the home screen, no shell, and the official
developer tools are a huge SDK that doesn't even run natively on Apple Silicon.

So I built my own. AeroTizen is a normal TV app that acts as the home screen: it opens when the
TV turns on and comes back when you press Home. The CLI handles the setup (certificates, signing,
installing) and lets you see and remove preinstalled apps. You don't need Tizen Studio or root.

## Features

On the TV:

- Your apps in a 3-column grid with their real logos, inputs underneath
- Opens at power-on and comes back on Home (see [Limits](#limits))
- Hold OK on a tile to move it around
- Inputs list every HDMI port and the name of what's plugged in. You can rename them
- 31 backgrounds, 16 of them animated, with a speed slider and preview
- Time, date, weather and your city in the top bar, in the format you pick
- Shows whether the TV is on Ethernet or Wi-Fi
- A Fireplace tile that plays a fireplace video
- Settings to choose which apps show up, open the Samsung app store, or go back to Samsung's home screen

From your computer (`aerotizen`):

- Finds the TV on your network
- Connects to the TV's developer port directly in Python, on macOS, Linux or Windows
- Creates the Samsung signing certificates for your TV (you sign in to your Samsung account once)
- Signs and installs any `.wgt` app, including the launcher
- Lists installed apps, flags the bloat, and removes it if your firmware allows

There's also a short [guide to the settings worth turning off](docs/settings.md) (ads, viewing
data, autorun) and [DNS blocklists](dns/) if you run Pi-hole, AdGuard Home or NextDNS.

| Settings | Moving a tile | Snowfall | Lava |
|---|---|---|---|
| ![Settings](docs/screenshots/settings.png) | ![Moving a tile](docs/screenshots/move.png) | ![Snowfall](docs/screenshots/theme-snowfall.png) | ![Lava](docs/screenshots/theme-lava.png) |

The device names and weather in these screenshots are placeholders.

## Tested on

| TV | Year | Firmware |
|---|---|---|
| Samsung 65" Crystal UHD DU7200 (UN65DU7200FXZA) | 2024 | Tizen 9.0 |

It should work on other Samsung TVs from 2020 on, but I've only tested this one. If you try it on
yours, [let me know how it went](../../issues/new?template=model_report.yml).

## Setup

You need a computer on the same network as the TV, with Python 3.10 or newer.

1. Install the CLI and check that it finds your TV:

   ```bash
   pip install git+https://github.com/helalaou/AeroTizen
   aerotizen discover
   ```

2. Turn on Developer Mode on the TV. Open **Apps**, type `12345` on the remote (or with the
   on-screen number pad), switch Developer mode on, and set Host PC IP to your computer's IP.
   Then unplug the TV for a minute. Turning it off with the remote isn't enough for the change to
   apply. `aerotizen status` should now show `developerMode=1`.

3. Create the certificates. This opens Samsung's sign-in page in your browser:

   ```bash
   aerotizen certs
   ```

4. Install the launcher:

   ```bash
   git clone https://github.com/helalaou/AeroTizen && cd AeroTizen
   aerotizen install launcher
   ```

That's it. The TV will start on AeroTizen from now on, and the gear icon opens settings.

To look at or remove installed apps, run `aerotizen apps` and `aerotizen debloat`.

## Limits

Samsung doesn't support any of this officially, so some parts are workarounds:

- Pressing Home brings AeroTizen back after a second or two. That works from Samsung's home
  screen and inside Netflix, but not inside YouTube, Prime Video, Stremio or Spotify. Those apps
  don't report whether they're on screen, so there's no way to tell. Back still works everywhere.
- On Tizen 6 and newer, store and preinstalled apps can't be removed over the developer
  connection. You can delete them on the TV under Apps → Settings. Samsung's system apps (TV Plus,
  Gaming Hub) can only be disabled.
- TV apps are drawn at 1920×1080 and upscaled, even on a 4K panel. Only video plays at full 4K.
- Samsung's own menus and screens can't be changed. The [settings guide](docs/settings.md) and
  [DNS lists](dns/) cover what you can switch off.

## Contributing

I made this for my own TV, but I'd love for it to work well on more of them and to get further
away from the ads and clutter Tizen ships with. The most helpful thing is trying it on your TV
and reporting what works. Pull requests are welcome too. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- [LTvLauncher](https://github.com/leanbitlab-org/LtvLauncher), which the layout is based on
- [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) and [tizen-sdb](https://github.com/PatrickSt1991/tizen-sdb), for how the developer connection, certificates and signing work
- [samsung-tizen-tv-debloat](https://github.com/ardazeytin/samsung-tizen-tv-debloat), for which packages are safe to remove
- App logos from [Simple Icons](https://simpleicons.org) (trademarks belong to their owners)
- Weather from [Open-Meteo](https://open-meteo.com), location from [ipapi](https://ipapi.co)

This project isn't affiliated with Samsung. Use it at your own risk.

## License

[MIT](LICENSE)
