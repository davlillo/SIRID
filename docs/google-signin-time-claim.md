# Diagnóstico: rechazo intermitente del inicio de sesión de Google

> **Estado:** causa identificada; tolerancia de **30 s** aplicada en `GoogleIdentityVerifier`.

## Síntoma

Después de cerrar sesión, algunos intentos de iniciar sesión con Google devolvían:

```text
The Google credential could not be verified.
```

Los logs mostraron intentos exitosos y fallidos desde el mismo navegador/entorno.

## Evidencia

- El Client ID configurado en frontend y backend coincidía con el cliente OAuth de desarrollo.
- El reloj de Windows, WSL y el contenedor backend estaba sincronizado con una diferencia de pocos segundos.
- El diagnóstico temporal del backend clasificó los rechazos como `not_yet_valid`.
- Google Auth Python expone `clock_skew_in_seconds` en `verify_oauth2_token`; su valor por defecto es `0` y se usa para validar los claims `iat` y `exp`.
- Se retiró la instrumentación temporal después de obtener la categoría. No se registraron credenciales, tokens ni emails.

## Causa raíz

El verificador rechaza algunos ID tokens porque su claim **`iat` (issued at)** queda unos segundos por delante del instante de validación del backend. Como la tolerancia configurada es cero, el token se clasifica como “not yet valid”. Esto es consistente con el patrón intermitente y con que los Client IDs coincidan.

## Corrección considerada

Google Auth permite proporcionar un margen mediante `clock_skew_in_seconds`. El backend usa **30 segundos** (`TOKEN_CLOCK_SKEW_SECONDS` en `google_identity.py`), cubierto por `test_google_identity.py`.

## Referencia

- [Google Auth Python: `verify_oauth2_token`](https://google-auth.readthedocs.io/en/latest/reference/google.oauth2.id_token.html#google.oauth2.id_token.verify_oauth2_token)
