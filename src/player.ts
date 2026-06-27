import { EventEmitter } from 'node:events';

import { NameFlag, RequestNameReply, sessionBus, validators } from '@jellybrick/dbus-next';

import * as constants from '@/constants';
import {
  PlayerInterface,
  PlaylistsInterface,
  RootInterface,
  TracklistInterface,
  type MprisInterface,
} from '@/interfaces';
import * as types from '@/interfaces/types';

import type {
  EventsMap,
  Interfaces,
  LoopStatus,
  PlayBackStatus,
  Playlist,
  PlayerOptions,
  Track,
} from '@/types';
import type { MessageBus } from '@jellybrick/dbus-next';

const MPRIS_PATH = '/org/mpris/MediaPlayer2';

const lcfirst = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.substring(1);
};

interface PlayerInterfaces {
  root?: RootInterface;
  player?: PlayerInterface;
  tracklist?: TracklistInterface;
  playlists?: PlaylistsInterface;
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface Player {
  identity: string;
  fullscreen: boolean;
  supportedUriSchemes: string[];
  supportedMimeTypes: string[];
  canQuit: boolean;
  canRaise: boolean;
  canSetFullscreen: boolean;
  hasTrackList: boolean;
  desktopEntry: string;
  playbackStatus: PlayBackStatus;
  loopStatus: LoopStatus;
  rate: number;
  shuffle: boolean;
  metadata: Track;
  volume: number;
  canControl: boolean;
  canPause: boolean;
  canPlay: boolean;
  canSeek: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  minimumRate: number;
  maximumRate: number;
  canEditTracks: boolean;
  tracks: Track[];
  playlistCount: number;
  activePlaylist: string;
  playlists: Playlist[];
}

export class Player extends EventEmitter<EventsMap> {
  name: string;
  supportedInterfaces: Interfaces[];
  serviceName!: string;
  private _bus!: MessageBus;
  interfaces: PlayerInterfaces = {};
  private _tracks: Track[] = [];

  constructor(options: PlayerOptions) {
    super();

    this.name = options.name;
    this.supportedInterfaces = options.supportedInterfaces ?? ['player'];
    this._tracks = [];
    this.init(options).catch((err: unknown) => {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    });
  }

  private async init(opts: PlayerOptions): Promise<void> {
    this.serviceName = `org.mpris.MediaPlayer2.${this.name}`;
    validators.assertBusNameValid(this.serviceName);

    this._bus = sessionBus();

    this._bus.on('error', (err: unknown) => {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    });

    this.interfaces = {};

    this.#addRootInterface(opts);

    if (this.supportedInterfaces.indexOf('player') >= 0) {
      this.#addPlayerInterface();
    }
    if (this.supportedInterfaces.indexOf('trackList') >= 0) {
      this.#addTracklistInterface();
    }
    if (this.supportedInterfaces.indexOf('playlists') >= 0) {
      this.#addPlaylistsInterface();
    }

    for (const iface of Object.values(this.interfaces)) {
      if (iface !== undefined) {
        this._bus.export(MPRIS_PATH, iface);
      }
    }

    try {
      const reply = await this._bus.requestName(this.serviceName, NameFlag.DO_NOT_QUEUE);
      if (reply === RequestNameReply.EXISTS) {
        this.serviceName = `${this.serviceName}.instance${process.pid}`;
        await this._bus.requestName(this.serviceName);
      }
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  #addRootInterface(opts: PlayerOptions): void {
    this.interfaces.root = new RootInterface(this, opts);
    this.#addEventedPropertiesList(this.interfaces.root, [
      'Identity',
      'Fullscreen',
      'SupportedUriSchemes',
      'SupportedMimeTypes',
      'CanQuit',
      'CanRaise',
      'CanSetFullscreen',
      'HasTrackList',
      'DesktopEntry',
    ]);
  }

  #addPlayerInterface(): void {
    this.interfaces.player = new PlayerInterface(this);
    const eventedProps = [
      'PlaybackStatus',
      'LoopStatus',
      'Rate',
      'Shuffle',
      'Metadata',
      'Volume',
      'CanControl',
      'CanPause',
      'CanPlay',
      'CanSeek',
      'CanGoNext',
      'CanGoPrevious',
      'MinimumRate',
      'MaximumRate',
    ];
    this.#addEventedPropertiesList(this.interfaces.player, eventedProps);
  }

  #addTracklistInterface(): void {
    this.interfaces.tracklist = new TracklistInterface(this);
    this.#addEventedPropertiesList(this.interfaces.tracklist, ['CanEditTracks']);

    Object.defineProperty(this, 'tracks', {
      get: () => {
        return this._tracks;
      },
      set: (value: Track[]) => {
        this._tracks = value;
        this.interfaces.tracklist?.TrackListReplaced(value);
      },
      enumerable: true,
      configurable: true,
    });
  }

  #addPlaylistsInterface(): void {
    this.interfaces.playlists = new PlaylistsInterface(this);
    this.#addEventedPropertiesList(this.interfaces.playlists, ['PlaylistCount', 'ActivePlaylist']);
  }

  /**
   * Get a valid object path with the `subpath` as the basename which is suitable
   * for use as an id.
   *
   * @name Player#objectPath
   * @function
   * @param {String} subpath - The basename of this path
   * @returns {String} - A valid object path that can be used as an id.
   */
  objectPath(subpath?: string): string {
    let path = `/org/node/mediaplayer/${this.name}`;
    if (subpath) {
      path += `/${subpath}`;
    }
    return path;
  }

  #addEventedProperty(iface: MprisInterface, name: string): void {
    const localName = lcfirst(name);

    Object.defineProperty(this, localName, {
      get: () => {
        const value = Reflect.get(iface, name);
        if (name === 'ActivePlaylist') {
          return types.playlistToPlain(value as [string, string, string]);
        } else if (name === 'Metadata') {
          return types.metadataToPlain(value as Record<string, unknown>);
        }
        return value;
      },
      set: (value: unknown) => {
        iface.setProperty(name, value);
      },
      enumerable: true,
      configurable: true,
    });
  }

  #addEventedPropertiesList(iface: MprisInterface, props: string[]): void {
    for (const prop of props) {
      this.#addEventedProperty(iface, prop);
    }
  }

  /**
   * Gets the position of this player. This method is intended to be overridden
   * by the user to return the position of the player in microseconds.
   *
   * @name Player#getPosition
   * @function
   * @returns {Number} - The current position of the player in microseconds. (Integer)
   */
  getPosition(): number {
    return 0;
  }

  /**
   * Emits the `Seeked` DBus signal to listening clients with the given position.
   *
   * @name Player#seeked
   * @function
   * @param {Number} position - The position in microseconds. (Integer)
   */
  seeked(position: number): void {
    const seekTo = Math.floor(position || 0);
    if (isNaN(seekTo)) {
      throw new Error(`seeked expected a number (got ${position})`);
    }
    this.interfaces.player?.Seeked(seekTo);
  }

  getTrackIndex(trackId: string): number {
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];

      if (track?.['mpris:trackid'] === trackId) {
        return i;
      }
    }

    return -1;
  }

  getTrack(trackId: string): Track | undefined {
    return this.tracks[this.getTrackIndex(trackId)];
  }

  addTrack(track: Track): void {
    this.tracks.push(track);
    this.interfaces.tracklist?.setTracks(this.tracks);

    let afterTrack = '/org/mpris/MediaPlayer2/TrackList/NoTrack';
    if (this.tracks.length > 2) {
      const previous = this.tracks[this.tracks.length - 2];
      if (previous?.['mpris:trackid'] !== undefined) {
        afterTrack = previous['mpris:trackid'];
      }
    }
    this.interfaces.tracklist?.TrackAdded(afterTrack as unknown as Track);
  }

  removeTrack(trackId: string): void {
    const i = this.getTrackIndex(trackId);
    this.tracks.splice(i, 1);
    this.interfaces.tracklist?.setTracks(this.tracks);

    this.interfaces.tracklist?.TrackRemoved(trackId);
  }

  /**
   * Get the index of a playlist entry in the `playlists` list property of the
   * player from the given id.
   *
   * @name Player#getPlaylistIndex
   * @function
   * @param {String} playlistId - The id for the playlist entry.
   */
  getPlaylistIndex(playlistId: string): number {
    for (let i = 0; i < this.playlists.length; i++) {
      const playlist = this.playlists[i];

      if (playlist?.Id === playlistId) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Set the list of playlists advertised to listeners on the bus. Each playlist
   * must have string members `Id`, `Name`, and `Icon`.
   *
   * @name Player#setPlaylists
   * @function
   * @param {Array} playlists - A list of playlists.
   */
  setPlaylists(playlists: Playlist[]): void {
    this.playlists = playlists;
    this.playlistCount = playlists.length;

    this.playlists.forEach((playlist) => {
      if (playlist) {
        this.interfaces.playlists?.PlaylistChanged(playlist);
      }
    });
  }

  /**
   * Set the playlist identified by `playlistId` to be the currently active
   * playlist.
   *
   * @name Player#setActivePlaylist
   * @function
   * @param {String} playlistId - The id of the playlist to activate.
   */
  setActivePlaylist(playlistId: string): void {
    this.interfaces.playlists?.setActivePlaylistId(playlistId);
  }

  static PLAYBACK_STATUS_PLAYING: PlayBackStatus = constants.PLAYBACK_STATUS_PLAYING;
  static PLAYBACK_STATUS_PAUSED: PlayBackStatus = constants.PLAYBACK_STATUS_PAUSED;
  static PLAYBACK_STATUS_STOPPED: PlayBackStatus = constants.PLAYBACK_STATUS_STOPPED;
  static LOOP_STATUS_NONE: LoopStatus = constants.LOOP_STATUS_NONE;
  static LOOP_STATUS_TRACK: LoopStatus = constants.LOOP_STATUS_TRACK;
  static LOOP_STATUS_PLAYLIST: LoopStatus = constants.LOOP_STATUS_PLAYLIST;
}
