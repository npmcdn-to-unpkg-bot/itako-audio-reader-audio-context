// dependencies
import 'babel-polyfill';
import assert from 'power-assert';
import { rejects } from 'assert-exception';
import Itako from 'itako';

// target
import ItakoAudioReaderAudioContext from '../src';

// fixture
let simulateAfterRead = () => {};
if (typeof window.AudioContext === 'undefined') {
  require('web-audio-test-api');

  simulateAfterRead = (time, audioContext) => {
    setTimeout(() => {
      audioContext.$processTo(time);
    }, 100);
  };
}
const audioTransformer = {
  transform(tokens) {
    return tokens.map(token => token.setType('audio'));
  },
};

// specs
describe('itako-audio-reader-audio-context', () => {
  it('should ignore the non-audio token', async () => {
    const reader = new ItakoAudioReaderAudioContext();
    const itako = new Itako([reader]);
    const reason = await rejects(itako.read('foo'));

    assert(reason.message === 'unexpected token "text:foo"');
  });

  it('should read the audio token as an audio file', async () => {
    const reader = new ItakoAudioReaderAudioContext();
    const itako = new Itako([reader], [audioTransformer]);

    simulateAfterRead('00:10.000', reader.audioContext);

    const text = '/base/test/fixtures/beep.wav';
    const tokens = await itako.read(text);
    assert(tokens[0].meta.reader.name === 'audio-context');
    assert(tokens[0].value === text);
  });

  it('if specify volume/pitch option, it should be change the volume and pitch', async () => {
    const reader = new ItakoAudioReaderAudioContext();
    const itako = new Itako([reader], [audioTransformer]);

    simulateAfterRead('00:10.000', reader.audioContext);

    const text = '/base/test/fixtures/beep.wav';
    const tokens = await itako.read(text, { volume: 0.2, pitch: 0.5 });
    assert(tokens[0].meta.reader.name === 'audio-context');
    assert(tokens[0].meta.nodes.gainNode.gain instanceof AudioParam);
    assert(tokens[0].meta.nodes.sourceNode.playbackRate.value === 0.5);
    assert(tokens[0].value === text);
  });

  // TODO
  const todoIt = window.WebAudioTestAPI ? xit : it;
  todoIt('should preload the audio token', async () => {
    const reader = new ItakoAudioReaderAudioContext();
    const itako = new Itako([reader], [audioTransformer]).setOptions({
      read: {
        preload: true,
      },
    });

    // request the audio files in before read
    // const [a] = await itako.read([
    const [a, b, c] = await itako.read([
      Itako.createToken('audio', 'http://voicetext.berabou.me/a?format=ogg'),
      Itako.createToken('audio', 'http://voicetext.berabou.me/b?format=ogg'),
      Itako.createToken('audio', 'http://voicetext.berabou.me/c?format=ogg'),
    ]);
    assert(a.meta.reader.name === 'audio-context');
    assert(b.meta.preloadStart - a.meta.preloadStart < 100);
    assert(c.meta.preloadStart - b.meta.preloadStart < 100);
  });
});
