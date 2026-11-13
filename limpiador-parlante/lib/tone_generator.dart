import 'dart:math' as math;
import 'dart:typed_data';

enum ToneWaveform {
  sine('Senoidal'),
  square('Cuadrada'),
  triangle('Triangular'),
  sawtooth('Diente de sierra');

  const ToneWaveform(this.label);

  final String label;
}

class ToneRequest {
  const ToneRequest({
    required this.startFrequencyHz,
    required this.endFrequencyHz,
    required this.durationSeconds,
    required this.waveform,
    this.sampleRate = 44100,
    this.amplitude = 0.18,
  });

  final double startFrequencyHz;
  final double endFrequencyHz;
  final int durationSeconds;
  final ToneWaveform waveform;
  final int sampleRate;
  final double amplitude;
}

Uint8List generateToneWav(ToneRequest request) {
  if (!request.startFrequencyHz.isFinite ||
      !request.endFrequencyHz.isFinite ||
      request.startFrequencyHz <= 0 ||
      request.endFrequencyHz <= 0 ||
      request.startFrequencyHz >= request.sampleRate / 2 ||
      request.endFrequencyHz >= request.sampleRate / 2) {
    throw ArgumentError('La frecuencia debe estar entre 0 y Nyquist.');
  }
  if (request.sampleRate < 8000 || request.sampleRate > 192000) {
    throw ArgumentError.value(request.sampleRate, 'sampleRate');
  }
  if (request.durationSeconds < 1 || request.durationSeconds > 60) {
    throw ArgumentError.value(request.durationSeconds, 'durationSeconds');
  }
  if (!request.amplitude.isFinite ||
      request.amplitude <= 0 ||
      request.amplitude > 0.8) {
    throw ArgumentError.value(request.amplitude, 'amplitude');
  }

  const channels = 1;
  const bitsPerSample = 16;
  final frameCount = request.sampleRate * request.durationSeconds;
  final dataLength = frameCount * channels * (bitsPerSample ~/ 8);
  final bytes = Uint8List(44 + dataLength);
  final header = ByteData.sublistView(bytes);

  void writeTag(int offset, String tag) {
    for (var i = 0; i < tag.length; i++) {
      bytes[offset + i] = tag.codeUnitAt(i);
    }
  }

  writeTag(0, 'RIFF');
  header.setUint32(4, 36 + dataLength, Endian.little);
  writeTag(8, 'WAVE');
  writeTag(12, 'fmt ');
  header.setUint32(16, 16, Endian.little);
  header.setUint16(20, 1, Endian.little);
  header.setUint16(22, channels, Endian.little);
  header.setUint32(24, request.sampleRate, Endian.little);
  header.setUint32(
    28,
    request.sampleRate * channels * (bitsPerSample ~/ 8),
    Endian.little,
  );
  header.setUint16(32, channels * (bitsPerSample ~/ 8), Endian.little);
  header.setUint16(34, bitsPerSample, Endian.little);
  writeTag(36, 'data');
  header.setUint32(40, dataLength, Endian.little);

  const twoPi = 2 * math.pi;
  final fadeFrames = request.sampleRate ~/ 100;
  var phase = 0.0;

  for (var frame = 0; frame < frameCount; frame++) {
    final progress = frame / frameCount;
    final frequency =
        request.startFrequencyHz +
        (request.endFrequencyHz - request.startFrequencyHz) * progress;
    final phaseFraction = phase / twoPi;
    final cyclePosition = phaseFraction - phaseFraction.floorToDouble();

    final sample = switch (request.waveform) {
      ToneWaveform.sine => math.sin(phase),
      ToneWaveform.square => cyclePosition < 0.5 ? 1.0 : -1.0,
      ToneWaveform.triangle => 1 - 4 * (cyclePosition - 0.5).abs(),
      ToneWaveform.sawtooth => 2 * cyclePosition - 1,
    };

    final fadeIn = math.min(1.0, frame / fadeFrames);
    final fadeOut = math.min(1.0, (frameCount - 1 - frame) / fadeFrames);
    final envelope = math.min(fadeIn, fadeOut);
    final value = (sample * request.amplitude * envelope * 32767).round();
    header.setInt16(44 + frame * 2, value, Endian.little);

    phase += twoPi * frequency / request.sampleRate;
    if (phase >= twoPi) phase -= twoPi;
  }

  return bytes;
}
