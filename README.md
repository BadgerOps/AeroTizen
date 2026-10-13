# tizen-declutter

Clean up a Samsung Tizen TV from your computer: remove bloat, block ads, and replace
the ad-filled home screen with a fast, minimal launcher. Pure Python, with no Tizen Studio,
no Samsung binaries and no Rosetta. Runs on macOS (including Apple Silicon), Linux and Windows.

Tested on a 2024 **UN65DU7200** (Tizen 9.0). Reports from other models are welcome.

## What it does

| | How |
|---|---|
| Finds your TV | SSDP discovery, no setup |
| Remote control | `key`, `launch` over the TV's local API (no Developer Mode needed) |
| Lists and classifies apps | pure-Python `sdb` client talking to the TV's developer port |
| Removes bloat | `debloat` (works on older firmware; see limits below) |
| Signs apps for your TV | Samsung account sign-in, then Samsung-issued author + distributor certs |
| Installs a clean launcher | `launcher/`: big logo tiles, inputs, Fireplace, no ads or suggestions |
| Installs ad-free YouTube | re-signs [TizenBrew](https://github.com/reisxd/TizenBrew), which runs [TizenTube](https://github.com/reisxd/TizenTube) |
| Blocks ad and tracking servers | [`dns/`](dns/) blocklists + [settings guide](docs/settings.md) |

## Quick start

```bash
pip install -r requirements.txt        # or: pip install .  (adds a `declutter` command)
python3 -m declutter discover
python3 -m declutter status
```

Requires Python 3.9+. Add `--tv <ip>` to any command if you have more than one TV.

### 1. Turn on Developer Mode (once, on the TV)
1. Open **Apps** and type `1 2 3 4 5` (use the remote's **123** button if it has no number keys).
2. Set **Developer mode: On** and **Host PC IP** to your computer's IP, then press **OK**.
3. **Unplug the TV for a minute.** A normal power-off is not a real restart.
4. `python3 -m declutter status` should show `developerMode=1` and your IP.

### 2. Certificates (once per TV)
```bash
python3 -m declutter certs
```
This opens Samsung's sign-in page. After you sign in, certificates for this TV's DUID are
saved to `~/.config/declutter/certs/`.

### 3. Install the launcher and TizenBrew
```bash
python3 -m declutter install launcher
python3 -m declutter install path/to/TizenBrewStandalone.wgt   # from TizenBrew releases
```
Any `.wgt` or app folder works; it is re-signed for your TV automatically.

**For TizenTube**, set the TV's Developer Mode **Host PC IP to `127.0.0.1`** afterwards and
restart the TV. TizenBrew needs this to load modules. Set it back to your computer's IP when
you want to use this tool again.

### 4. Apps
```bash
python3 -m declutter apps              # classified list
python3 -m declutter debloat           # pick what to remove
```

## Limits (be honest with yourself)

- **Samsung's own UI can't be modified.** Retail firmware has no shell or root
  (`intershell_support: disabled`). The launcher is an app you open; it cannot replace Home.
- **Uninstalling over `sdb` is blocked on Tizen 6+.** The TV answers `can not uninstall app`.
  Use **Apps → ⚙️ → app → Delete** on the TV instead. `debloat` tells you when this happens.
  On older TVs (Tizen 4), `sdb` removal works.
- **System apps** (Samsung TV Plus, Gaming Hub, Art) can only be disabled, not removed.
- Settings (ads, tracking, autorun) have no network API; see [docs/settings.md](docs/settings.md).

## Launcher

`launcher/` is a dependency-free Tizen web app (about 25 KB) whose layout follows
[LTvLauncher](https://github.com/leanbitlab-org/LtvLauncher) for Android TV:

- **Top bar**: settings gear (pick Favorites), current input, date and time
- **Favorites**: large banner tiles (each app's own logo and name on its brand gradient)
- **Apps**: everything else installed, in a medium row
- **Inputs**: HDMI / Live TV cards that switch the TV's source
- Remote-friendly focus ring, transform-only animations (smooth on budget TV chips)

**Fireplace** (first Favorite) plays a fireplace video in YouTube, falling back to a built-in
procedural fire with synthesized crackle audio. Up/Down changes its volume, Back closes it.

Preview it in a desktop browser: `python3 -m http.server -d launcher`.

## Contributing

The most useful contribution is a report from your model: `python3 -m declutter status`
output, your `apps` list, and which menu paths in [docs/settings.md](docs/settings.md)
differ on your TV. Open an issue with your model number and Tizen version.

## Credits

- [LTvLauncher](https://github.com/leanbitlab-org/LtvLauncher) (GPL-3.0): launcher layout and
  visual design reference (no code copied).
- [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) and
  [tizen-sdb](https://github.com/PatrickSt1991/tizen-sdb) (MIT): sdb protocol, certificate
  flow and signing scheme this Python port is based on.
- [samsung-tizen-tv-debloat](https://github.com/ardazeytin/samsung-tizen-tv-debloat) (MIT):
  package safety rules for older firmware.
- [TizenBrew / TizenTube](https://github.com/reisxd/TizenBrew) (GPL-3.0): installed, not bundled.
- DNS lists adapted from community lists by wassname and hkamran80.

Not affiliated with Samsung. Use at your own risk.

## License

MIT
