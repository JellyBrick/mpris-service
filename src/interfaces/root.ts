import { interface as dbusInterface } from '@jellybrick/dbus-next';

import { MprisInterface } from '@/interfaces/mpris-interface';

import type { Player } from '@/player';
import type { RootInterfaceOptions } from '@/types';

const { property, method } = dbusInterface;
const ACCESS_READ = dbusInterface.ACCESS_READ as 'read';

export class RootInterface extends MprisInterface {
  constructor(player: Player, opts: RootInterfaceOptions = {}) {
    super('org.mpris.MediaPlayer2', player);

    if (opts.identity !== undefined) {
      this._Identity = opts.identity;
    }
    if (opts.supportedUriSchemes !== undefined) {
      this._SupportedUriSchemes = opts.supportedUriSchemes;
    }
    if (opts.supportedMimeTypes !== undefined) {
      this._SupportedMimeTypes = opts.supportedMimeTypes;
    }
    if (opts.desktopEntry !== undefined) {
      this._DesktopEntry = opts.desktopEntry;
    }
  }

  private _CanQuit = true;
  private _Fullscreen = false;
  private _CanSetFullscreen = false;
  private _CanRaise = true;
  private _HasTrackList = false;
  private _Identity = '';
  // TODO optional properties
  private _DesktopEntry = '';
  private _SupportedUriSchemes: string[] = [];
  private _SupportedMimeTypes: string[] = [];

  @property({ signature: 'b', access: ACCESS_READ })
  get CanQuit(): boolean {
    return this._CanQuit;
  }

  @property({ signature: 'b' })
  get Fullscreen(): boolean {
    return this._Fullscreen;
  }
  set Fullscreen(value: boolean) {
    this._setPropertyInternal('Fullscreen', value);
  }

  @property({ signature: 'b', access: ACCESS_READ })
  get CanSetFullscreen(): boolean {
    return this._CanSetFullscreen;
  }

  @property({ signature: 'b', access: ACCESS_READ })
  get CanRaise(): boolean {
    return this._CanRaise;
  }

  @property({ signature: 'b', access: ACCESS_READ })
  get HasTrackList(): boolean {
    return this._HasTrackList;
  }

  @property({ signature: 's', access: ACCESS_READ })
  get Identity(): string {
    return this._Identity;
  }

  @property({ signature: 's', access: ACCESS_READ })
  get DesktopEntry(): string {
    return this._DesktopEntry;
  }

  @property({ signature: 'as', access: ACCESS_READ })
  get SupportedUriSchemes(): string[] {
    return this._SupportedUriSchemes;
  }

  @property({ signature: 'as', access: ACCESS_READ })
  get SupportedMimeTypes(): string[] {
    return this._SupportedMimeTypes;
  }

  @method({})
  Raise(): void {
    this.player.emit('raise');
  }

  @method({})
  Quit(): void {
    this.player.emit('quit');
  }
}
