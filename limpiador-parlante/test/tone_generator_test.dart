import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:limpiador_parlante/tone_generator.dart';

void main() {
  group('generateToneWav', () {
    test('writes a valid mono PCM WAV header and payload', () {
      final wav = generateToneWav(
        const ToneRequest(
          startFrequencyHz: 220,
          endFrequencyHz: 220,
          durationSeconds: 1,
          waveform: ToneWaveform.sine,
          sampleRate: 8000,
          amplitude: 0.2,
        ),
      );
      final header = ByteData.sublistView(wav);

      expect(String.fromCharCodes(wav.sublist(0, 4)), 'RIFF');
      expect(String.fromCharCodes(wav.sublist(8, 12)), 'WAVE');
      expect(String.fromCharCodes(wav.sublist(12, 16)), 'fmt ');
      expect(String.fromCharCodes(wav.sublist(36, 40)), 'data');
      expect(header.getUint16(22, Endian.little), 1);
      expect(header.getUint32(24, Endian.little), 8000);
      expect(header.getUint16(34, Endian.little), 16);
      expect(header.getUint32(40, Endian.little), 16000);
      expect(wav.length, 44 + 16000);
      expect(header.getInt16(44, Endian.little), 0);
      expect(header.getInt16(wav.length - 2, Endian.little), 0);
    });

    test('rejects frequencies above the Nyquist limit', () {
      expect(
        () => generateToneWav(
          const ToneRequest(
            startFrequencyHz: 5000,
            endFrequencyHz: 5000,
            durationSeconds: 1,
            waveform: ToneWaveform.sine,
            sampleRate: 8000,
          ),
        ),
        throwsArgumentError,
      );
    });
  });
}
