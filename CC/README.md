# Cloud COFFEE POS

POS web para cafetería con frontend estático + Google Sheets como base de datos + Google Apps Script como API.

## Arquitectura recomendada

**GitHub Pages → Google Apps Script Web App → Google Sheet**

El frontend no guarda precios ni ventas como fuente de verdad. El backend vuelve a leer `Items`, valida productos/precios y registra la venta. El cierre se calcula desde el último cierre registrado.

### Hojas esperadas

**Items**

`ID | Nombre | Categoria | Descripcion | Precio | Imagen | Activo`

**Ventas**

`ID_Venta | DateTime | Items_Detalle | Total | Metodo_Pago | Dinero_Entregado | Vuelto | Estado`

**Cierres**

`ID_Cierre | DateTime | Total_Turno | Total_Efectivo | Total_Transferencia | Cantidad_Pedidos`

`Items_Detalle` se guarda como JSON para conservar nombre, cantidad, precio y subtotal de cada línea de venta.

## Configuración del Sheet / Apps Script

1. Abre el Google Sheet que usarás como base de datos.
2. Abre **Extensiones → Apps Script**.
3. Copia `apps-script/Code.gs` al proyecto. Copia también `apps-script/appsscript.json` si necesitas dejar fija la zona horaria.
4. En **Configuración del proyecto → Propiedades del script**, crea:
   - `SPREADSHEET_ID` = el ID del Google Sheet.
5. Ejecuta `setup()` una vez. Esto crea/verifica `Items`, `Ventas` y `Cierres`. El Spreadsheet ID ya viene configurado en `Code.gs`.
6. Despliega como **Aplicación web**, ejecutando como tu cuenta. Para un MVP interno, selecciona el acceso que corresponda a las personas que usarán la caja.
7. Copia la URL terminada en `/exec`.
8. En `config.js`, pega esa URL en `API_URL`.

> La app usa JSONP para lecturas y un POST mediante formulario oculto para escrituras. Esto evita depender de una configuración CORS específica del servidor de Apps Script cuando el frontend se publique en GitHub Pages.

## GitHub Pages

Sube los archivos de este proyecto a un repositorio y activa **Settings → Pages → Deploy from branch** sobre la rama y carpeta elegidas.

### Imágenes

El proyecto espera inicialmente:

- Logo: `https://raw.githubusercontent.com/lvkas-pino/files/main/CC/Logotipo_B_Clean.png`
- Público: `https://raw.githubusercontent.com/lvkas-pino/files/main/CC/RISA3.jpg`

Puedes reemplazar esos archivos con el logo y la imagen de público que ya tienes. Los productos pueden apuntar a rutas como `assets/cafe.jpg` en la columna `Imagen`.

## Flujo de operación

### Venta

Seleccionar producto → ajustar cantidades → elegir Efectivo/Transferencia → ingresar dinero entregado si corresponde → confirmar.

El backend recalcula el total usando los precios actuales de `Items` y calcula el vuelto para efectivo.

### Catálogo

Permite crear, editar, activar y desactivar productos. No existe control de stock/cantidad.

### Cierre

El sistema toma las ventas `PAGADA` posteriores al último `Cierres.DateTime`. Al registrar el cierre, guarda total turno, efectivo, transferencia y cantidad de pedidos.

## Consideraciones

Este diseño es adecuado para una cafetería de bajo/medio volumen, con un solo catálogo y una operación sencilla. Para múltiples cajas simultáneas, perfiles de usuario, auditoría fuerte o integración tributaria/facturación electrónica, conviene evolucionar a un backend dedicado.
