const Player = require('../dist');

const player = new Player({
	name: 'nodejs',
	identity: 'Node.js media player',
	supportedUriSchemes: ['file'],
	supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
	supportedInterfaces: ['player']
});

player.getPosition = function() {
  // return the position of your player
  return 0;
}

// Events
const events = ['raise', 'quit', 'next', 'previous', 'pause', 'playpause', 'stop', 'play', 'seek', 'position', 'open', 'volume', 'loopStatus', 'shuffle'];
events.forEach(function (eventName) {
	player.on(eventName, function () {
		console.log('Event:', eventName, arguments);
	});
});

player.on('quit', function () {
	process.exit();
});

setTimeout(function () {
	// @see http://www.freedesktop.org/wiki/Specifications/mpris-spec/metadata/
	player.metadata = {
		'mpris:trackid': player.objectPath('track/0'),
		'mpris:length': 60 * 1000 * 1000, // In microseconds
		'mpris:artUrl': 'http://www.adele.tv/images/facebook/adele.jpg',
		'xesam:title': 'Lolol',
		'xesam:album': '21',
		'xesam:artist': ['Adele']
	};

	player.playbackStatus = Player.PLAYBACK_STATUS_PLAYING;

	console.log('Now playing: Lolol - Adele - 21');
}, 1000);

setTimeout(() => {
  player.seeked(0);
}, 2000);
