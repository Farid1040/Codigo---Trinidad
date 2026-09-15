program OperacionesAritmeticas;

var
  Numero1, Numero2: Real;

procedure LeerNumeros(var A, B: Real);
begin
  Write('Ingrese el primer numero: ');
  ReadLn(A);
  Write('Ingrese el segundo numero: ');
  ReadLn(B);
end;

procedure MostrarSuma(A, B: Real);
begin
  WriteLn('Suma: ', A + B:0:2);
end;

procedure MostrarResta(A, B: Real);
begin
  WriteLn('Resta: ', A - B:0:2);
end;

procedure MostrarMultiplicacion(A, B: Real);
begin
  WriteLn('Multiplicacion: ', A * B:0:2);
end;

procedure MostrarDivision(A, B: Real);
begin
  if B = 0 then
    WriteLn('Division: no es posible dividir entre cero.')
  else
    WriteLn('Division: ', A / B:0:2);
end;

procedure MostrarResultados(A, B: Real);
begin
  WriteLn;
  WriteLn('--- Resultados ---');
  MostrarSuma(A, B);
  MostrarResta(A, B);
  MostrarMultiplicacion(A, B);
  MostrarDivision(A, B);
end;

begin
  WriteLn('Calculadora de operaciones basicas');
  LeerNumeros(Numero1, Numero2);
  MostrarResultados(Numero1, Numero2);
end.
