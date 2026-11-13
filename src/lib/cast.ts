// Google Cast (Chromecast) sender: plays on the TV through Google's free Default Media Receiver,
// which shows the cover, title and artist. Only Chrome/Edge ship the Cast SDK.
import type { SongView } from "@/types";

let ready: Promise<boolean> | null = null;
let sdkOk = false;
let link: { player: cast.framework.RemotePlayer; controller: cast.framework.RemotePlayerController } | null = null;

export function loadCastSdk(): Promise<boolean> {
  if (ready) return ready;
  ready = new Promise((resolve) => {
    if (!("chrome" in window)) return resolve(false);
    const timer = setTimeout(() => resolve(false), 10_000);
    window.__onGCastApiAvailable = (ok: boolean) => {
      clearTimeout(timer);
      if (ok) {
        cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        sdkOk = true;
      }
      resolve(ok);
    };
    const s = document.createElement("script");
    s.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
    s.async = true;
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return ready;
}

const ctx = () => cast.framework.CastContext.getInstance();

export const castActive = () => sdkOk && !!ctx().getCurrentSession();
export const castHasMedia = () => !!link?.player.isMediaLoaded;
export const castTime = () => link?.player.currentTime ?? 0;

export function castToggle() {
  link?.controller.playOrPause();
}

export function castSeek(t: number) {
  if (!link) return;
  link.player.currentTime = t;
  link.controller.seek();
}

/** Opens Chrome's device picker (which also has "Stop casting"); returns a note key to show, or null. */
export async function castRequest(): Promise<"connect" | null> {
  try {
    await ctx().requestSession();
    return null;
  } catch (code) {
    return code === chrome.cast.ErrorCode.CANCEL ? null : "connect";
  }
}

export async function castLoad(song: SongView, url: string, at = 0, coverUrl: string | null = null): Promise<boolean> {
  const session = ctx().getCurrentSession();
  if (!session) return false;
  const info = new chrome.cast.media.MediaInfo(url, "audio/mpeg");
  const meta = new chrome.cast.media.MusicTrackMediaMetadata();
  meta.title = song.title;
  meta.artist = song.artist ?? "Soundwave";
  meta.albumName = song.album ?? song.genres?.name ?? "Soundwave";
  meta.images = coverUrl ? [new chrome.cast.Image(coverUrl)] : [];
  info.metadata = meta;
  const req = new chrome.cast.media.LoadRequest(info);
  req.autoplay = true;
  req.currentTime = at;
  try {
    const err = await session.loadMedia(req);
    return !err;
  } catch {
    return false;
  }
}

export type CastEvents = {
  onConnect: () => void;
  onDisconnect: (lastTime: number) => void;
  onState: (s: { paused: boolean; time: number; duration: number; buffering: boolean }) => void;
  onEnded: () => void;
};

/** Subscribes to session and playback changes; call after loadCastSdk() resolved true. */
export function watchCast(h: { current: CastEvents }) {
  const player = new cast.framework.RemotePlayer();
  const controller = new cast.framework.RemotePlayerController(player);
  link = { player, controller };
  let last = 0;
  let ended = false;
  const S = cast.framework.SessionState;
  const P = chrome.cast.media.PlayerState;

  const onSession = (e: cast.framework.SessionStateEventData) => {
    if (e.sessionState === S.SESSION_STARTED || e.sessionState === S.SESSION_RESUMED) h.current.onConnect();
    else if (e.sessionState === S.SESSION_ENDED) h.current.onDisconnect(last);
  };
  const onChange = () => {
    if (player.isMediaLoaded) {
      last = player.currentTime;
      if (player.playerState === P.PLAYING) ended = false;
      h.current.onState({
        paused: player.isPaused,
        time: player.currentTime,
        duration: player.duration,
        buffering: player.playerState === P.BUFFERING,
      });
      return;
    }
    // Media unloaded: finished if it stopped at the very end.
    const idle = ctx().getCurrentSession()?.getMediaSession()?.idleReason;
    const finished = idle === chrome.cast.media.IdleReason.FINISHED || (player.duration > 0 && last >= player.duration - 2);
    if (finished && !ended && player.isConnected) {
      ended = true;
      last = 0;
      h.current.onEnded();
    }
  };

  ctx().addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSession);
  controller.addEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, onChange);
  if (ctx().getCurrentSession()) h.current.onConnect();
  return () => {
    ctx().removeEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSession);
    controller.removeEventListener(cast.framework.RemotePlayerEventType.ANY_CHANGE, onChange);
    link = null;
  };
}
