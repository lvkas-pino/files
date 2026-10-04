# Cloud COFFEE POS — instalación

## 1. Google Sheets
Usa el Sheet ya creado por el proyecto. Debe contener estas hojas:

- Items: ID | Nombre | Categoria | Descripcion | Precio | Imagen | Activo
- Ventas: ID_Venta | DateTime | Items_Detalle | Total | Metodo_Pago | Dinero_Entregado | Vuelto | Estado
- Cierres: ID_Cierre | DateTime | Total_Turno | Total_Efectivo | Total_Transferencia | Cantidad_Pedidos

## 2. Google Apps Script
1. Abre el Sheet → Extensiones → Apps Script.
2. Borra el contenido actual de `Code.gs`.
3. Pega el archivo `apps-script/Code.gs`.
4. Guarda.
5. Ejecuta la función `setup()` una vez. Google pedirá autorización: acéptala con la cuenta dueña del Sheet.

## 3. Implementación
En Apps Script:

1. Implementar → Administrar implementaciones.
2. Edita la implementación de tipo Aplicación web o crea una nueva.
3. Ejecutar como: Yo.
4. Acceso: la opción que permita a los cajeros acceder al POS; para el MVP puede ser cualquier usuario con el enlace.
5. Implementa.

La URL `/exec` ya está configurada en `config.js`:

`https://script.google.com/macros/s/AKfycbzttSEGCL8rRdgEGQUH5dHm8CDXtFIeRLZ3Mo7z2-Vi3-ShMN2DSOYyBySdmvDRourR/exec`

## 4. GitHub Pages
Sube el contenido de esta carpeta al repositorio/página donde quieras publicar el POS.

El logo y la fotografía de público se cargan directamente desde GitHub:
- `Logotipo_B_Clean.png`
- `RISA3.jpg`

## 5. Flujo
Venta → se calcula total → efectivo calcula vuelto → Apps Script valida productos y precios → Ventas guarda la transacción.

Cierre → toma las ventas posteriores al último cierre → separa efectivo y transferencia → guarda el cierre.

## 6. Importante
Este diseño es un MVP interno. Un Web App de Apps Script accesible públicamente puede ser llamado fuera del POS si alguien conoce la URL; para una segunda versión conviene agregar autenticación de cajeros y permisos.
