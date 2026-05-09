package com.todo.minimal;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.text.format.Formatter;
import android.util.Log;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "AppUpdate";
    private static final String APK_FILE_NAME = "ToDo.apk";
    private static final String APK_MIME_TYPE = "application/vnd.android.package-archive";
    private static final String UPDATE_CHECK_URL =
            "https://todo-update.muyoulingdd.workers.dev/check?version=%s";
    private static final int NETWORK_TIMEOUT_MS = 15000;

    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private AlertDialog updateDialog;
    private AlertDialog downloadProgressDialog;
    private long currentDownloadId = -1L;
    private String pendingDownloadUrl;
    private File downloadedApkFile;
    private boolean pendingDownloadAfterPermission;
    private boolean pendingInstallAfterPermission;
    private boolean downloadReceiverRegistered;
    private ProgressBar downloadProgressBar;
    private TextView downloadProgressText;
    private final Runnable downloadProgressRunnable = new Runnable() {
        @Override
        public void run() {
            updateDownloadProgress();
        }
    };

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || !DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) {
                return;
            }

            long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (downloadId != currentDownloadId) {
                return;
            }

            handleDownloadCompleted(downloadId);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerDownloadReceiver();
        checkForUpdatesOnLaunch();
    }

    @Override
    public void onResume() {
        super.onResume();

        if (pendingDownloadAfterPermission && hasInstallPermission()) {
            pendingDownloadAfterPermission = false;
            startApkDownload(pendingDownloadUrl);
        }

        if (pendingInstallAfterPermission && hasInstallPermission()) {
            pendingInstallAfterPermission = false;
            installDownloadedApk();
        }
    }

    @Override
    public void onDestroy() {
        if (downloadReceiverRegistered) {
            unregisterReceiver(downloadReceiver);
            downloadReceiverRegistered = false;
        }
        if (updateDialog != null) {
            updateDialog.dismiss();
        }
        dismissDownloadProgressDialog();
        mainHandler.removeCallbacks(downloadProgressRunnable);
        executorService.shutdownNow();
        super.onDestroy();
    }

    private void checkForUpdatesOnLaunch() {
        final String currentVersion = getCurrentVersionName();
        executorService.execute(() -> {
            try {
                String response = requestUpdateInfo(currentVersion);
                UpdateInfo updateInfo = parseUpdateInfo(response);
                if (!updateInfo.shouldUpdate) {
                    return;
                }

                runOnUiThread(() -> showUpdateDialog(updateInfo));
            } catch (Exception exception) {
                Log.w(TAG, "Update check failed", exception);
            }
        });
    }

    private String getCurrentVersionName() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception exception) {
            Log.w(TAG, "Failed to read package version", exception);
            return "0";
        }
    }

    private String requestUpdateInfo(String currentVersion) throws IOException {
        HttpURLConnection connection = null;
        InputStream inputStream = null;
        try {
            URL url = new URL(String.format(UPDATE_CHECK_URL, Uri.encode(currentVersion)));
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(NETWORK_TIMEOUT_MS);
            connection.setReadTimeout(NETWORK_TIMEOUT_MS);
            connection.setRequestProperty("Accept", "application/json");

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                throw new IOException("Unexpected response code: " + responseCode);
            }

            inputStream = connection.getInputStream();
            return readStreamFully(inputStream);
        } finally {
            if (inputStream != null) {
                inputStream.close();
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private UpdateInfo parseUpdateInfo(String response) throws Exception {
        JSONObject jsonObject = new JSONObject(response);
        UpdateInfo updateInfo = new UpdateInfo();
        updateInfo.shouldUpdate = jsonObject.optBoolean("update", false);
        updateInfo.latestVersion = jsonObject.optString("latest_version", "");
        updateInfo.changelog = jsonObject.optString("changelog", "");
        updateInfo.downloadUrl = jsonObject.optString("download_url", "");
        updateInfo.fileSize = jsonObject.optLong("size", 0L);
        return updateInfo;
    }

    private String readStreamFully(InputStream inputStream) throws IOException {
        BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8)
        );
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            builder.append(line);
        }
        return builder.toString();
    }

    private void showUpdateDialog(UpdateInfo updateInfo) {
        if (isFinishing() || isDestroyed()) {
            return;
        }

        if (updateDialog != null && updateDialog.isShowing()) {
            updateDialog.dismiss();
        }

        String latestVersion = TextUtils.isEmpty(updateInfo.latestVersion)
                ? "未知版本"
                : updateInfo.latestVersion;
        String changelog = TextUtils.isEmpty(updateInfo.changelog)
                ? "暂无更新日志"
                : updateInfo.changelog;
        String sizeText = updateInfo.fileSize > 0
                ? Formatter.formatFileSize(this, updateInfo.fileSize)
                : "未知大小";

        String message = "最新版本：" + latestVersion
                + "\n\n更新日志：\n" + changelog
                + "\n\n文件大小：" + sizeText;

        updateDialog = new AlertDialog.Builder(this)
                .setTitle("发现新版本")
                .setMessage(message)
                .setCancelable(false)
                .setPositiveButton("立即更新", (dialog, which) -> {
                    pendingDownloadUrl = updateInfo.downloadUrl;
                    ensureInstallPermissionThenContinue(true);
                })
                .setNegativeButton("稍后再说", null)
                .show();
    }

    private void ensureInstallPermissionThenContinue(boolean forDownload) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !hasInstallPermission()) {
            if (forDownload) {
                pendingDownloadAfterPermission = true;
            } else {
                pendingInstallAfterPermission = true;
            }
            openUnknownSourcesSettings();
            return;
        }

        if (forDownload) {
            startApkDownload(pendingDownloadUrl);
        } else {
            installDownloadedApk();
        }
    }

    private boolean hasInstallPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls();
    }

    private void openUnknownSourcesSettings() {
        Toast.makeText(this, "请先允许安装未知来源应用", Toast.LENGTH_LONG).show();
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
        intent.setData(Uri.parse("package:" + getPackageName()));
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException exception) {
            Log.w(TAG, "Failed to open unknown app sources settings", exception);
            Toast.makeText(this, "无法打开安装权限设置页", Toast.LENGTH_LONG).show();
        }
    }

    private void startApkDownload(String downloadUrl) {
        if (TextUtils.isEmpty(downloadUrl)) {
            Toast.makeText(this, "未找到有效的下载地址", Toast.LENGTH_LONG).show();
            return;
        }

        DownloadManager downloadManager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (downloadManager == null) {
            Toast.makeText(this, "系统下载服务不可用", Toast.LENGTH_LONG).show();
            return;
        }

        File downloadDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloadDir == null) {
            Toast.makeText(this, "无法访问下载目录", Toast.LENGTH_LONG).show();
            return;
        }

        File targetFile = new File(downloadDir, APK_FILE_NAME);
        File parent = targetFile.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            Toast.makeText(this, "无法创建下载目录", Toast.LENGTH_LONG).show();
            return;
        }
        if (targetFile.exists() && !targetFile.delete()) {
            Log.w(TAG, "Existing APK could not be deleted: " + targetFile.getAbsolutePath());
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(downloadUrl));
        request.setTitle("ToDo 更新");
        request.setDescription("正在下载最新安装包");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);
        request.setMimeType(APK_MIME_TYPE);
        request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, APK_FILE_NAME);

        try {
            currentDownloadId = downloadManager.enqueue(request);
            downloadedApkFile = targetFile;
            pendingInstallAfterPermission = false;
            showDownloadProgressDialog();
            scheduleDownloadProgressUpdate();
            Toast.makeText(this, "开始下载更新", Toast.LENGTH_SHORT).show();
        } catch (Exception exception) {
            Log.w(TAG, "Failed to enqueue APK download", exception);
            Toast.makeText(this, "下载启动失败", Toast.LENGTH_LONG).show();
        }
    }

    private void handleDownloadCompleted(long downloadId) {
        DownloadManager downloadManager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (downloadManager == null) {
            Toast.makeText(this, "系统下载服务不可用", Toast.LENGTH_LONG).show();
            return;
        }

        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = downloadManager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                Toast.makeText(this, "下载结果读取失败", Toast.LENGTH_LONG).show();
                return;
            }

            @SuppressLint("Range")
            int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                dismissDownloadProgressDialog();
                mainHandler.removeCallbacks(downloadProgressRunnable);
                ensureInstallPermissionThenContinue(false);
                return;
            }

            @SuppressLint("Range")
            int reason = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_REASON));
            Log.w(TAG, "Download failed, reason: " + reason);
            dismissDownloadProgressDialog();
            mainHandler.removeCallbacks(downloadProgressRunnable);
            Toast.makeText(this, "下载失败", Toast.LENGTH_LONG).show();
        } catch (Exception exception) {
            Log.w(TAG, "Failed to inspect download result", exception);
            dismissDownloadProgressDialog();
            mainHandler.removeCallbacks(downloadProgressRunnable);
            Toast.makeText(this, "下载失败", Toast.LENGTH_LONG).show();
        }
    }

    private void installDownloadedApk() {
        if (downloadedApkFile == null || !downloadedApkFile.exists()) {
            Toast.makeText(this, "安装包不存在", Toast.LENGTH_LONG).show();
            return;
        }

        Uri apkUri = FileProvider.getUriForFile(
                this,
                getPackageName() + ".fileprovider",
                downloadedApkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, APK_MIME_TYPE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            startActivity(intent);
        } catch (ActivityNotFoundException exception) {
            Log.w(TAG, "Failed to open APK installer", exception);
            Toast.makeText(this, "无法打开安装界面", Toast.LENGTH_LONG).show();
        }
    }

    private void showDownloadProgressDialog() {
        if (isFinishing() || isDestroyed()) {
            return;
        }

        if (downloadProgressDialog == null) {
            LinearLayout container = new LinearLayout(this);
            int padding = dpToPx(20);
            container.setOrientation(LinearLayout.VERTICAL);
            container.setPadding(padding, padding, padding, padding);

            downloadProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
            downloadProgressBar.setLayoutParams(new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            ));
            downloadProgressBar.setMax(100);

            downloadProgressText = new TextView(this);
            LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            textParams.topMargin = dpToPx(12);
            downloadProgressText.setLayoutParams(textParams);
            downloadProgressText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
            downloadProgressText.setText("准备下载...");

            container.addView(downloadProgressBar);
            container.addView(downloadProgressText);

            downloadProgressDialog = new AlertDialog.Builder(this)
                    .setTitle("正在更新")
                    .setView(container)
                    .setCancelable(false)
                    .create();
        }

        if (!downloadProgressDialog.isShowing()) {
            downloadProgressDialog.show();
        }
    }

    private void dismissDownloadProgressDialog() {
        if (downloadProgressDialog != null && downloadProgressDialog.isShowing()) {
            downloadProgressDialog.dismiss();
        }
    }

    private void scheduleDownloadProgressUpdate() {
        mainHandler.removeCallbacks(downloadProgressRunnable);
        mainHandler.post(downloadProgressRunnable);
    }

    private void updateDownloadProgress() {
        DownloadManager downloadManager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
        if (downloadManager == null || currentDownloadId == -1L) {
            return;
        }

        DownloadManager.Query query = new DownloadManager.Query().setFilterById(currentDownloadId);
        try (Cursor cursor = downloadManager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                return;
            }

            @SuppressLint("Range")
            int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));
            if (status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PAUSED || status == DownloadManager.STATUS_PENDING) {
                @SuppressLint("Range")
                long downloadedBytes = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                @SuppressLint("Range")
                long totalBytes = cursor.getLong(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));

                int progress = totalBytes > 0 ? (int) ((downloadedBytes * 100) / totalBytes) : 0;
                if (downloadProgressBar != null) {
                    downloadProgressBar.setIndeterminate(totalBytes <= 0);
                    if (totalBytes > 0) {
                        downloadProgressBar.setProgress(progress);
                    }
                }
                if (downloadProgressText != null) {
                    if (totalBytes > 0) {
                        String downloadedText = Formatter.formatFileSize(this, downloadedBytes);
                        String totalText = Formatter.formatFileSize(this, totalBytes);
                        downloadProgressText.setText("已下载 " + progress + "%（" + downloadedText + " / " + totalText + "）");
                    } else {
                        downloadProgressText.setText("正在下载更新...");
                    }
                }

                mainHandler.postDelayed(downloadProgressRunnable, 500);
                return;
            }

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                if (downloadProgressBar != null) {
                    downloadProgressBar.setIndeterminate(false);
                    downloadProgressBar.setProgress(100);
                }
                if (downloadProgressText != null) {
                    downloadProgressText.setText("下载完成，准备安装...");
                }
                return;
            }

            mainHandler.removeCallbacks(downloadProgressRunnable);
        } catch (Exception exception) {
            Log.w(TAG, "Failed to update download progress", exception);
            mainHandler.removeCallbacks(downloadProgressRunnable);
        }
    }

    private int dpToPx(int dp) {
        return Math.round(
                TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP,
                        dp,
                        getResources().getDisplayMetrics()
                )
        );
    }

    private void registerDownloadReceiver() {
        if (downloadReceiverRegistered) {
            return;
        }

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }
        downloadReceiverRegistered = true;
    }

    private static class UpdateInfo {
        boolean shouldUpdate;
        String latestVersion;
        String changelog;
        String downloadUrl;
        long fileSize;
    }
}
