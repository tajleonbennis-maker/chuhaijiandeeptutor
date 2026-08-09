# 出海舰deeptutor Android

Android 客户端是一个受限的原生 WebView 容器，固定连接出海舰deeptutor 服务器。它与网页版共用界面、账号、登录 Cookie、WebSocket 聊天、研究任务和服务器数据。

## 安全边界

- 应用不提供服务器地址配置界面。
- WebView 只在应用内加载编译时指定的服务器主机；外部链接交给系统浏览器。
- Cookie 由 Android WebView 的 Cookie 存储管理，JavaScript 无法读取服务器设置的 `HttpOnly` 登录 Cookie。
- SSL 证书错误一律拒绝，不允许用户点击绕过。
- 正式服务器使用 `https://www.cyberstroll.cn/`，应用禁止明文网络连接。

## 构建

```bash
cd android
./gradlew assembleDebug
```

调试 APK 输出到 `app/build/outputs/apk/debug/app-debug.apk`。

## 发布

正式发布前，在 Android Studio 的 **Build > Generate Signed App Bundle or APK** 中使用团队的发布密钥签名。签名密钥和密码不得提交到仓库。
