# 七星剑境 · Seven Stars Sword Realms

基于 [jbang2004/long-wind](https://github.com/jbang2004/long-wind) 改编的浏览器三维武侠动作游戏。扮演丘处机，在风雨牛家村完成一段有分支选择的同人序章，或进入草原、竹林、边城演武。

**[在线试玩](https://play1.heyluckyme.com/)** · **[手机流畅触控版](https://play1.heyluckyme.com/?q=low&touch=1)** · [改编说明](ADAPTATION.md) · [资源署名](CREDITS.md)

![手机横屏实机](docs/media/mobile-landscape.png)

## 玩法

- 精准招架、极限闪避与制敌积攒七星剑意；三星强化剑境，七星触发北斗合一。
- 守 · 回风、破 · 惊雷、御 · 流云三条剑路；各施一次强化剑境，第三路触发三路共鸣。
- 救人或追敌的选择、三段遭遇、试招目标、战斗小结与自由探索。
- Three.js / WebGL 2 三维场景、程序化天气和 WebAudio 声音，无需后端。

操作反馈：轻剑按下即出招，持续按住会在衔接窗口转入重剑蓄势；松手劈斩。连招收势时闪避优先，横移保持镜头方向。底部显示连剑、蓄势、招架与身法状态，命中点显示伤害和制敌提示；触屏按钮带蓄力与闪避收势进度环。

剧情现围绕一封预知来客的密令与“第七处留白”展开。村门、苔碑与亭檐有三处可察看的旧物；靠近按 X（触屏点提示）探索，记录收在 Z「剑谱 → 雨夜异闻」。读懂环境文字可发现隐藏互动，探索结果会改变终幕对白；遗漏线索仍能完成主线，并在结尾留下继续探索。异闻和已领取奖励在本局重试时保留，重开清空。

2026-10-22 更新：剑路面板统一移入设置；增加按下即出剑、命中与蓄势反馈；重写雨夜密令主线，加入三处实景线索、铜铃机关、可回看的星阵与条件结尾。剑谱内的「剑招 / 雨夜异闻」导航和关闭按钮会固定显示，便于横屏阅读。

## 本地运行

需要 Node.js 22.12+ 和支持 WebGL 2 的现代浏览器。

```sh
git clone https://github.com/papacs/seven-stars-sword-realms.git
cd seven-stars-sword-realms
npm ci --ignore-scripts
npm run dev
```

访问 http://127.0.0.1:5173/ 。已有游戏资源随仓库保留，无需运行素材抓取脚本。

```sh
npm test          # 战斗、剧情、剑意与音频生命周期测试
npm run build     # 生成 dist/
npm run preview   # 通过 HTTP 预览生产构建
```

启动本地服务后，可运行 `node tools/verify-experience.mjs --polish` 验证出招反馈、蓄力松手、实际命中与横屏触控；`node tools/verify-mystery.mjs` 验证线索、机关、奖励去重和异闻结尾。`GAME_URL` 可指定服务地址，默认 `http://127.0.0.1:4173/`。不带参数运行完整剧情与菜单回归，截图保存在上一级 `previews/`。

不能直接双击 `dist/index.html` 运行。`private: true` 仅用于防止误发布 npm 包，GitHub 仓库是公开的。

## 操作与手机

| 操作 | 按键 |
| --- | --- |
| 行走 / 连击 / 重剑 | WASD / J 或左键 / C |
| 招架 / 闪避 / 锁定 | K 或右键 / Space / Q |
| 切换剑路 / 满气剑境 | 1、2、3 / E |
| 交谈察看 / 剑谱 / 视角归位 | X / Z / B |
| 静音 / 暂停 | M / Esc |

剑路选择统一在「设置 → 剑境选择」，桌面和触屏战场均不常驻选择面板。选择后返回江湖，桌面按 E 释放满气剑境，也可用 1/2/3 快捷换路；手机建议横屏，用左侧摇杆和右侧招式按钮，真气满时点「气」。声音调节在设置的声音页签中。实际流畅度取决于设备性能。

`?q=low` 使用流畅画质；`?touch=1` 强制显示触控按钮；`?level=steppe|bamboo|town` 进入演武地图。

## 部署

本项目为静态站点，构建输出目录是 `dist`，可部署到 Cloudflare Pages 等静态托管服务。

当前演示环境为 Cloudflare Pages 项目 `seven-stars-play1`，生产分支为 `main`，正式入口为 [play1.heyluckyme.com](https://play1.heyluckyme.com/)，Pages 地址为 [seven-stars-play1.pages.dev](https://seven-stars-play1.pages.dev/)。只发布 `dist/` 中的静态文件。

```sh
npm test
npm run build
node tools/verify-experience.mjs
node tools/verify-mystery.mjs
npx wrangler pages deploy dist --project-name seven-stars-play1 --branch main
node tools/verify-release.mjs
```

浏览器验收需先启动 `npm run preview`，默认检查本地 4173 端口；可通过 `GAME_URL` 指向其他预览或正式地址。部署命令需要上述项目的 Cloudflare 权限。`verify-release.mjs` 比较正式域名的入口和剧情资源与本地构建是否一致，其他部署地址可用 `RELEASE_URL` 指定。发布到自己的账户时替换项目名并自行配置域名与凭据，不要提交令牌或 `.env`。发布验证通过后再提交并推送当前分支；仓库的 GitHub CI 只负责测试和构建。

## 开源与署名

源码采用 [MIT License](LICENSE)。保留上游作者 jbang2004 的版权及许可声明；本项目的剧情、七星剑意、剑路、设置页与触控适配等改编也按 MIT 提供。

**模型、动作、字体等第三方资源各自沿用原许可，不能统一视为 MIT 素材。** 请先阅读 [CREDITS.md](CREDITS.md)：Tripo 角色与 Mixamo 动作不是可单独提取、转售或再分发的 MIT 素材。Poly Haven 资源为 CC0，字体遵循各自字体许可。

本作是非官方同人演绎，不代表相关作品权利人的授权或背书。完整改编范围见 [ADAPTATION.md](ADAPTATION.md)，贡献方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
