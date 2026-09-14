const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzrSaDiBKvyvtR6pfu7jnE2tgsR7qpqU6eMkE0toH2DUP6SJ7c2kxweRNTqIQoKNw9DMw/exec";

(function () {
  const targets = document.querySelectorAll("[data-video-autoload]");

  if (!targets.length) return;

  const fallbackImage = "YouTubeMovie_5.jpg";
  let loadedDataPromise;

  function installStyles() {
    if (document.getElementById("apd-latest-videos-style")) return;

    const style = document.createElement("style");
    style.id = "apd-latest-videos-style";
    style.textContent = `
      .apd-latest-video-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .apd-latest-video-card {
        display: flex;
        min-width: 0;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 14px;
        background: #fff;
        color: #2d3748;
        text-decoration: none !important;
        box-shadow: 0 8px 22px rgba(45, 55, 72, 0.08);
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }

      .apd-latest-video-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 14px 28px rgba(45, 55, 72, 0.12);
      }

      .apd-latest-video-thumb {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        background: #111827;
      }

      .apd-latest-video-thumb img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.35s ease;
      }

      .apd-latest-video-card:hover .apd-latest-video-thumb img {
        transform: scale(1.04);
      }

      .apd-latest-play {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.18);
      }

      .apd-latest-play span {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 999px;
        background: #ff8d42;
        color: #fff;
        font-size: 14px;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
      }

      .apd-latest-video-title {
        margin: 0;
        padding: 12px 14px 14px;
        color: #2d3748;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.55;
        letter-spacing: 0;
      }

      .apd-latest-video-grid[data-video-layout="home"] {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .apd-latest-video-grid[data-video-layout="home"] .apd-latest-video-card {
        width: 100%;
        margin: 0 auto;
      }

      .apd-latest-video-grid[data-video-layout="home"] .apd-latest-video-title {
        font-size: 13px;
        line-height: 1.5;
      }

      .apd-latest-video-message {
        grid-column: 1 / -1;
        padding: 16px;
        border-radius: 12px;
        background: #fff;
        color: #4a5568;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
      }

      @media (max-width: 767px) {
        .apd-latest-video-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .apd-latest-video-grid[data-video-layout="sns"] .apd-latest-video-card:nth-child(3) {
          grid-column: 1 / -1;
          width: min(50%, 180px);
          margin: 0 auto;
        }

        .apd-latest-video-grid[data-video-layout="home"] .apd-latest-video-card {
          width: min(100%, 320px);
        }

        .apd-latest-video-grid[data-video-layout="home"] {
          display: block;
        }

        .apd-latest-video-title {
          padding: 10px 10px 11px;
          font-size: 12px;
          line-height: 1.45;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getVideoId(video) {
    const directId = video.videoId || video.id || "";
    if (directId && !String(directId).includes("http")) return String(directId);

    const url = video.url || video.link || directId;
    const match = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{6,})/);
    return match ? match[1] : "";
  }

  function getVideoUrl(video) {
    const videoId = getVideoId(video);
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : video.url || video.link || "#";
  }

  function getThumbnail(video) {
    const videoId = getVideoId(video);
    return video.thumbnailUrl || video.thumbnail || video.image || (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : fallbackImage);
  }

  function getDurationSeconds(video) {
    if (typeof video.durationSeconds === "number") return video.durationSeconds;
    if (typeof video.durationSeconds === "string") return Number(video.durationSeconds) || 0;
    return 0;
  }

  function isExplicitShort(video) {
    const haystack = [
      video.url,
      video.link,
      video.title,
      video.youtubeDescription,
      video.description,
      video.type,
    ].join(" ").toLowerCase();

    return (
      haystack.includes("/shorts/") ||
      haystack.includes("#shorts") ||
      haystack.includes("#short") ||
      haystack.includes("#ショート") ||
      video.isShort === true
    );
  }

  function isLandscapeThumbnail(video) {
    const thumbnail = getThumbnail(video);

    return new Promise((resolve) => {
      const image = new Image();

      image.onload = function () {
        const isLandscape = image.naturalWidth >= image.naturalHeight * 1.2;
        resolve(isLandscape);
      };

      image.onerror = function () {
        resolve(true);
      };

      image.src = thumbnail;
    });
  }

  async function pickLandscapeVideos(videos, count) {
    const picked = [];

    for (const video of videos) {
      if (picked.length >= count) break;
      if (isExplicitShort(video)) continue;

      const landscape = await isLandscapeThumbnail(video);

      if (!landscape) continue;

      picked.push(video);
    }

    return picked;
  }

  function pickAllVideos(videos, count) {
    return videos.slice(0, count);
  }

  function normalizeVideos(data) {
    const videos = Array.isArray(data) ? data : data.videos || data.items || data.entries || [];
    return videos.filter((video) => getVideoId(video));
  }

  function loadJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `apdLatestVideos_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const separator = url.includes("?") ? "&" : "?";
      const script = document.createElement("script");

      window[callbackName] = (data) => {
        delete window[callbackName];
        script.remove();
        resolve(data);
      };

      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error("latest videos failed"));
      };

      script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}&maxResults=50&limit=50`;
      document.head.appendChild(script);
    });
  }

  function renderCard(video) {
    const title = escapeHtml(video.title || "最新動画");
    const thumbnail = escapeHtml(getThumbnail(video));
    const url = escapeHtml(getVideoUrl(video));

    return `
      <a class="apd-latest-video-card" href="${url}" target="_blank" rel="noopener noreferrer">
        <div class="apd-latest-video-thumb">
          <img src="${thumbnail}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImage}'">
          <div class="apd-latest-play" aria-hidden="true"><span><i class="fa-solid fa-play"></i></span></div>
        </div>
        <h4 class="apd-latest-video-title">${title}</h4>
      </a>
    `;
  }

  function showMessage(target, message) {
    target.innerHTML = `<div class="apd-latest-video-message">${escapeHtml(message)}</div>`;
  }

  async function renderTarget(target, data) {
    const count = Number(target.dataset.videoCount || 3);
    const mobileCount = Number(target.dataset.mobileVideoCount || count);
    const activeCount = window.matchMedia("(max-width: 767px)").matches ? mobileCount : count;
    const layout = target.dataset.videoLayout || "sns";
    const allVideos = normalizeVideos(data);
    const videos = layout === "home"
      ? await pickLandscapeVideos(allVideos, activeCount)
      : pickAllVideos(allVideos, activeCount);

    target.classList.add("apd-latest-video-grid");
    target.dataset.videoLayout = layout;

    if (!videos.length) {
      showMessage(target, layout === "home" ? "表示できる横長動画が見つかりませんでした。" : "最新動画が見つかりませんでした。");
      return;
    }

    target.innerHTML = videos.slice(0, activeCount).map(renderCard).join("");
  }

  installStyles();

  loadedDataPromise = loadJsonp(GAS_WEB_APP_URL);

  targets.forEach((target) => {
    showMessage(target, "最新動画を読み込んでいます...");

    loadedDataPromise
      .then((data) => renderTarget(target, data))
      .catch(() => showMessage(target, "最新動画を読み込めませんでした。"));
  });
})();


