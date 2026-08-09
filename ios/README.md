# 出海舰 DeepTutor iOS

原生 iOS `WKWebView` 客户端，固定连接 DeepTutor 服务器，与网页版及 Android 版共享账号、Cookie、聊天、Learning Space 和学习进度。

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

- 应用内仅加载编译时固定的 `http://102.134.48.49/`。
- 其他 HTTP、HTTPS、电话和邮件链接交给系统应用。
- HTTP 临时例外仅允许当前服务器 IP；服务器启用 HTTPS 后应删除该例外。
- 登录 Cookie 由 `WKWebsiteDataStore` 管理。
