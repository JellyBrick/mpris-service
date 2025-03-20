declare module "mpris-service";

// The player creation options
// @see https://specifications.freedesktop.org/mpris-spec/latest/Media_Player.html
declare interface PlayerOptions {
  name: string;
  identity: string;
  supportedInterfaces: string[];
}

interface Events {

  /**
   * Brings the media player's user interface to the front using any appropriate mechanism available.
   */
  raise: void;

  /**
   * Causes the media player to stop running.
   */
  quit: void;

  /**
   * Skips to the next track in the tracklist.
   */
  next: void;

  /**
   * Skips to the previous track in the tracklist.
   */
  previous: void;

  /**
   * Pauses playback.
   */
  pause: void;

  /**
   * Pauses playback. If playback is already paused, resumes playback. If playback is stopped, starts playback.
   */
  playpause: void;

  /**
   * Stops playback.
   */
  stop: void;

  /**
   * Starts or resumes playback.
   */
  play: void;

  /**
   * Seeks forward in the current track by the specified number of microseconds. With event data `offset`.
   */
  seek: number;

  /**
   * Sets the current track position in microseconds. With event data `{ trackId, position }`.
   */
  position: { trackId: string, position: number };

  /**
   * Opens the Uri given as an argument. With event data `{ uri }`.
   */
  open: string;

  /**
   * Sets the volume of the player. With event data `volume` (between 0.0 and 1.0).
   */
  volume: number;

  /**
   * Sets whether shuffle is enabled on the player. With event data `shuffleStatus` (boolean).
   */
  shuffle: boolean;

  /**
   * Sets the playback rate of the player. A value of 1.0 is the normal rate. With event data `rate`.
   */
  rate: number;

  /**
   * Sets the loop status of the player to either 'None', 'Track', or 'Playlist'. With event data `loopStatus`.
   */
  loopStatus: 'None' | 'Track' | 'Playlist';

  /**
   * Starts playing the given playlist. With event data `playlistId`.
   */
  activatePlaylist: { playlistId: string };

}

type Playlist = {
  Id: string;
  Name: string;
  Icon: string;
};

type Track = {
    'mpris:trackid': string;
    'mpris:length': number;
    'mpris:artUrl': string;
    'xesam:title': string;
    'xesam:album': string;
    'xesam:artist': string[];
}

declare class Player {
  constructor(options: PlayerOptions);

  /**
   * A friendly name to identify the media player to users.
   */
  identity: string;

  /**
   * Whether the media player is occupying the fullscreen.
   */
  fullscreen: boolean;

  /**
   * The URI schemes supported by the media player.
   */
  supportedUriSchemes: string[];

  /**
   * The mime-types supported by the media player.
   */
  supportedMimeTypes: string[];

  /**
   * Whether the player can quit.
   */
  canQuit: boolean;

  /**
   * Whether the player can raise.
   */
  canRaise: boolean;

  /**
   * Whether the player can be set to fullscreen.
   */
  canSetFullscreen: boolean;

  /**
   * Indicates whether the /org/mpris/MediaPlayer2 object implements the org.mpris.MediaPlayer2.TrackList interface.
   */
  hasTrackList: boolean;

  /**
   * The basename of an installed .desktop file which complies with the Desktop entry specification, with the ".desktop" extension stripped.
   */
  desktopEntry: string;

  /**
   * The current playback status.
   */
  playbackStatus: 'Playing' | 'Paused' | 'Stopped';

  /**
   * The status of the loop
   */
  loopStatus: 'None' | 'Track' | 'Playlist';

  /**
   * Whether the player is shuffling.
   */
  shuffle: boolean;

  /**
   * The current volume.
   * The volume level. This is a double value between 0.0 and 1.0 (both inclusive), with 0.0 being the minimum and 1.0 being the maximum volume.
   * (Double)
   */
  volume: number;

  /**
   * Whether the media player may be controlled over this interface.
   */
  canControl: boolean;

  /**
   * Whether playback can be paused using Pause or PlayPause.
   */
  canPause: boolean;

  /**
   * Whether playback can be started using Play or PlayPause.
   */
  canPlay: boolean;

  /**
   * Whether the client can control the playback position using Seek and SetPosition.
   */
  canSeek: boolean;

  /**
   * Whether the client can call the Next method on this interface and expect the current track to change.
   */
  canGoNext: boolean;

  /**
   * Whether the client can call the Previous method on this interface and expect the current track to change.
   */
  canGoPrevious: boolean;

  /**
   * The current playback rate. (Double)
   */
  rate: number;

  /**
   * The minimum value which the Rate property can take. (Double)
   */
  minimumRate: number;

  /**
   * The maximum value which the Rate property can take. (Double)
   */
  maximumRate: number;

  /**
   * The current playlists set by {@link Player#setPlaylists}. (Not a DBus property).
   */
  playlists: Playlist[];

  /**
   * The id of the currently-active playlist.
   */
  activePlaylist: string;

  /**
   * The can edit track list status.
   */
  tracks: Track[];

  /**
   * The metadata of the current element. 
   * If there is a current track, this must have a "mpris:trackid" entry (of D-Bus type "o") at the very least, which contains a D-Bus path that uniquely identifies this track.
   * @see http://www.freedesktop.org/wiki/Specifications/mpris-spec/metadata/
   */
  metadata: {
    "mpris:trackid"?: string;
    "mpris:length"?: number;
    "mpris:artUrl"?: string;
    "xesam:title"?: string;
    "xesam:album"?: string;
    "xesam:artist"?: string[];
    "xesam:genre"?: string[];
  };


  /**
   * Seek to a position
   * Clients can request to set position using the `Seek` and `SetPosition`
   * methods of the `org.mpris.MediaPlayer2.Player` interface. These requests are
   * implemented as events on the Player similar to the other requests.
   * 
   * 
   */
  seek(position: number): void;

  /**
   * Seek to a position in the player
   * 
   * @param position - positionInMicroseconds
   */
  seeked(position: number): void;

  /**
   * Get the current position
   * Clients can get the position of your player by getting the `Position`
   * property of the `org.mpris.MediaPlayer2.Player` interface. Since position
   * updates continuously, {@link Player#getPosition} is implemented as a getter
   * you can override on your Player. This getter will be called when a client
   * requests the position and should return the position of your player for the
   * client in microseconds.
   */
  getPosition(): number;

  /**
   * Get a valid object path with the `subpath` as the basename which is suitable
   * for use as an id.
   *
   * @name Player#objectPath
   * @function
   * @param {String} subpath - The basename of this path
   * @returns {String} - A valid object path that can be used as an id.
   */
  objectPath(subpath: string): string;

  /**
   * Set the active playlist
   * @param playlist The playlist id to set as active
   */
  setActivePlaylist(playlist: string): void;

  /**
   * Set Playlists
   * @param playlists The playlists to set
   */
  setPlaylists(playlists: Playlist[]): void;

  /**
   * Emit an event
   * @param event The event to listen to
   * @param listener The listener to call when the event is emitted
   */
  on<T extends keyof Events>(event: T, listener: (data: Events[T]) => void): void;
}

declare class TrackList {
  /**
   * The track list
   */
  tracks: number;
}
