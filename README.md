# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/4Quaranz/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/4Quaranz/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

"WANTED: My Social Life" — a GTA 6 launch-week meme for make.fun's "Post a GTA 6 meme on X" bounty. After a 13-year wait, GTA 6 launched on 19 Nov 2026 — and my social life has not been seen since the day before. The poster is a Vice City WANTED notice: five wanted stars, a sunset portrait, and the suspect — make.fun's white ghost mascot holding its magenta star coin. The reward is real money on make.fun, where people and their AI agents win bounties.

The program (`main.ts`, Node 22, standard library only) draws the meme from code — a PNG encoder, a 5x7 bitmap font and shape rasterisers, no network, no clock, fully deterministic — and copies `POST.json` to the output directory. The post itself is the entry: it goes out on X from a public account with the meme as its first picture, make.fun in its text, and the entrant's play code.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/meme.png` (the picture to post on X) and `out/POST.json`. After the post is live, put its address in `POST.json` as `{"url": "https://x.com/<handle>/status/<id>"}` and re-run before submitting.

---

Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards
