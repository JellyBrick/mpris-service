export type PlayBackStatus = 'Playing' | 'Paused' | 'Stopped';

export type LoopStatus = 'None' | 'Track' | 'Playlist';

export type Interfaces = 'player' | 'trackList' | 'playlists';

export interface Playlist {
  Id: string;
  Name: string;
  Icon: string;
}

export interface Track {
  'mpris:trackid'?: string;
  'mpris:length'?: number;
  'mpris:artUrl'?: string;
  'xesam:album'?: string;
  'xesam:albumArtist'?: string[];
  'xesam:artist'?: string[];
  'xesam:asText'?: string;
  'xesam:audioBPM'?: number;
  'xesam:autoRating'?: number;
  'xesam:comment'?: string[];
  'xesam:composer'?: string[];
  'xesam:contentCreated'?: string;
  'xesam:discNumber'?: number;
  'xesam:firstUsed'?: string;
  'xesam:genre'?: string[];
  'xesam:lastUsed'?: string;
  'xesam:lyricist'?: string[];
  'xesam:title'?: string;
  'xesam:trackNumber'?: number;
  'xesam:url'?: string;
  'xesam:useCount'?: number;
  'xesam:userRating'?: number;
}

export interface Position {
  trackId: string;
  position: number;
}

export interface RootInterfaceOptions {
  identity?: string;
  supportedUriSchemes?: string[];
  supportedMimeTypes?: string[];
  desktopEntry?: string;
}

export interface AdditionalPlayerOptions {
  name: string;
  supportedInterfaces?: Interfaces[];
}

export type PlayerOptions = RootInterfaceOptions & AdditionalPlayerOptions;

export interface Events {
  raise: void;
  quit: void;
  fullscreen: boolean;
  next: void;
  previous: void;
  pause: void;
  playpause: void;
  stop: void;
  play: void;
  seek: number;
  position: Position;
  open: { uri: string };
  volume: number;
  shuffle: boolean;
  rate: number;
  loopStatus: LoopStatus;
  addTrack: { uri: string; afterTrack: string; setAsCurrent: boolean };
  removeTrack: string;
  goTo: string;
  activatePlaylist: string;
  error: Error;
}

type ToArgs<T> = [T] extends [void] ? [] : [data: T];

export type EventsMap = { [K in keyof Events]: ToArgs<Events[K]> };
