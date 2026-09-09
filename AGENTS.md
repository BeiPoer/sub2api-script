# 项目约定

- 修改任意 `.user.js` 用户脚本后，必须同步递增该脚本头部的 `@version`，确保 Tampermonkey/Greasemonkey 能检测到更新。
- 提交前运行 `node --check` 检查修改后的用户脚本语法。
