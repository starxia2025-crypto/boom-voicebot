# Formato esperado de `muebles.csv`

## Columnas minimas soportadas en la primera version

- `referencia`
- `nombre_producto`
- `precio_eur`
- `stock`

## Columnas opcionales ya preparadas en el modelo

Si el CSV evoluciona, el importador y la base ya contemplan estas columnas opcionales:

- `categoria`
- `descripcion`
- `material`
- `color`
- `medidas`
- `sucursal`
- `ubicacion`
- `actualizado_en`

## Reglas

- `referencia` se mapea a `sku` y debe venir informado.
- `nombre_producto` se mapea a `nombre`.
- `precio_eur` acepta decimales con `.` o `,`.
- `stock` se intenta convertir a entero; si viene vacio, se guarda como `null`.
- Las columnas no mapeadas se conservan en `source_row` para auditoria.

