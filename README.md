# ToDo

一个基于 React、TypeScript、Vite 和 Capacitor Android 的极简待办应用，包含原生 Android 自动更新能力。

## 功能

- 待办新增、完成、删除
- 任务详情页与进度概览
- 进度逐条记录与详情查看
- Android 启动时自动检查更新
- APK 下载进度显示与安装引导

## 本地开发

安装依赖：

```powershell
npm install
```

启动前端开发环境：

```powershell
npm run dev
```

## Android 打包

同步前端资源到 Android：

```powershell
npm run android:sync
```

使用项目内置 JDK/SDK 构建 APK：

```powershell
.\build-apk.ps1
```

构建完成后，根目录会生成：

- [ToDo.apk](./ToDo.apk)

## 自动更新

Android 原生更新逻辑位于：

- [android/app/src/main/java/com/todo/minimal/MainActivity.java](./android/app/src/main/java/com/todo/minimal/MainActivity.java)

更新检查服务位于：

- [worker.js](./worker.js)

## Release 校验

上传 GitHub release 资产后，执行：

```powershell
npm run release:verify
```

这个校验会比对：

- 本地 [ToDo.apk](./ToDo.apk)
- GitHub release 中的 `ToDo.apk`

比对内容包括：

- 包名
- `versionCode`
- `versionName`
- SHA-256

## 发版规则

发版规则见：

- [RELEASING.md](./RELEASING.md)

当前版本号唯一来源：

- [android/app/build.gradle](./android/app/build.gradle)
