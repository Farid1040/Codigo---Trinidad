import 'package:flutter_test/flutter_test.dart';
import 'package:limpiador_parlante/main.dart';

void main() {
  testWidgets('muestra la limpieza y el generador de tonos', (tester) async {
    await tester.pumpWidget(const SpeakerCareApp());

    expect(find.text('LIMPIA PARLANTE'), findsOneWidget);
    expect(find.text('Iniciar limpieza'), findsOneWidget);
  });
}
