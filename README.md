# Sub2API 油猴脚本

本仓库存放用于 Sub2API 的油猴脚本。请通过远程链接安装，这样 Tampermonkey 才能从 GitHub 自动检查和获取更新。

## 远程安装

先安装 [Tampermonkey](https://www.tampermonkey.net/)，然后按下面的方式安装：

1. 复制下方对应脚本的 Raw 链接。
2. 打开油猴图标，进入“管理面板”。
3. 打开“实用工具”（Utilities），找到“从 URL 安装”（Install from URL）。
4. 粘贴链接并点击“安装”，在打开的确认页面再次点击“安装”。
5. 确认脚本已启用，打开或刷新 Sub2API 页面。

| 脚本 | 远程安装链接 |
| --- | --- |
| IDEA 外观 | [安装链接](https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-idea.user.js) |
| 企业微信外观 | [安装链接](https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-wecom.user.js) |
| 模型测试工具箱 | [安装链接](https://raw.githubusercontent.com/BeiPoer/sub2api-script/main/sub2api-model-toolbox.user.js) |

也可以直接点击“安装链接”，Tampermonkey 通常会自动打开安装确认页。如果浏览器只显示脚本源码，请把同一个链接粘贴到“从 URL 安装”输入框中。

请使用上表中的 Raw 链接，不要使用 GitHub 的 `blob` 页面链接，也不要把脚本代码复制到油猴编辑器中安装。上面的链接跟随 `main` 分支，仓库发布新版本后会继续指向最新代码。

## 自动更新

脚本已经配置固定的 `@updateURL` 和 `@downloadURL`。安装完成后，Tampermonkey 会按照全局更新设置检查远程版本并安装更新。

请在油猴“管理面板”的“设置”中确认：

- “脚本更新”没有设置为“从不”。
- 如果版本中显示“自动安装”（Automatic installation），请将其开启。

需要立即检查时，可以在油猴菜单或管理面板中执行“检查更新”。更新后刷新 Sub2API 页面即可生效。新版油猴对新增权限可能会再次要求确认。

维护者发布更新时，需要递增脚本顶部的 `@version`，并将文件推送到 `main` 分支。只修改代码而不增加版本号，Tampermonkey 不会把它识别为新版本。相关元数据说明见 [Tampermonkey 文档](https://www.tampermonkey.net/documentation.php?locale=zh_&q=update_url)。

## 设置生效站点

脚本默认匹配所有 HTTP/HTTPS 网站。需要限制到自己的 Sub2API 地址时，在油猴管理面板中打开脚本的“设置”：

1. 在“包含/排除”设置中停用原始的全站匹配规则。
2. 在“用户匹配”（User matches）中添加自己的地址，例如 `https://sub2api.example.com/*`。
3. 保存设置并刷新页面。

通过油猴设置添加匹配规则，不需要修改远程脚本源码，后续自动更新也不会覆盖这项设置。更多说明见 [Tampermonkey FAQ](https://www.tampermonkey.net/faq.php?q=Q103)。

## 使用提示

- IDEA 外观和企业微信外观只启用其中一个，避免样式和布局冲突。
- 模型测试工具箱在 Sub2API 管理员页面中使用，需要管理员账号权限。
- 停用脚本后刷新页面；卸载脚本后同样建议刷新页面。

## 常见问题

- 安装链接返回 404：确认仓库的 `main` 分支已经发布对应的 `.user.js` 文件，并确认 Raw 链接可以访问。
- 页面没有生效：检查油猴扩展、脚本和当前站点访问权限是否已启用，然后确认用户匹配规则并刷新页面。
- Chrome 等 Chromium 浏览器可能还需要在扩展详情中开启“允许用户脚本”，或按浏览器版本启用“开发者模式”，具体见 [Tampermonkey 官方说明](https://www.tampermonkey.net/faq.php?q=Q209)。
- 没有自动更新：检查更新间隔、自动安装设置、Raw 链接是否可访问，以及远程脚本的 `@version` 是否高于已安装版本。
