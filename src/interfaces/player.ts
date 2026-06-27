import { DBusError, interface as dbusInterface, type Variant } from '@jellybrick/dbus-next';

import {
  isLoopStatusValid,
  isPlaybackStatusValid,
  LOOP_STATUS_NONE,
  PLAYBACK_STATUS_STOPPED,
} from '@/constants';
import { MprisInterface } from '@/interfaces/mpris-interface';

import type { Player } from '@/player';

const { property, method, signal } = dbusInterface;

export class PlayerInterface extends MprisInterface {
  constructor(player: Player) {
    super('org.mpris.MediaPlayer2.Player', player);
  }

  private _CanControl = true;
  private _CanPause = true;
  private _CanPlay = true;
  private _CanSeek = true;
  private _CanGoNext = true;
  private _CanGoPrevious = true;
  private _Metadata: Record<string, Variant> = {};
  private _MaximumRate = 1;
  private _MinimumRate = 1;
  private _Rate = 1;
  private _Shuffle = false;
  private _Volume = 0;
  private _LoopStatus = LOOP_STATUS_NONE;
  private _PlaybackStatus = PLAYBACK_STATUS_STOPPED;

  @property({ signature: 'b', access: dbusInterface.ACCESS_READ })
  get CanControl(): boolean {
    return this._CanControl;
  }

  @property({ signature: 'b', access: dbusInterface.ACCESS_READ })
  get CanPause(): boolean {
    return this._CanPause;
  }

  @property({ signature: 'b', access: dbusInterface.ACCESS_READ })
  get CanPlay(): boolean {
    return this._CanPlay;
  }

  @property({ signature: 'b', access: dbusInterface.ACCESS_READ })
  get CanSeek(): boolean {
    return this._CanSeek;
  }

  @property({ signature: 'b', access: dbusInterface.ACCESS_READ })
  get CanGoNext(): boolean {
    return this._CanGoNext;
  }

  @property({ signature: 'b', access: dbusInterface.ACCESS_READ })
  get CanGoPrevious(): boolean {
    return this._CanGoPrevious;
  }

  @property({ signature: 'a{sv}', access: dbusInterface.ACCESS_READ })
  get Metadata(): Record<string, Variant> {
    return this._Metadata;
  }

  @property({ signature: 'd', access: dbusInterface.ACCESS_READ })
  get MaximumRate(): number {
    return this._MaximumRate;
  }

  @property({ signature: 'd', access: dbusInterface.ACCESS_READ })
  get MinimumRate(): number {
    return this._MinimumRate;
  }

  @property({ signature: 'd' })
  get Rate(): number {
    return this._Rate;
  }
  set Rate(value: number) {
    this._setPropertyInternal('Rate', value);
  }

  @property({ signature: 'b' })
  get Shuffle(): boolean {
    return this._Shuffle;
  }
  set Shuffle(value: boolean) {
    this._setPropertyInternal('Shuffle', value);
  }

  @property({ signature: 'd' })
  get Volume(): number {
    return this._Volume;
  }
  set Volume(value: number) {
    this._setPropertyInternal('Volume', value);
  }

  @property({ signature: 'x', access: dbusInterface.ACCESS_READ })
  get Position(): number {
    const playerPosition = this.player.getPosition();
    const position = Math.floor(playerPosition || 0);
    if (isNaN(position)) {
      const err = 'github.mpris_service.InvalidPositionError';
      const message = `The player has set an invalid position: ${playerPosition}`;
      throw new DBusError(err, message);
    }
    return position;
  }

  @property({ signature: 's' })
  get LoopStatus(): string {
    if (!isLoopStatusValid(this._LoopStatus)) {
      const err = 'github.mpris_service.InvalidLoopStatusError';
      const message = `The player has set an invalid loop status: ${this._LoopStatus}`;
      throw new DBusError(err, message);
    }

    return this._LoopStatus;
  }
  set LoopStatus(value: string) {
    if (!isLoopStatusValid(value)) {
      const err = 'github.mpris_service.InvalidLoopStatusError';
      const message = `Tried to set loop status to an invalid value: ${value}`;
      throw new DBusError(err, message);
    }
    this._setPropertyInternal('LoopStatus', value);
  }

  @property({ signature: 's', access: dbusInterface.ACCESS_READ })
  get PlaybackStatus(): string {
    if (!isPlaybackStatusValid(this._PlaybackStatus)) {
      const err = 'github.mpris_service.InvalidPlaybackStatusError';
      const message = `The player has set an invalid playback status: ${this._PlaybackStatus}`;
      throw new DBusError(err, message);
    }

    return this._PlaybackStatus;
  }

  @method({})
  Next(): void {
    this.player.emit('next');
  }

  @method({})
  Previous(): void {
    this.player.emit('previous');
  }

  @method({})
  Pause(): void {
    this.player.emit('pause');
  }

  @method({})
  PlayPause(): void {
    this.player.emit('playpause');
  }

  @method({})
  Stop(): void {
    this.player.emit('stop');
  }

  @method({})
  Play(): void {
    this.player.emit('play');
  }

  @method({ inSignature: 'x' })
  Seek(offset: bigint): void {
    // XXX overflow
    this.player.emit('seek', Number(offset));
  }

  @method({ inSignature: 'ox' })
  SetPosition(trackId: string, position: bigint): void {
    this.player.emit('position', {
      trackId,
      // XXX overflow
      position: Number(position),
    });
  }

  @method({ inSignature: 's' })
  OpenUri(uri: string): void {
    this.player.emit('open', { uri });
  }

  @signal({ signature: 'x' })
  Seeked(position: number): number {
    return position;
  }
}
