import type { LoopStatus, PlayBackStatus } from '@/types';

export const PLAYBACK_STATUS_PLAYING: PlayBackStatus = 'Playing';
export const PLAYBACK_STATUS_PAUSED: PlayBackStatus = 'Paused';
export const PLAYBACK_STATUS_STOPPED: PlayBackStatus = 'Stopped';

export const LOOP_STATUS_NONE: LoopStatus = 'None';
export const LOOP_STATUS_TRACK: LoopStatus = 'Track';
export const LOOP_STATUS_PLAYLIST: LoopStatus = 'Playlist';

const playbackStatuses: PlayBackStatus[] = [
  PLAYBACK_STATUS_PLAYING,
  PLAYBACK_STATUS_PAUSED,
  PLAYBACK_STATUS_STOPPED,
];

const loopStatuses: LoopStatus[] = [LOOP_STATUS_NONE, LOOP_STATUS_PLAYLIST, LOOP_STATUS_TRACK];

export const isLoopStatusValid = (value: unknown): value is LoopStatus => {
  return typeof value === 'string' && loopStatuses.includes(value as LoopStatus);
};

export const isPlaybackStatusValid = (value: unknown): value is PlayBackStatus => {
  return typeof value === 'string' && playbackStatuses.includes(value as PlayBackStatus);
};
