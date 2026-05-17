# 部署免费云存档（Cloudflare Workers）

5 分钟搞定，**完全免费**，不会因为不付费过期。

## 你最终会拿到什么

一个像 `https://shadowcontract-gold.你的子域.workers.dev` 的 URL，把它粘到游戏菜单的"云存档 URL"输入框，金币就能跨设备同步。

---

## 方式 A · 网页点点点（推荐 · 不需要装任何东西）

### 1. 注册 Cloudflare 账号
打开 <https://dash.cloudflare.com/sign-up/workers-and-pages>，用邮箱注册（免费）。

### 2. 创建一个 KV 命名空间（用来存数据）
- 登录后，左侧导航 **Workers & Pages → KV**
- 点 **Create a namespace**
- 名字随便填，比如 `shadowcontract-gold-kv`
- 创建后会看到这个命名空间出现在列表里

### 3. 创建 Worker
- 左侧导航回到 **Workers & Pages**
- 点 **Create application → Create Worker**
- 名字填 `shadowcontract-gold`（也可以改，最终 URL 就是 `<这个名字>.<你的子域>.workers.dev`）
- 点 **Deploy**（先随便部署一下默认代码，下一步再替换）

### 4. 替换代码
- 在刚创建的 Worker 页面点 **Edit code**
- 把右边整段默认代码全选删掉
- 把 `worker/index.js` 的内容（80 行左右）整段粘进去
- 右上角点 **Save and deploy**

### 5. 把 KV 绑定到 Worker
- 回到 Worker 详情页 → **Settings** → **Variables**
- 找到 **KV Namespace Bindings** → **Add binding**
- Variable name 填：`GOLD`（**必须是大写 GOLD**，跟代码里对应）
- KV namespace 选你第 2 步创建的那个
- 点 **Save and deploy**

### 6. 拿到 URL
- 回到 Worker 详情页顶部，URL 就在那里，类似 `https://shadowcontract-gold.xxxxx.workers.dev`
- 浏览器打开这个 URL，应该看到一行字：
  `ShadowContract gold-sync OK ...`
- 看到就说明部署成功！

### 7. 在游戏里启用
- 打开游戏 → 主菜单 → 「金币存档」面板
- 粘你的 Worker URL 到「云存档 URL」
- 自己起一个用户名（2-32 位字母/数字，比如 `qirong`）
- 自己设一个 PIN（4-12 位数字，比如 `123456`）—— 这串记好，换电脑时也用这个
- 点 **启用云存档**

成功后状态会显示「☁ 已启用」。以后金币变化自动同步到云端，换电脑只要填同样的 URL + 用户名 + PIN 就能拿到存档。

---

## 方式 B · 命令行（如果你装了 Node）

```bash
cd worker
npm install -g wrangler
wrangler login                    # 浏览器登录
wrangler kv:namespace create GOLD # 复制返回的 id

# 编辑 wrangler.toml，把 KV id 填进去（取消上面注释的那几行）
wrangler deploy
```

---

## 免费额度（够你玩很久）

Cloudflare Workers 免费档：
- **100,000 次请求/天**
- KV：**100,000 次读 / 1,000 次写 / 1GB 存储 · 全部按天计**

游戏现在写云的时机：游戏开始时拉一次、击杀/拾取后 debounce 2 秒推一次。一天玩 8 小时也写不到 1000 次。

---

## 安全说明（很重要）

- 这个 PIN 只是「防撞用户名」的，**不是真正的认证**。任何知道你 URL + 用户名 + PIN 的人都能读写你的存档。
- **千万不要在 PIN 里复用银行/邮箱密码**。
- 你的 Worker URL 也不要公开发，否则别人能猜用户名+PIN 撞库。

---

## 常见问题

**Q: 国内能用吗？**
A: Cloudflare 在国内访问通常 OK 但有时会慢。如果一直连不上，可以试试 LeanCloud / 又拍云函数（国内服务），或者用代理。

**Q: 我的 Worker 不工作怎么办？**
A: 浏览器打开你的 Worker URL，看返回啥。如果是 500 错误说 "KV namespace GOLD 未绑定"，回到第 5 步检查绑定。

**Q: 数据会丢吗？**
A: Cloudflare KV 是真正的持久化存储，不会丢。但你也可以定期点游戏里的「导出存档」当备份。

**Q: 怎么删除一个用户？**
A: 去 Cloudflare 仪表盘 → KV → 你的 namespace → 找到 `pin:用户名` 和 `gold:用户名` 两个 key，删掉。
