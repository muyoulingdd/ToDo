export default {
  async fetch(request, env, ctx) {
    const OWNER = "muyoulingdd";
    const REPO = "ToDo";
    const APK_NAME = "ToDo.apk";

    const url = new URL(request.url);

    if (url.pathname === "/check") {
      const current = url.searchParams.get("version") || "0.0.0";

      const release = await getLatestReleaseWithApk(OWNER, REPO, APK_NAME, env);
      const latest = getReleaseVersion(release);
      const asset = getApkAsset(release, APK_NAME);
      const downloadUrl = buildDownloadUrl(url, env, release, asset);

      return Response.json({
        update: compareVersion(latest, current) > 0,
        current_version: current,
        latest_version: latest,
        tag: release.tag_name,
        changelog: release.body,
        size: asset?.size || null,
        download_url: downloadUrl
      }, {
        headers: {
          "Cache-Control": "public, max-age=60, must-revalidate"
        }
      });
    }

    if (url.pathname === "/download") {
      const tag = url.searchParams.get("tag");
      const release = tag
        ? await getReleaseByTagWithApk(OWNER, REPO, APK_NAME, tag, env)
        : await getLatestReleaseWithApk(OWNER, REPO, APK_NAME, env);
      const asset = getApkAsset(release, APK_NAME);

      if (!asset) {
        return new Response("APK not found", { status: 404 });
      }

      const upstreamDownloadUrl = buildUpstreamDownloadUrl(env, release, asset);
      return Response.redirect(upstreamDownloadUrl, 302);
    }

    return Response.json({
      usage: {
        check: `${url.origin}/check?version=1.0.0`,
        download: `${url.origin}/download`
      }
    });
  }
};

function getApkAsset(release, apkName) {
  return release.assets.find((asset) => asset.name === apkName);
}

function buildDownloadUrl(url, env, release, asset) {
  const directUrl = buildDirectDownloadUrl(env, release, asset);
  if (directUrl) {
    return directUrl;
  }

  return `${url.origin}/download?tag=${encodeURIComponent(release.tag_name)}`;
}

function buildUpstreamDownloadUrl(env, release, asset) {
  return (
    buildDirectDownloadUrl(env, release, asset) ||
    asset.browser_download_url
  );
}

function buildDirectDownloadUrl(env, release, asset) {
  if (env.APK_DOWNLOAD_URL) {
    return env.APK_DOWNLOAD_URL;
  }

  if (env.DOWNLOAD_BASE_URL) {
    return joinUrl(env.DOWNLOAD_BASE_URL, `${release.tag_name}/${asset.name}`);
  }

  return null;
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;
}

async function getLatestReleaseWithApk(owner, repo, apkName, env) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`,
    {
      headers: {
        "User-Agent": "ToDo-App-Updater",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cf: {
        cacheTtl: 300,
        cacheEverything: true
      }
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch GitHub release");
  }

  const releases = await res.json();
  if (!Array.isArray(releases)) {
    throw new Error("Invalid GitHub releases response");
  }

  const candidates = releases
    .filter((release) => !release.draft)
    .filter((release) => Array.isArray(release.assets))
    .filter((release) => release.assets.some((asset) => asset.name === apkName))
    .sort((left, right) => {
      const leftTime = Date.parse(left.published_at || left.created_at || 0);
      const rightTime = Date.parse(right.published_at || right.created_at || 0);
      return rightTime - leftTime;
    });

  if (candidates.length === 0) {
    throw new Error("No GitHub release with APK found");
  }

  return candidates[0];
}

async function getReleaseByTagWithApk(owner, repo, apkName, tag, env) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: {
        "User-Agent": "ToDo-App-Updater",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub release by tag: ${tag}`);
  }

  const release = await res.json();
  if (!release || release.draft || !Array.isArray(release.assets)) {
    throw new Error(`Invalid GitHub release for tag: ${tag}`);
  }

  const hasApk = release.assets.some((asset) => asset.name === apkName);
  if (!hasApk) {
    throw new Error(`No APK found for tag: ${tag}`);
  }

  return release;
}

function getReleaseVersion(release) {
  const rawVersion = release.tag_name || release.name || "0.0.0";
  return rawVersion.replace(/^v/i, "").trim();
}

function compareVersion(a, b) {
  const pa = normalizeVersion(a);
  const pb = normalizeVersion(b);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;

    if (x > y) return 1;
    if (x < y) return -1;
  }

  return 0;
}

function normalizeVersion(version) {
  return String(version)
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}
