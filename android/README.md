# 出海舰deeptutor Android

Android 客户端是一个受限的原生 WebView 容器。默认连接出海舰deeptutor 官方服务器，用户也可在应用顶部的“服务器”入口指定自己的服务端。它与网页版共用界面、账号、登录 Cookie、WebSocket 聊天、研究任务和服务器数据。

## 安全边界

- 自定义服务端地址保存在设备本地；留空会恢复官方服务端。
- WebView 只在应用内加载当前选定的服务器主机；外部链接交给系统浏览器。
- Cookie 由 Android WebView 的 Cookie 存储管理，JavaScript 无法读取服务器设置的 `HttpOnly` 登录 Cookie。
- SSL 证书错误一律拒绝，不允许用户点击绕过。
- 默认服务器使用 `https://www.chuhaijian.com/deeptutor`，应用禁止明文网络连接。

## 构建

```bash
cd android
./gradlew assembleDebug
```

调试 APK 输出到 `app/build/outputs/apk/debug/app-debug.apk`。

## 发布

正式发布前，在 Android Studio 的 **Build > Generate Signed App Bundle or APK** 中使用团队的发布密钥签名。签名密钥和密码不得提交到仓库。
