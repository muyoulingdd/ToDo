# Release Process

This project uses the Android app version in [android/app/build.gradle](./android/app/build.gradle) as the single source of truth for releases.

## Source Of Truth

- `versionCode` and `versionName` in [android/app/build.gradle](./android/app/build.gradle)
- The APK to upload is the root [ToDo.apk](./ToDo.apk)

## Required Rules

1. Read [android/app/build.gradle](./android/app/build.gradle) before creating a release.
2. The GitHub release tag must match `versionName`.
   Example:
   - `versionName "1.1.0"` -> release tag `v1.1.0`
3. The uploaded release asset must be [ToDo.apk](./ToDo.apk) generated from the current workspace.
4. After uploading the release asset, run:

```powershell
npm run release:verify
```

5. Do not assume the GitHub release asset is correct unless `npm run release:verify` passes.

## Typical Flow

1. Update `versionCode` and `versionName` in [android/app/build.gradle](./android/app/build.gradle)
2. Build the APK:

```powershell
.\build-apk.ps1
```

3. Create GitHub release tag from `versionName`
4. Upload [ToDo.apk](./ToDo.apk) to that release
5. Verify:

```powershell
npm run release:verify
```
