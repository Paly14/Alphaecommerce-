# hola-mundo

Calculadora de Importación — app web basada en la planilla «PLANILLA IMPORTACION».

## Uso

Abrí `index.html` en el navegador (doble clic o publicándolo con GitHub Pages).

Cargá tus productos y la app calcula automáticamente:

- **Impuestos Argie** = Valor FOB × tasa de impuestos (por defecto 80%)
- **Inversión Total** = Freight + Valor FOB + Impuestos Argie
- **Break-Even ARG** = Inversión Total ÷ Unidades (costo real por unidad)
- **Mín. de Venta** = Break-Even × (1 + margen) (por defecto ×1.5)
- **% Ganancia Sug.** = Precio Venta AMZ ÷ Break-Even × 100

La tasa de impuestos y el margen son configurables. Los datos se guardan en el
navegador (localStorage) y se pueden exportar a CSV.
