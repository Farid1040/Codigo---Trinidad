import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:limpiador_parlante/tone_generator.dart';

void main() {
  runApp(const SpeakerCareApp());
}

class SpeakerCareApp extends StatelessWidget {
  const SpeakerCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF087F73);
    return MaterialApp(
      title: 'Limpia Parlante',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: accent,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF4F7F7),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF4F7F7),
          foregroundColor: Color(0xFF163331),
          centerTitle: false,
        ),
      ),
      home: const CleanerScreen(),
    );
  }
}

enum _PlaybackMode { idle, cleaning, manual }

class CleanerScreen extends StatefulWidget {
  const CleanerScreen({super.key});

  @override
  State<CleanerScreen> createState() => _CleanerScreenState();
}

class _CleanerScreenState extends State<CleanerScreen>
    with WidgetsBindingObserver {
  static const _sweepDuration = Duration(seconds: 30);
  static const _cleanStartHz = 165.0;
  static const _cleanEndHz = 230.0;

  AudioPlayer? _player;
  StreamSubscription<void>? _completionSubscription;
  Timer? _timer;
  Duration _elapsed = Duration.zero;
  double _manualFrequency = 220;
  ToneWaveform _waveform = ToneWaveform.sine;
  _PlaybackMode _playbackMode = _PlaybackMode.idle;
  bool _isPreparing = false;
  bool _isPlaying = false;
  String _status = 'Listo para empezar';
  int _playRequestId = 0;

  bool get _isBusy => _isPreparing || _isPlaying;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _isBusy) {
      unawaited(_stopPlayback());
    }
  }

  AudioPlayer _getPlayer() {
    final existing = _player;
    if (existing != null) return existing;

    final player = AudioPlayer();
    _player = player;
    _completionSubscription = player.onPlayerComplete.listen((_) {
      if (!mounted || _playbackMode != _PlaybackMode.cleaning) return;
      _timer?.cancel();
      setState(() {
        _playbackMode = _PlaybackMode.idle;
        _isPreparing = false;
        _isPlaying = false;
        _elapsed = _sweepDuration;
        _status = 'Barrido terminado';
      });
    });
    return player;
  }

  Future<void> _startCleaning() {
    return _startTone(
      request: const ToneRequest(
        startFrequencyHz: _cleanStartHz,
        endFrequencyHz: _cleanEndHz,
        durationSeconds: 30,
        waveform: ToneWaveform.sine,
      ),
      mode: _PlaybackMode.cleaning,
      loop: false,
    );
  }

  Future<void> _startManualTone() {
    return _startTone(
      request: ToneRequest(
        startFrequencyHz: _manualFrequency,
        endFrequencyHz: _manualFrequency,
        durationSeconds: 2,
        waveform: _waveform,
      ),
      mode: _PlaybackMode.manual,
      loop: true,
    );
  }

  Future<void> _startTone({
    required ToneRequest request,
    required _PlaybackMode mode,
    required bool loop,
  }) async {
    if (_isPreparing) return;

    final requestId = ++_playRequestId;
    _timer?.cancel();
    setState(() {
      _isPreparing = true;
      _isPlaying = false;
      _playbackMode = mode;
      _elapsed = Duration.zero;
      _status = 'Preparando el sonido…';
    });

    try {
      final Uint8List wav = await compute(generateToneWav, request);
      if (!mounted || requestId != _playRequestId) return;

      final player = _getPlayer();
      await player.stop();
      if (!mounted || requestId != _playRequestId) return;

      await player.setReleaseMode(loop ? ReleaseMode.loop : ReleaseMode.stop);
      if (!mounted || requestId != _playRequestId) return;

      await player.play(BytesSource(wav, mimeType: 'audio/wav'), volume: 0.6);
      if (!mounted || requestId != _playRequestId) {
        await player.stop();
        return;
      }

      setState(() {
        _isPreparing = false;
        _isPlaying = true;
        _status = mode == _PlaybackMode.cleaning
            ? 'Barrido en curso'
            : 'Tono continuo · ${_manualFrequency.round()} Hz';
      });

      if (!loop) {
        _timer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (!mounted || _playbackMode != _PlaybackMode.cleaning) return;
          final nextElapsed = _elapsed + const Duration(seconds: 1);
          if (nextElapsed >= _sweepDuration) {
            unawaited(_stopPlayback(status: 'Barrido terminado'));
          } else {
            setState(() => _elapsed = nextElapsed);
          }
        });
      }
    } catch (error, stackTrace) {
      debugPrint('No se pudo reproducir el tono: $error\n$stackTrace');
      if (mounted && requestId == _playRequestId) {
        setState(() {
          _playbackMode = _PlaybackMode.idle;
          _isPreparing = false;
          _isPlaying = false;
          _status = 'No se pudo iniciar el audio';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No se pudo reproducir el tono. Revisa el volumen y vuelve a intentarlo.',
            ),
          ),
        );
      }
    } finally {
      if (mounted && requestId == _playRequestId && _isPreparing) {
        setState(() => _isPreparing = false);
      }
    }
  }

  Future<void> _stopPlayback({String status = 'Reproducción detenida'}) async {
    ++_playRequestId;
    _timer?.cancel();
    _timer = null;
    try {
      await _player?.stop();
      if (mounted) {
        setState(() {
          _playbackMode = _PlaybackMode.idle;
          _isPreparing = false;
          _isPlaying = false;
          _status = status;
        });
      }
    } catch (error, stackTrace) {
      debugPrint('No se pudo detener el audio: $error\n$stackTrace');
      if (mounted) {
        setState(() {
          _playbackMode = _PlaybackMode.idle;
          _isPreparing = false;
          _isPlaying = false;
          _status = 'No se pudo confirmar la detención';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No se pudo detener el audio. Cierra la aplicación si el sonido continúa.',
            ),
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    unawaited(_completionSubscription?.cancel());
    unawaited(_player?.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_elapsed.inSeconds / _sweepDuration.inSeconds)
        .clamp(0.0, 1.0)
        .toDouble();
    final liveFrequency =
        _cleanStartHz + (_cleanEndHz - _cleanStartHz) * progress;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 620),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
                    children: [
                      _buildIntro(),
                      const SizedBox(height: 22),
                      _buildCleaningCard(progress, liveFrequency),
                      const SizedBox(height: 24),
                      _buildSectionTitle(
                        'Control manual',
                        'Elige una frecuencia y una forma de onda.',
                      ),
                      const SizedBox(height: 12),
                      _buildManualCard(),
                      const SizedBox(height: 16),
                      _buildSafetyNote(),
                      const SizedBox(height: 18),
                      const Center(
                        child: Text(
                          'FUNCIONA SIN PERMISOS · SOLO REPRODUCE AUDIO',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFF71817F),
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFDCF2ED),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.graphic_eq_rounded,
              color: Color(0xFF087F73),
            ),
          ),
          const SizedBox(width: 11),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'LIMPIA PARLANTE',
                style: TextStyle(
                  color: Color(0xFF173735),
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Herramientas de audio',
                style: TextStyle(color: Color(0xFF71817F), fontSize: 11),
              ),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFE5F4EB),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              children: [
                Icon(Icons.shield_outlined, size: 14, color: Color(0xFF247A4C)),
                SizedBox(width: 5),
                Text(
                  'SIN PERMISOS',
                  style: TextStyle(
                    color: Color(0xFF247A4C),
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIntro() {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'CUIDADO DEL ALTAVOZ',
          style: TextStyle(
            color: Color(0xFF087F73),
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.4,
          ),
        ),
        SizedBox(height: 7),
        Text(
          'Un sonido más claro,\ncon un toque.',
          style: TextStyle(
            color: Color(0xFF173735),
            fontSize: 29,
            height: 1.14,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.8,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'Reproduce un barrido de baja frecuencia desde tu teléfono.',
          style: TextStyle(color: Color(0xFF657674), fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildCleaningCard(double progress, double liveFrequency) {
    final isCleaning = _playbackMode == _PlaybackMode.cleaning;
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF086F68), Color(0xFF124C57)],
        ),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0E615B).withValues(alpha: 0.18),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: -56,
            right: -37,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.08),
                  width: 24,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(21),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Barrido de limpieza',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.surround_sound_rounded,
                      color: Colors.white.withValues(alpha: 0.85),
                      size: 23,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Onda senoidal · ${_cleanStartHz.round()}–${_cleanEndHz.round()} Hz',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.72),
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 21),
                Row(
                  children: [
                    _buildMetric(
                      Icons.multiline_chart_rounded,
                      'RANGO',
                      '${_cleanStartHz.round()}–${_cleanEndHz.round()} Hz',
                    ),
                    const SizedBox(width: 22),
                    _buildMetric(
                      Icons.timer_outlined,
                      'DURACIÓN',
                      '${_sweepDuration.inSeconds} segundos',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                if (isCleaning && _isPlaying) ...[
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 6,
                            backgroundColor: Colors.white.withValues(
                              alpha: 0.18,
                            ),
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              Color(0xFFA8F0D8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${liveFrequency.round()} Hz',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 11),
                ],
                if (_isPreparing && isCleaning) ...[
                  const LinearProgressIndicator(
                    minHeight: 4,
                    color: Color(0xFFA8F0D8),
                    backgroundColor: Color(0x3344FFFF),
                  ),
                  const SizedBox(height: 11),
                ],
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _isBusy ? null : _startCleaning,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFE3F7EF),
                      foregroundColor: const Color(0xFF12574E),
                      disabledBackgroundColor: const Color(0xFFE3F7EF),
                      disabledForegroundColor: const Color(0xFF12574E),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                    icon: _isPreparing && isCleaning
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(
                            isCleaning && _isPlaying
                                ? Icons.graphic_eq_rounded
                                : Icons.play_arrow_rounded,
                          ),
                    label: Text(
                      isCleaning && _isPlaying
                          ? 'Barrido en reproducción'
                          : 'Iniciar limpieza',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                if (_isBusy) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton.icon(
                      onPressed: _stopPlayback,
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                      icon: const Icon(Icons.stop_rounded, size: 19),
                      label: const Text('Detener sonido'),
                    ),
                  ),
                ] else ...[
                  const SizedBox(height: 11),
                  Center(
                    child: Text(
                      _status,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.76),
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetric(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 17, color: const Color(0xFFA8F0D8)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.64),
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFF173735),
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          subtitle,
          style: const TextStyle(color: Color(0xFF71817F), fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildManualCard() {
    final isManual = _playbackMode == _PlaybackMode.manual;
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: Color(0xFFE4ECEA)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Expanded(
                  child: Text(
                    'Frecuencia',
                    style: TextStyle(
                      color: Color(0xFF294240),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Text(
                  '${_manualFrequency.round()}',
                  style: const TextStyle(
                    color: Color(0xFF087F73),
                    fontSize: 28,
                    height: 1,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(width: 5),
                const Padding(
                  padding: EdgeInsets.only(bottom: 2),
                  child: Text(
                    'Hz',
                    style: TextStyle(
                      color: Color(0xFF71817F),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            Slider(
              value: _manualFrequency,
              min: 50,
              max: 2000,
              divisions: 195,
              label: '${_manualFrequency.round()} Hz',
              activeColor: const Color(0xFF087F73),
              onChanged: _isPreparing
                  ? null
                  : (value) => setState(() => _manualFrequency = value),
              onChangeEnd: (_) {
                if (isManual && _isPlaying) unawaited(_startManualTone());
              },
            ),
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '50 Hz',
                  style: TextStyle(color: Color(0xFF71817F), fontSize: 10),
                ),
                Text(
                  '2 kHz',
                  style: TextStyle(color: Color(0xFF71817F), fontSize: 10),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'FORMA DE ONDA',
              style: TextStyle(
                color: Color(0xFF71817F),
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 9),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: ToneWaveform.values.map((waveform) {
                return ChoiceChip(
                  label: Text(waveform.label),
                  selected: _waveform == waveform,
                  onSelected: _isPreparing
                      ? null
                      : (_) {
                          setState(() => _waveform = waveform);
                          if (isManual && _isPlaying) {
                            unawaited(_startManualTone());
                          }
                        },
                  selectedColor: const Color(0xFFDDF2EC),
                  labelStyle: TextStyle(
                    color: _waveform == waveform
                        ? const Color(0xFF086F68)
                        : const Color(0xFF52625F),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                  side: BorderSide(
                    color: _waveform == waveform
                        ? const Color(0xFFB5DED3)
                        : const Color(0xFFE4ECEA),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _isBusy ? null : _startManualTone,
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: const Text('Probar tono'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF087F73),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
                if (isManual && _isBusy) ...[
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    onPressed: _stopPlayback,
                    tooltip: 'Detener tono',
                    icon: const Icon(Icons.stop_rounded),
                  ),
                ],
              ],
            ),
            if (isManual) ...[
              const SizedBox(height: 9),
              Text(
                _isPreparing ? 'Preparando tono…' : _status,
                style: const TextStyle(color: Color(0xFF71817F), fontSize: 11),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSafetyNote() {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6E8),
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: const Color(0xFFF4E4C8)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, color: Color(0xFF9A6B18), size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Usa un volumen cómodo y detén el tono si escuchas distorsión o notas molestia. El sonido no garantiza retirar agua o suciedad; si el teléfono se mojó, sigue las indicaciones del fabricante.',
              style: TextStyle(
                color: Color(0xFF70572D),
                fontSize: 11,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
