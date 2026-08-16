# chuhaijiandeeptutor iOS

原生 iOS `WKWebView` 客户端，默认连接 chuhaijiandeeptutor 官方服务器，也允许用户通过顶部“服务器”入口指定自己的服务端。它与网页版及 Android 版共享账号、Cookie、聊天、Learning Space 和学习进度。

## 构建

```bash
cd ios
xcodebuild -project DeepTutor.xcodeproj \
  -scheme DeepTutor \
  -sdk iphonesimulator \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO build
```

真机安装或发布 TestFlight 时，在 Xcode 的 Signing & Capabilities 中选择团队并配置发布证书。Apple 不允许未签名 IPA 安装到普通 iPhone。

## 安全边界

- 默认服务端为 `https://www.chuhaijian.com/deeptutor`，自定义服务端地址保存在设备本地。
- 应用内仅加载当前选定的 HTTPS 服务端；不允许明文服务端地址。
- 其他 HTTP、HTTPS、电话和邮件链接交给系统应用。
- App Transport Security 保持开启，不允许明文 HTTP 连接。
- 登录 Cookie 由 `WKWebsiteDataStore` 管理。
