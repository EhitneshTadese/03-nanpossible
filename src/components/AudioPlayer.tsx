"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type AudioPlayerProps = {
  audioUrl: string | null;
  duration: number | null;
  pageTitle: string;
  mode?: "page" | "inline";
};

const speedOptions = [0.75, 1, 1.25, 1.5];

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDurationForAria(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0 seconds";
  }

  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  if (minutes <= 0) {
    return `${remainder} seconds`;
  }

  if (remainder === 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"} ${remainder} seconds`;
}

export default function AudioPlayer({
  audioUrl,
  duration,
  pageTitle,
  mode = "page",
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(mode === "inline");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState(duration ?? 0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const sliderValueText = useMemo(
    () =>
      `${formatDurationForAria(currentTime)} of ${formatDurationForAria(
        resolvedDuration,
      )}`,
    [currentTime, resolvedDuration],
  );

  useEffect(() => {
    setResolvedDuration(duration ?? 0);
  }, [duration]);

  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    if (mode === "page") {
      setIsExpanded(false);
    }
  }, [audioUrl, mode]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  function seekTo(nextTime: number) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const clamped = Math.min(Math.max(nextTime, 0), resolvedDuration || audio.duration || 0);
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }

  async function handlePlayPause() {
    const audio = audioRef.current;

    if (!audio || !audioUrl) {
      return;
    }

    if (audio.paused) {
      try {
        if (mode === "page") {
          setIsExpanded(true);
        }
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }

  function handleClose() {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
    }

    setIsPlaying(false);
    setIsExpanded(false);
  }

  if (!audioUrl) {
    if (mode === "inline") {
      return null;
    }

    return (
      <div className="rounded-[1.35rem] border border-line/70 bg-white/55 px-4 py-3 text-sm leading-6 text-foreground/68">
        Audio version coming soon.
      </div>
    );
  }

  const audioElement = (
    <audio
      onEnded={() => setIsPlaying(false)}
      onLoadedMetadata={(event) =>
        setResolvedDuration(
          Number.isFinite(event.currentTarget.duration)
            ? event.currentTarget.duration
            : duration ?? 0,
        )
      }
      onPause={() => setIsPlaying(false)}
      onPlay={() => setIsPlaying(true)}
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      preload="metadata"
      ref={audioRef}
      src={audioUrl}
    />
  );

  const sharedControls = (
    <>
      <button
        aria-label={
          isPlaying
            ? "Pause audio"
            : mode === "page"
              ? "Play audio version of this page"
              : `Play ${pageTitle}`
        }
        className="button-link primary shrink-0"
        onClick={() => void handlePlayPause()}
        type="button"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>

      <div className="min-w-0 flex-1">
        <input
          aria-label="Audio progress"
          aria-valuemax={Math.max(1, resolvedDuration)}
          aria-valuemin={0}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={sliderValueText}
          className="h-2 w-full cursor-pointer accent-teal"
          max={Math.max(1, resolvedDuration)}
          onChange={(event) => seekTo(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              seekTo(currentTime + 10);
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              seekTo(currentTime - 10);
            }

            if (event.key === " ") {
              event.preventDefault();
              void handlePlayPause();
            }
          }}
          role="slider"
          step={1}
          type="range"
          value={Math.min(currentTime, Math.max(1, resolvedDuration))}
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(resolvedDuration)}</span>
        </div>
      </div>

      <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
        <span className="sr-only">Playback speed</span>
        <span>Speed</span>
        <select
          aria-label="Playback speed"
          className="rounded-full border border-line bg-white/72 px-3 py-2 text-sm font-semibold text-teal-deep"
          onChange={(event) => setPlaybackRate(Number(event.target.value))}
          value={playbackRate}
        >
          {speedOptions.map((speed) => (
            <option key={speed} value={speed}>
              {speed}x
            </option>
          ))}
        </select>
      </label>
    </>
  );

  if (mode === "inline") {
    return (
      <section
        aria-label={`Audio player for ${pageTitle}`}
        className="site-panel rounded-[1.5rem] border border-line/70 bg-white/65 p-4"
        role="region"
      >
        {audioElement}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/46">
              Audio introduction
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/72">{pageTitle}</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            {sharedControls}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={`Audio player for ${pageTitle}`}
      className="grid gap-3"
      role="region"
    >
      {audioElement}
      <button
        aria-label="Listen to this page"
        className="button-link secondary w-fit"
        onClick={() => void handlePlayPause()}
        type="button"
      >
        {isPlaying ? "Pause page audio" : "Listen to this page"}
      </button>

      {isExpanded ? (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-1/2 md:w-[min(58rem,calc(100vw-2rem))] md:-translate-x-1/2">
          <div className="site-panel rounded-[1.75rem] border border-line bg-[rgba(255,250,242,0.98)] px-4 py-4 shadow-[0_28px_72px_rgba(22,63,61,0.18)] md:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/46">
                  Listen to this page
                </p>
                <p className="mt-2 truncate font-semibold text-teal-deep">
                  {pageTitle}
                </p>
              </div>
              <button
                aria-label="Close audio player"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/75 text-lg font-semibold text-teal-deep"
                onClick={handleClose}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
              {sharedControls}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
